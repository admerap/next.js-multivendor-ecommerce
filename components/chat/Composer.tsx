"use client";

import { ImagePlus, SendHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { CHAT_IMAGE_MAX_BYTES, CHAT_IMAGE_TYPES, CHAT_TEXT_MAX } from "@/lib/chat";
import { cn } from "@/lib/utils";

/**
 * Message composer (userchat design): photo button, auto-growing text field, Send. Enter sends, Shift+Enter
 * makes a new line. A photo can also be pasted or dropped in; it's previewed before sending. Type and size are
 * checked here for quick feedback and again on the server (the real gate).
 */
export function Composer({ onSend, disabled, placeholder }: { onSend: (m: { text: string; file: File | null }) => void; disabled?: boolean; placeholder: string }) {
  const [text, setText] = useState("");
  // The chosen photo and its local preview URL, made together (and revoked together).
  const [chosen, setChosen] = useState<{ file: File; url: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const file = chosen?.file ?? null;
  const preview = chosen?.url ?? null;
  const setFile = (f: File | null) =>
    setChosen((cur) => {
      if (cur) URL.revokeObjectURL(cur.url);
      return f ? { file: f, url: URL.createObjectURL(f) } : null;
    });
  const latest = useRef(chosen);
  useEffect(() => {
    latest.current = chosen;
  }, [chosen]);
  useEffect(() => () => void (latest.current && URL.revokeObjectURL(latest.current.url)), []);

  // Grow with the text, up to ~6 lines.
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  const pick = (f: File | null | undefined) => {
    if (!f) return;
    if (!(CHAT_IMAGE_TYPES as readonly string[]).includes(f.type)) return void toast.error("Photos must be JPG, PNG or WebP");
    if (f.size > CHAT_IMAGE_MAX_BYTES) return void toast.error(`Photos must be ${CHAT_IMAGE_MAX_BYTES / (1024 * 1024)} MB or smaller`);
    setFile(f);
    area.current?.focus();
  };

  const canSend = !disabled && (text.trim().length > 0 || !!file) && text.length <= CHAT_TEXT_MAX;
  const send = () => {
    if (!canSend) return;
    onSend({ text: text.trim(), file });
    setText("");
    setFile(null);
    area.current?.focus();
  };

  return (
    <div
      className={cn("border-t border-line bg-card px-3 py-3 transition-colors duration-(--dur-fast) sm:px-4", dragging && "bg-iris-50")}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        pick(e.dataTransfer.files[0]);
      }}
    >
      {preview && (
        <div className="mb-2.5 flex items-center gap-3 rounded-md bg-sunken p-2 pr-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, not a remote image */}
          <img src={preview} alt="Photo to send" className="size-14 rounded-md object-cover" />
          <span className="min-w-0 flex-1 truncate text-caption text-fg-muted">{file?.name}</span>
          <button type="button" onClick={() => setFile(null)} aria-label="Remove photo" className="grid size-9 place-items-center rounded-full text-fg-muted hover:bg-card hover:text-error-600">
            <X aria-hidden className="size-4" />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => picker.current?.click()}
          disabled={disabled}
          aria-label="Add a photo"
          title="Add a photo (JPG, PNG or WebP, up to 5 MB)"
          className="grid size-11 shrink-0 place-items-center rounded-md text-fg-muted transition-colors duration-(--dur-fast) hover:bg-iris-50 hover:text-primary disabled:opacity-50"
        >
          <ImagePlus aria-hidden className="size-5" strokeWidth={1.9} />
        </button>
        <input
          ref={picker}
          type="file"
          accept={CHAT_IMAGE_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <label className="flex min-h-11 min-w-0 flex-1 items-center rounded-lg border border-line bg-sunken px-3.5 transition-[border-color,box-shadow] duration-(--dur-fast) focus-within:border-primary focus-within:bg-card focus-within:shadow-[0_0_0_3px_var(--iris-100)]">
          <span className="sr-only">Message</span>
          <textarea
            ref={area}
            rows={1}
            value={text}
            disabled={disabled}
            maxLength={CHAT_TEXT_MAX + 200}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            onPaste={(e) => {
              const f = [...e.clipboardData.files].find((x) => x.type.startsWith("image/"));
              if (f) {
                e.preventDefault();
                pick(f);
              }
            }}
            placeholder={placeholder}
            className="max-h-40 min-w-0 flex-1 resize-none bg-transparent py-2.5 text-sm leading-relaxed text-fg-strong outline-none placeholder:text-fg-subtle"
          />
        </label>
        <button
          type="button"
          onClick={send}
          disabled={!canSend}
          aria-label="Send message"
          className="grid size-11 shrink-0 place-items-center rounded-md bg-primary text-on-primary shadow-primary transition-[transform,opacity,background-color] duration-(--dur-fast) hover:-translate-y-px hover:bg-primary-hover disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
        >
          <SendHorizontal aria-hidden className="size-5" strokeWidth={2} />
        </button>
      </div>
      {text.length > CHAT_TEXT_MAX - 200 && (
        <p className={cn("mt-1.5 text-right text-[0.7rem] tabular-nums", text.length > CHAT_TEXT_MAX ? "font-semibold text-error-600" : "text-fg-subtle")}>
          {text.length.toLocaleString("en-US")} / {CHAT_TEXT_MAX.toLocaleString("en-US")}
        </p>
      )}
    </div>
  );
}
