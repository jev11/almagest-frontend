import { useRef, useState } from "react";
import type {
  ChangeEvent,
  ClipboardEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { X } from "lucide-react";

/**
 * Normalize a raw tag string: trim surrounding whitespace, then lowercase.
 *
 * Exported so tests — and any caller that wants to pre-normalize tags before
 * feeding them to `<TagInput>` — can share the same rule.
 */
export function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Merge one or more candidate tags into an existing list, dropping empties
 * and deduping against the existing values (already-normalized) and against
 * each other. Returns the new list — does NOT mutate the input.
 *
 * Exported for testing; used by both the Enter/comma commit path and the
 * paste handler.
 */
export function appendTags(existing: string[], candidates: string[]): string[] {
  const next = [...existing];
  const seen = new Set(existing);
  for (const raw of candidates) {
    const n = normalizeTag(raw);
    if (!n) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    next.push(n);
  }
  return next;
}

export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  id?: string;
}

/**
 * Chip-style tag input. Type a word + Enter (or comma) to commit it as a
 * chip; hover a chip to reveal an X that removes it. Backspace on an empty
 * draft pops the last chip. Paste with commas splits into multiple chips.
 *
 * Normalization: trim + lowercase + dedupe (see {@link normalizeTag}).
 *
 * Adaptive: on phone the X is always visible at low opacity (touch has no
 * hover); on tablet+ it starts hidden and appears on group-hover or keyboard
 * focus.
 */
export function TagInput({
  value,
  onChange,
  placeholder = "Add a tag and press Enter",
  id,
}: TagInputProps) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function commit(): void {
    const n = normalizeTag(draft);
    if (!n) {
      if (draft !== "") setDraft("");
      return;
    }
    if (value.includes(n)) {
      setDraft("");
      return;
    }
    onChange([...value, n]);
    setDraft("");
  }

  function removeAt(idx: number): void {
    const next = value.slice(0, idx).concat(value.slice(idx + 1));
    onChange(next);
  }

  function handleKeyDown(e: ReactKeyboardEvent<HTMLInputElement>): void {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
      return;
    }
    if (e.key === "Backspace" && draft === "" && value.length > 0) {
      e.preventDefault();
      onChange(value.slice(0, -1));
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>): void {
    const text = e.clipboardData.getData("text");
    if (!text.includes(",")) return; // let the default paste land in the draft
    e.preventDefault();
    const pieces = text.split(",");
    onChange(appendTags(value, pieces));
    setDraft("");
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>): void {
    setDraft(e.target.value);
  }

  return (
    <div className="flex flex-col gap-gap-sm">
      <div
        className="flex flex-wrap gap-1.5 min-h-[44px] items-center px-2 py-1.5
                   bg-input border border-border rounded-lg
                   focus-within:border-primary transition-colors cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag, idx) => (
          <span
            key={tag}
            className="group inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full
                       bg-secondary border border-border text-xs text-foreground"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={(ev) => {
                ev.stopPropagation();
                removeAt(idx);
              }}
              className="opacity-60 tablet:opacity-0 group-hover:opacity-100 focus-visible:opacity-100
                         transition-opacity rounded-full hover:bg-destructive/20 p-0.5
                         outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={draft}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          onPaste={handlePaste}
          placeholder={value.length ? "" : placeholder}
          className="flex-1 min-w-[8ch] bg-transparent text-sm outline-none
                     text-foreground placeholder:text-dim-foreground"
        />
      </div>
    </div>
  );
}
