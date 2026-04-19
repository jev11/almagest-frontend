import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, Tag, FileText, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import { chartCache, useAstroClient } from "@astro-app/astro-client";
import type { StoredChart, CloudChart } from "@astro-app/astro-client";
import { ChartCardEditorial } from "@/components/chart/chart-card-editorial";
import { ChartsTable } from "@/components/chart/charts-table";
import type { ChartsTableAction } from "@/components/chart/charts-table";
import { EmptyState } from "@/components/chart/empty-state";
import { FeaturedChart } from "@/components/chart/featured-chart";
import { NewChartTile } from "@/components/chart/new-chart-tile";
import { formatRelativeTime } from "@/lib/format";
import { CardSkeleton } from "@/components/ui/skeleton";
import { ErrorCard } from "@/components/ui/error-card";
import { useAuth } from "@/hooks/use-auth";
import { fromStored, fromCloud, chartHref } from "@/lib/unified-chart";
import type { UnifiedChart } from "@/lib/unified-chart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import "./charts-page.css";

const FREE_TIER_LIMIT = 5;

type SortMode = "recent" | "az" | "birth";
type ViewMode = "cards" | "list";

function sortCharts(charts: UnifiedChart[], sort: SortMode): UnifiedChart[] {
  const copy = [...charts];
  if (sort === "recent") {
    copy.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const av = a.lastViewedAt ?? -Infinity;
      const bv = b.lastViewedAt ?? -Infinity;
      if (av !== bv) return bv - av;
      return b.createdAt - a.createdAt;
    });
  } else if (sort === "az") {
    copy.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    copy.sort((a, b) => a.birthDatetime.localeCompare(b.birthDatetime));
  }
  return copy;
}

// ─── Rename dialog (works for both local and cloud) ──────────────────────────

interface RenameDialogProps {
  chart: UnifiedChart;
  getStored: (id: string) => StoredChart | undefined;
  onClose: () => void;
  onRenamedLocal: (id: string, name: string) => void;
  onRenamedCloud: (updated: CloudChart) => void;
}

