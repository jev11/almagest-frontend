import { useEffect, useMemo, useState, type JSX } from "react";
import { toast } from "sonner";
import { chartCache, useAstroClient } from "@astro-app/astro-client";
import type { UnifiedChart } from "@/lib/unified-chart";
import { TagInput } from "@/components/forms/tag-input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BulkTagDialogProps {
  charts: UnifiedChart[];
  open: boolean;
  onClose: () => void;
  onApplied: () => void;
}

function intersectionTags(charts: UnifiedChart[]): string[] {
  if (charts.length === 0) return [];
  const [first, ...rest] = charts;
  return first.tags.filter((t) => rest.every((c) => c.tags.includes(t)));
}

export function BulkTagDialog({
  charts,
  open,
  onClose,
  onApplied,
}: BulkTagDialogProps): JSX.Element {
  const client = useAstroClient();
  const initial = useMemo(() => intersectionTags(charts), [charts]);
  const [tags, setTags] = useState<string[]>(initial);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (open) setTags(initial);
  }, [open, initial]);

  async function handleApply() {
    const initialSet = new Set(initial);
    const finalSet = new Set(tags);
    const added = tags.filter((t) => !initialSet.has(t));
    const removed = initial.filter((t) => !finalSet.has(t));

    if (added.length === 0 && removed.length === 0) {
      onClose();
      return;
    }

    setApplying(true);
    let failures = 0;

    for (const c of charts) {
      const removeSet = new Set(removed);
      const nextTags = Array.from(
        new Set([...c.tags.filter((t) => !removeSet.has(t)), ...added]),
      );
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
    if (succeeded > 0) {
      toast.success(
        `Tags updated on ${succeeded} chart${succeeded !== 1 ? "s" : ""}`,
      );
    }
    if (failures > 0) {
      toast.error(`${failures} failed`);
    }

    setApplying(false);
    onApplied();
    onClose();
  }

  function handleClose() {
    if (applying) return;
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
            <label
              htmlFor="bulk-tags"
              className="text-xs text-muted-foreground font-medium"
            >
              Tags
            </label>
            <TagInput id="bulk-tags" value={tags} onChange={setTags} />
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
