"use client";

import { unstable_rethrow } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import type { z } from "zod";
import type { ActionResult } from "@/lib/actions/auth";

type Result = ActionResult | { ok: true; message: string };

type Errors = Record<string, string>;

function firstErrors(error: z.ZodError): Errors {
  const out: Errors = {};
  for (const issue of error.issues) out[String(issue.path[0])] ??= issue.message;
  return out;
}

/**
 * Controlled auth form state. Validates with the same zod schema the server uses, then calls the
 * server action. On success the action redirects, so only failures come back here.
 */
export function useAuthForm<V extends Record<string, string | boolean>>(initial: V) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [pending, startTransition] = useTransition();

  function set<K extends keyof V>(key: K, value: V[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => (e[key as string] ? { ...e, [key as string]: "" } : e));
    setFormError("");
  }

  /** Returns true when `schema` accepts the current values; otherwise shows inline errors. */
  function validate(schema: z.ZodType) {
    const parsed = schema.safeParse(values);
    if (parsed.success) return true;
    setErrors(firstErrors(parsed.error));
    return false;
  }

  function submit(schema: z.ZodType, action: (input: V) => Promise<Result | void>) {
    if (!validate(schema)) return;
    run(() => action(values));
  }

  /** Calls a server action without client validation (caller has already validated). */
  function run(action: () => Promise<Result | void>) {
    if (pending) return;
    setErrors({});
    setFormError("");
    startTransition(async () => {
      try {
        const result = await action();
        if (!result) return;
        if (result.ok) {
          toast.success(result.message);
          return;
        }
        setErrors(result.fieldErrors ?? {});
        if (!result.fieldErrors) setFormError(result.message);
        toast.error(result.message);
      } catch (error) {
        // A successful action ends in redirect(); let Next handle that navigation.
        unstable_rethrow(error);
        const message = "Something went wrong. Check your connection and try again.";
        setFormError(message);
        toast.error(message);
      }
    });
  }

  return { values, set, errors, setErrors, formError, pending, validate, submit, run };
}