function RenameDialog({
  chart,
  getStored,
  onClose,
  onRenamedLocal,
  onRenamedCloud,
}: RenameDialogProps) {
  const client = useAstroClient();
  const [name, setName] = useState(chart.name);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      if (chart.source === "cloud") {
        const updated = await client.updateCloudChart(chart.id, { name: trimmed });
        onRenamedCloud(updated);
      } else {
        const stored = getStored(chart.id);
        if (!stored) throw new Error("Chart not found");
        const next: StoredChart = { ...stored, name: trimmed, updatedAt: Date.now() };
        await chartCache.set(next);
        onRenamedLocal(chart.id, trimmed);
      }
      toast.success("Chart renamed");
      onClose();
    } catch {
      toast.error("Could not rename chart");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border text-foreground max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename chart</DialogTitle>
        </DialogHeader>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
          className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
          autoFocus
        />
        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-4 py-2 text-sm bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit metadata dialog (cloud full edit) ──────────────────────────────────

interface EditDialogProps {
  chart: CloudChart;
  onClose: () => void;
  onSaved: (updated: CloudChart) => void;
}

function EditMetaDialog({ chart, onClose, onSaved }: EditDialogProps) {
  const client = useAstroClient();
  const [name, setName] = useState(chart.name);
  const [notes, setNotes] = useState(chart.notes ?? "");
  const [tagsInput, setTagsInput] = useState((chart.tags ?? []).join(", "));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const updated = await client.updateCloudChart(chart.id, {
        name: name.trim(),
        notes: notes.trim() || undefined,
        tags,
      });
      onSaved(updated);
      toast.success("Chart updated");
      onClose();
    } catch {
      toast.error("Failed to update chart");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle>Edit chart</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-medium">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
            />
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
            />
            <p className="text-xs text-dim-foreground">Comma-separated</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <FileText size={11} /> Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional notes…"
              className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-dim-foreground focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-4 py-2 text-sm bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ChartsPage() {
  const navigate = useNavigate();
  const client = useAstroClient();
  const user = useAuth((s) => s.user);
  const isAuthenticated = useAuth((s) => s.isAuthenticated);

  const [localCharts, setLocalCharts] = useState<StoredChart[]>([]);
  const [localLoading, setLocalLoading] = useState(true);
  const [localError, setLocalError] = useState(false);

  const [cloudCharts, setCloudCharts] = useState<CloudChart[]>([]);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState(false);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem("astro-charts-view") as ViewMode) ?? "cards";
  });

  // Dialog state
  const [renaming, setRenaming] = useState<UnifiedChart | null>(null);
  const [pendingDelete, setPendingDelete] = useState<UnifiedChart | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState<CloudChart | null>(null);

  function setView(next: ViewMode) {
    setViewMode(next);
    localStorage.setItem("astro-charts-view", next);
  }

  const authenticated = isAuthenticated();

  function loadLocal() {
    setLocalError(false);
    setLocalLoading(true);
    chartCache
      .getAll()
      .then((all) => setLocalCharts(all.sort((a, b) => b.createdAt - a.createdAt)))
      .catch(() => setLocalError(true))
      .finally(() => setLocalLoading(false));
  }

  function loadCloud() {
    setCloudError(false);
    setCloudLoading(true);
    client
      .listCloudCharts({ sort: "created_at", order: "desc" })
      .then((res) => setCloudCharts(res.items))
      .catch(() => setCloudError(true))
      .finally(() => setCloudLoading(false));
  }

  useEffect(() => {
    loadLocal();
    if (authenticated) loadCloud();
  }, [authenticated]);

  const allCharts = useMemo<UnifiedChart[]>(() => {
    return authenticated
      ? cloudCharts.map(fromCloud)
      : localCharts.map(fromStored);
  }, [authenticated, cloudCharts, localCharts]);

  const displayCharts = useMemo<UnifiedChart[]>(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? allCharts.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.location ?? "").toLowerCase().includes(q) ||
            c.tags.some((t) => t.toLowerCase().includes(q)),
        )
      : allCharts;
    return sortCharts(filtered, sort);
  }, [allCharts, query, sort]);

  const chartCount = allCharts.length;
  const pinnedCount = allCharts.filter((c) => c.pinned).length;
  const lastViewedAt = allCharts.reduce<number | null>((acc, c) => {
    if (c.lastViewedAt === null) return acc;
    if (acc === null) return c.lastViewedAt;
    return c.lastViewedAt > acc ? c.lastViewedAt : acc;
  }, null);

  const chartLimit = user?.tier === "premium" ? null : FREE_TIER_LIMIT;
  const usagePct = chartLimit ? Math.min((chartCount / chartLimit) * 100, 100) : 0;
  const atLimit = chartLimit !== null && chartCount >= chartLimit;

  const loading = authenticated ? cloudLoading : localLoading;
  const hasError = authenticated ? cloudError : localError;

  // ── Handlers ──
  const getStoredById = (id: string): StoredChart | undefined =>
    localCharts.find((c) => c.id === id);
  const getCloudById = (id: string): CloudChart | undefined =>
    cloudCharts.find((c) => c.id === id);

  function handleOpen(c: UnifiedChart) {
    navigate(chartHref(c));
  }

  function handleNew() {
    if (atLimit) {
      toast.error("Free tier reached — upgrade to add more charts");
      return;
    }
    navigate("/chart/new");
  }

  function handleRename(c: UnifiedChart) {
    // For cloud charts, open the full metadata editor so notes/tags remain editable.
    if (c.source === "cloud") {
      const cloud = getCloudById(c.id);
      if (cloud) {
        setEditing(cloud);
        return;
      }
    }
    setRenaming(c);
  }

  function handleDelete(c: UnifiedChart) {
    setPendingDelete(c);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      if (pendingDelete.source === "cloud") {
        await client.deleteCloudChart(pendingDelete.id);
        setCloudCharts((prev) => prev.filter((c) => c.id !== pendingDelete.id));
      } else {
        await chartCache.delete(pendingDelete.id);
        setLocalCharts((prev) => prev.filter((c) => c.id !== pendingDelete.id));
      }
      toast.success(`"${pendingDelete.name}" deleted`);
      setPendingDelete(null);
    } catch {
      toast.error("Could not delete chart");
    } finally {
      setDeleting(false);
    }
  }

  function handleRowMenu(action: ChartsTableAction, c: UnifiedChart) {
    switch (action) {
      case "rename":
        handleRename(c);
        return;
      case "delete":
        handleDelete(c);
        return;
      case "pin":
        toast.info("Pin — coming soon");
        return;
      case "tag":
        toast.info("Tag — coming soon");
        return;
      case "export":
        toast.info("Export — coming soon");
        return;
    }
  }

  const isEmpty = chartCount === 0;
  const noMatches = !isEmpty && displayCharts.length === 0;

  const featured: UnifiedChart | null =
    !query.trim() && displayCharts.length > 0
      ? (displayCharts.find((c) => c.pinned) ?? displayCharts[0])
      : null;

  const bodyCharts = featured
    ? displayCharts.filter((c) => c.id !== featured.id)
    : displayCharts;

  return (
    <div className="charts-page flex flex-col gap-6 py-8 px-6 md:px-12 h-full">
      {/* Editorial header */}
      <header className="charts-head">
        <div>
          {chartCount > 0 && (
            <div className="eyebrow">Your library · {chartCount} saved</div>
          )}
          <h1>
            My <em>charts</em>
          </h1>
          <div className="meta">
            {chartCount === 0 ? (
              <span>No charts yet — cast your first below.</span>
            ) : (
              <>
                <span className="num">{chartCount}</span> saved
                <span className="dot">·</span>
                <span className="num">{pinnedCount}</span> pinned
                <span className="dot">·</span>
                last opened {formatRelativeTime(lastViewedAt)}
              </>
            )}
          </div>
        </div>
        <div className="page-head-actions">
          {chartLimit !== null ? (
            <div className={`usage-chip ${atLimit ? "near" : ""}`}>
              <span>
                <span className="num">{chartCount}</span> of {chartLimit}
              </span>
              <div className="track">
                <div className="fill" style={{ width: `${usagePct}%` }} />
              </div>
              <Link className="upg" to="/settings">
                Upgrade →
              </Link>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">{chartCount} saved</span>
          )}
        </div>
      </header>

      {/* Featured hero */}
      {featured && (
        <FeaturedChart
          chart={featured}
          onOpen={(c) => navigate(chartHref(c))}
          onCompare={() => toast.info("Compare — coming soon")}
          onEdit={(c) => handleRename(c)}
        />
      )}

      {/* Toolbar */}
      <div className="charts-toolbar">
        <div className="search">
          <Search />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search charts, locations, tags…"
          />
          <kbd>⌘K</kbd>
        </div>
        <div className="sort-seg" role="group" aria-label="Sort charts">
          <button
            type="button"
            aria-pressed={sort === "recent"}
            onClick={() => setSort("recent")}
          >
            Recent
          </button>
          <button
            type="button"
            aria-pressed={sort === "az"}
            onClick={() => setSort("az")}
          >
            A–Z
          </button>
          <button
            type="button"
            aria-pressed={sort === "birth"}
            onClick={() => setSort("birth")}
          >
            Birth date
          </button>
        </div>
        <div className="view-seg" role="group" aria-label="View mode">
          <button
            type="button"
            aria-pressed={viewMode === "cards"}
            onClick={() => setView("cards")}
            title="Grid"
          >
            <LayoutGrid />
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "list"}
            onClick={() => setView("list")}
            title="List"
          >
            <List />
          </button>
        </div>
        <div className="toolbar-meta">
          {displayCharts.length} of {allCharts.length}
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 content-start">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : hasError ? (
        <div className="flex-1 flex items-center justify-center">
          <ErrorCard
            message="Could not load charts."
            onRetry={authenticated ? loadCloud : loadLocal}
            className="max-w-xs w-full"
          />
        </div>
      ) : isEmpty ? (
        <EmptyState onNew={() => navigate("/chart/new")} />
      ) : noMatches ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">
            No charts match "{query}".
          </p>
        </div>
      ) : viewMode === "cards" ? (
        <div className="charts-grid">
          <NewChartTile atLimit={atLimit} onClick={handleNew} />
          {bodyCharts.map((c) => (
            <ChartCardEditorial
              key={c.id}
              chart={c}
              selected={false}
              anySelected={false}
              onToggleSelect={() => {
                /* selection — Task 6 */
              }}
              onOpen={handleOpen}
              onPin={() => toast.info("Pin — coming soon")}
              onRename={handleRename}
              onTag={() => toast.info("Tag — coming soon")}
              onExport={() => toast.info("Export — coming soon")}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <ChartsTable
          charts={bodyCharts}
          selected={new Set()}
          anySelected={false}
          onToggleSelect={() => {
            /* selection — Task 6 */
          }}
          onOpen={handleOpen}
          onRowMenu={handleRowMenu}
        />
      )}

      {/* Dialogs */}
      {renaming && (
        <RenameDialog
          chart={renaming}
          getStored={getStoredById}
          onClose={() => setRenaming(null)}
          onRenamedLocal={(id, name) =>
            setLocalCharts((prev) =>
              prev.map((x) => (x.id === id ? { ...x, name } : x)),
            )
          }
          onRenamedCloud={(updated) =>
            setCloudCharts((prev) =>
              prev.map((x) => (x.id === updated.id ? updated : x)),
            )
          }
        />
      )}

      {editing && (
        <EditMetaDialog
          chart={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setCloudCharts((prev) =>
              prev.map((x) => (x.id === updated.id ? updated : x)),
            );
          }}
        />
      )}

      {pendingDelete && (
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (!open) setPendingDelete(null);
          }}
        >
          <AlertDialogContent className="bg-card border-border text-foreground max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete chart?</AlertDialogTitle>
              <AlertDialogDescription>
                "{pendingDelete.name}" will be permanently deleted. This cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deleting}
                className="bg-destructive hover:bg-destructive/80 text-white"
              >
                {deleting ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
