import { useState, type JSX } from "react";
import { Tag } from "lucide-react";
import { toast } from "sonner";
import { chartCache, useAstroClient } from "@astro-app/astro-client";
import type { UnifiedChart } from "@/lib/unified-chart";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BulkTagMode = "add" | "remove" | "replace";

interface BulkTagDialogProps {
  charts: UnifiedChart[];
  open: boolean;
  onClose: () => void;
  onApplied: () => void;
}

export function BulkTagDialog({
  charts,
  open,
  onClose,
  onApplied,
}: BulkTagDialogProps): JSX.Element {
  const client = useAstroClient();
  const [mode, setMode] = useState<BulkTagMode>("add");
  const [tagsInput, setTagsInput] = useState("");
  const [applying, setApplying] = useState(false);

  async function handleApply() {
    const inputTags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (mode !== "replace" && inputTags.length === 0) {
      toast.error("Enter at least one tag");
      return;
    }

    setApplying(true);
    let failures = 0;

    for (const c of charts) {
      let nextTags: string[];
      if (mode === "add") {
        nextTags = Array.from(new Set([...c.tags, ...inputTags]));
      } else if (mode === "remove") {
        const removeSet = new Set(inputTags);
        nextTags = c.tags.filter((t) => !removeSet.has(t));
      } else {
        nextTags = [...inputTags];
      }
      try {
        if (c.source === "cloud") {
          await client.updateCloudChart(c.id, { tags: nextTags });
        } else {
          const stored = await chartCache.get(c.id);
          if (stored) {
            await chartCache.set({
              ...stored,
              tags: nextTags,
              updatedAt: Date.now(),
            });
          }
        }
      } catch {
        failures++;
      }
    }

    const succeeded = charts.length - failures;
    const verb =
      mode === "replace" ? "replaced" : mode === "add" ? "added" : "removed";
    if (succeeded > 0) {
      toast.success(
        `Tags ${verb} on ${succeeded} chart${succeeded !== 1 ? "s" : ""}`,
      );
    }
    if (failures > 0) {
      toast.error(`${failures} failed`);
    }

    setApplying(false);
    setTagsInput("");
    setMode("add");
    onApplied();
    onClose();
  }

  function handleClose() {
    if (applying) return;
    setTagsInput("");
    setMode("add");
    onClose();
  }

  const count = charts.length;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
    >
      <DialogContent className="bg-card border-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle>Tag charts</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-medium">
              Mode
            </label>
            <div
              className="flex gap-2"
              role="radiogroup"
              aria-label="Tag mode"
            >
              {(["add", "remove", "replace"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => setMode(m)}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                    mode === m
                      ? "bg-primary text-white border-primary"
                      : "bg-input border-border text-foreground hover:border-primary/50"
                  }`}
                >
                  {m === "add" ? "Add" : m === "remove" ? "Remove" : "Replace"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <Tag size={11} /> Tags
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="natal, client, work…"
              className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-dim-foreground focus:outline-none focus:border-primary transition-colors"
              autoFocus
            />
            <p className="text-xs text-dim-foreground">Comma-separated</p>
            <p className="text-xs text-muted-foreground">
              Applies to {count} chart{count !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={handleClose}
            disabled={applying}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={applying}
            className="px-4 py-2 text-sm bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
          >
            {applying ? "Applying…" : "Apply"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
