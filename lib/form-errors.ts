/** Zod issues → { field: first message } for inline form errors (form-level issues go under "form"). */
export function fieldErrorsOf(issues: readonly { path: readonly PropertyKey[]; message: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) out[String(issue.path[0] ?? "form")] ??= issue.message;
  return out;
}
