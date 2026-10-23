"use client";

import TextAlign from "@tiptap/extension-text-align";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  Code,
  Heading,
  Italic,
  Link2,
  List,
  ListOrdered,
  Strikethrough,
  Underline,
  Unlink,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { richTextClasses } from "@/components/products/richTextClasses";

const ALIGNS = ["left", "center", "right"] as const;
const ALIGN_ICON: Record<(typeof ALIGNS)[number], LucideIcon> = { left: AlignLeft, center: AlignCenter, right: AlignRight };
const SAFE_URL = /^(https?:\/\/[^\s]+|mailto:[^\s@]+@[^\s@]+)$/i;

function ToolButton({ label, icon: Icon, active, onClick, disabled }: { label: string; icon: LucideIcon; active?: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      // Keep the selection in the editor while clicking the toolbar.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-sm transition-colors duration-(--dur-fast) disabled:opacity-40 max-lg:size-11",
        active ? "bg-iris-50 text-primary" : "text-fg-muted hover:bg-card hover:text-fg-strong",
      )}
    >
      <Icon aria-hidden className="size-4" strokeWidth={2.2} />
    </button>
  );
}

function Toolbar({ editor, disabled }: { editor: Editor; disabled?: boolean }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      heading: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      code: e.isActive("code"),
      link: e.isActive("link"),
      href: (e.getAttributes("link").href as string | undefined) ?? "",
      align: (ALIGNS.find((a) => e.isActive({ textAlign: a })) ?? "left") as (typeof ALIGNS)[number],
    }),
  });
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const chain = () => editor.chain().focus();
  const nextAlign = ALIGNS[(ALIGNS.indexOf(s.align) + 1) % ALIGNS.length];

  const applyLink = () => {
    const value = url.trim();
    if (!value) {
      chain().extendMarkRange("link").unsetLink().run();
      setLinkOpen(false);
      return;
    }
    const href = /^[a-z]+:/i.test(value) ? value : `https://${value}`;
    if (!SAFE_URL.test(href)) return setUrlError("Use a web address (https://…) or mailto:");
    // Link the selection, then put the caret after it so the next keystroke doesn't replace it.
    const end = editor.state.selection.to;
    // unsetMark on an empty selection only drops the stored mark: new text isn't linked.
    chain().extendMarkRange("link").setLink({ href }).setTextSelection(end).unsetMark("link").run();
    setLinkOpen(false);
  };

  return (
    <div className="border-b border-line bg-sunken">
      <div role="toolbar" aria-label="Description formatting" className="flex flex-wrap items-center gap-0.5 p-2 max-sm:flex-nowrap max-sm:overflow-x-auto">
        <ToolButton label="Bold" icon={Bold} active={s.bold} disabled={disabled} onClick={() => chain().toggleBold().run()} />
        <ToolButton label="Italic" icon={Italic} active={s.italic} disabled={disabled} onClick={() => chain().toggleItalic().run()} />
        <ToolButton label="Underline" icon={Underline} active={s.underline} disabled={disabled} onClick={() => chain().toggleUnderline().run()} />
        <ToolButton label="Strikethrough" icon={Strikethrough} active={s.strike} disabled={disabled} onClick={() => chain().toggleStrike().run()} />
        <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-line-default" />
        <ToolButton label="Heading" icon={Heading} active={s.heading} disabled={disabled} onClick={() => chain().toggleHeading({ level: 3 }).run()} />
        <ToolButton label="Bullet list" icon={List} active={s.bullet} disabled={disabled} onClick={() => chain().toggleBulletList().run()} />
        <ToolButton label="Numbered list" icon={ListOrdered} active={s.ordered} disabled={disabled} onClick={() => chain().toggleOrderedList().run()} />
        <ToolButton label={`Align ${nextAlign}`} icon={ALIGN_ICON[s.align]} active={s.align !== "left"} disabled={disabled} onClick={() => chain().setTextAlign(nextAlign).run()} />
        <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-line-default" />
        <ToolButton
          label="Link"
          icon={Link2}
          active={s.link || linkOpen}
          disabled={disabled}
          onClick={() => {
            setUrl(s.href);
            setUrlError("");
            setLinkOpen((o) => !o);
          }}
        />
        <ToolButton label="Code" icon={Code} active={s.code} disabled={disabled} onClick={() => chain().toggleCode().run()} />
      </div>
      {linkOpen && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-2 pb-2 pt-2">
          <input
            autoFocus
            type="url"
            value={url}
            onChange={(e) => (setUrl(e.target.value), setUrlError(""))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setLinkOpen(false);
                editor.commands.focus();
              }
            }}
            placeholder="https://example.com"
            aria-label="Link address"
            aria-invalid={urlError ? true : undefined}
            className="h-9 min-w-0 flex-1 rounded-sm border border-line bg-card px-2.5 text-sm text-fg-strong outline-none focus-visible:border-primary aria-invalid:border-error-500 max-lg:h-11"
          />
          <button type="button" onClick={applyLink} className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-primary px-3 text-caption font-semibold text-on-primary hover:bg-primary-hover max-lg:h-11">
            <Check aria-hidden className="size-3.5" strokeWidth={2.4} />
            Apply
          </button>
          {s.link && (
            <button
              type="button"
              onClick={() => (chain().extendMarkRange("link").unsetLink().run(), setLinkOpen(false))}
              className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-line bg-card px-3 text-caption font-semibold text-fg-strong hover:text-error-600 max-lg:h-11"
            >
              <Unlink aria-hidden className="size-3.5" strokeWidth={2.2} />
              Remove link
            </button>
          )}
          {urlError && (
            <span role="alert" className="basis-full text-caption font-semibold text-error-600">
              {urlError}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Description editor from vendoraddproduct: toolbar (bold, italic, underline, strike, heading,
 * lists, align, link, code) over a rich-text area. Emits HTML ("" when empty); the server keeps
 * only this subset (lib/rich-text.server.ts).
 */
export function RichTextEditor({
  id,
  label,
  value,
  onChange,
  placeholder,
  invalid,
  describedBy,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (html: string) => void;
  placeholder: string;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
}) {
  const editor = useEditor({
    immediatelyRender: false, // rendered on the client only (avoids SSR hydration mismatch)
    extensions: [
      StarterKit.configure({
        heading: { levels: [3] },
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto"], HTMLAttributes: { target: "_blank", rel: "noopener noreferrer nofollow" } },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right"] }),
    ],
    content: value,
    editable: !disabled,
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": label,
        class: cn("min-h-48 px-3.5 py-3 outline-none", richTextClasses),
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML()),
  });
  const empty = useEditorState({ editor, selector: ({ editor: e }) => e?.isEmpty ?? true });

  // External resets (e.g. the form's Reset button) replace the content.
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? "" : editor.getHTML();
    if (value !== current) editor.commands.setContent(value || "", { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  // Error state + description on the editable element itself.
  useEffect(() => {
    const el = editor?.view.dom;
    if (!el) return;
    if (invalid) el.setAttribute("aria-invalid", "true");
    else el.removeAttribute("aria-invalid");
    if (describedBy) el.setAttribute("aria-describedby", describedBy);
    else el.removeAttribute("aria-describedby");
  }, [editor, invalid, describedBy]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border bg-card transition-[border-color,box-shadow] duration-(--dur-fast) focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--iris-100)]",
        invalid ? "border-[1.5px] border-error-500" : "border-line",
      )}
    >
      {editor ? <Toolbar editor={editor} disabled={disabled} /> : <div aria-hidden className="h-13 border-b border-line bg-sunken" />}
      <div className="relative">
        {empty && (
          <p aria-hidden className="pointer-events-none absolute top-3 left-3.5 text-sm text-fg-subtle">
            {placeholder}
          </p>
        )}
        {editor ? <EditorContent editor={editor} /> : <div aria-hidden className="min-h-48" />}
      </div>
    </div>
  );
}
