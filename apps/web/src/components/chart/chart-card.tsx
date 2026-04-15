import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { MoreHorizontal, Trash2, Pencil } from "lucide-react";
import { chartCache } from "@astro-app/astro-client";
import type { StoredChart } from "@astro-app/astro-client";
import { CelestialBody } from "@astro-app/shared-types";
import { ChartCanvas } from "@/components/chart/chart-canvas";
import { SIGN_GLYPHS } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";

interface ChartCardProps {
  stored: StoredChart;
  onDeleted: () => void;
  onRenamed: (newName: string) => void;
}

export function ChartCard({ stored, onDeleted, onRenamed }: ChartCardProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState(stored.name);

  const sunZp = stored.chart.zodiac_positions[CelestialBody.Sun];
  const signGlyph = sunZp ? (SIGN_GLYPHS[sunZp.sign] ?? "") : "";
  const signName = sunZp
    ? sunZp.sign.charAt(0).toUpperCase() + sunZp.sign.slice(1)
    : "";

  const dt = new Date(stored.request.datetime);
  const dateStr = dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  async function handleDelete() {
    try {
      await chartCache.delete(stored.id);
      setDeleteOpen(false);
      onDeleted();
      toast.success(`"${stored.name}" deleted`);
    } catch {
      toast.error("Could not delete chart");
    }
  }

  async function handleRename() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      const updated: StoredChart = { ...stored, name: trimmed, updatedAt: Date.now() };
      await chartCache.set(updated);
      setRenameOpen(false);
      onRenamed(trimmed);
      toast.success("Chart renamed");
    } catch {
      toast.error("Could not rename chart");
    }
  }

  return (
    <>
      <Card
        className="cursor-pointer hover:border-primary/40 hover:bg-secondary transition-[border-color,background-color] duration-160 ease-out group relative"
        onClick={() => navigate(`/chart/${stored.id}`)}
      >
        <CardContent className="p-4 flex flex-col items-center gap-3">
        {/* ⋯ menu button */}
        <button
          type="button"
          className="absolute top-2 right-2 w-9 h-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-border transition-colors opacity-0 group-hover:opacity-100"
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
        >
          <MoreHorizontal size={16} />
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <div
            className="absolute top-10 right-3 z-20 bg-secondary border border-border rounded-lg shadow-lg overflow-hidden min-w-[140px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-border transition-colors"
              onClick={() => { setMenuOpen(false); setNewName(stored.name); setRenameOpen(true); }}
            >
              <Pencil size={14} className="text-muted-foreground" />
              Rename
            </button>
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-border transition-colors"
              onClick={() => { setMenuOpen(false); setDeleteOpen(true); }}
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        )}

        {/* Mini chart wheel */}
        <div className="w-[120px] h-[120px] rounded-full overflow-hidden shrink-0">
          <ChartCanvas data={stored.chart} className="w-full h-full" />
        </div>

        {/* Info */}
        <p className="text-foreground font-semibold text-sm text-center truncate w-full">{stored.name}</p>
        {sunZp && (
          <p className="text-muted-foreground text-xs">{signGlyph} {signName}</p>
        )}
        <p className="text-dim-foreground text-[11px]">{dateStr}</p>
        </CardContent>
      </Card>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete chart?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            "{stored.name}" will be permanently deleted.
          </p>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDeleteOpen(false)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 text-sm bg-destructive hover:bg-destructive/80 text-white rounded-lg transition-colors"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename chart</DialogTitle>
          </DialogHeader>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
            autoFocus
          />
          <DialogFooter>
            <button
              type="button"
              onClick={() => setRenameOpen(false)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRename}
              className="px-4 py-2 text-sm bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors"
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
