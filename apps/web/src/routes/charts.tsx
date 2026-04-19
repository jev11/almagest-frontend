import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, Pencil, Trash2, Tag, FileText, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import { chartCache, useAstroClient } from "@astro-app/astro-client";
import type { StoredChart, CloudChart } from "@astro-app/astro-client";
import { CelestialBody } from "@astro-app/shared-types";
import { ChartCard } from "@/components/chart/chart-card";
import { SIGN_GLYPHS, formatRelativeTime } from "@/lib/format";
import { CardSkeleton } from "@/components/ui/skeleton";
import { ErrorCard } from "@/components/ui/error-card";
import { useAuth } from "@/hooks/use-auth";
import { fromStored, fromCloud } from "@/lib/unified-chart";
import type { UnifiedChart } from "@/lib/unified-chart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

// ─── Edit metadata dialog ────────────────────────────────────────────────────

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

// ─── Cloud chart card ─────────────────────────────────────────────────────────

function CloudChartCard({
  chart,
  onDeleted,
  onEdited,
}: {
  chart: CloudChart;
  onDeleted: () => void;
  onEdited: (updated: CloudChart) => void;
}) {
  const client = useAstroClient();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);

  const dt = new Date(chart.birth_datetime);
  const dateStr = dt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  async function handleDelete() {
    setDeleting(true);
    try {
      await client.deleteCloudChart(chart.id);
      toast.success("Chart deleted");
      onDeleted();
    } catch {
      toast.error("Failed to delete chart");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <div
        className="group bg-card border border-border rounded-lg p-4 flex flex-col gap-3 hover:border-border-hover transition-colors cursor-pointer"
        onClick={() => navigate(`/chart/${chart.id}?source=cloud`)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") navigate(`/chart/${chart.id}?source=cloud`);
        }}
      >
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-foreground font-medium text-sm truncate">{chart.name}</p>
            <p className="text-muted-foreground text-xs mt-0.5">{dateStr}</p>
          </div>
          <div
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              title="Edit"
              onClick={() => setEditing(true)}
              className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              title="Delete"
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {chart.tags && chart.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chart.tags.map((tag) => (
              <span
                key={tag}
                className="bg-secondary border border-border text-muted-foreground text-xs px-2 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {chart.notes && (
          <p className="text-xs text-dim-foreground line-clamp-2">{chart.notes}</p>
        )}
      </div>

      {confirmDelete && (
        <Dialog open onOpenChange={() => setConfirmDelete(false)}>
          <DialogContent className="bg-card border-border text-foreground max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete chart?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-2">
              "{chart.name}" will be permanently deleted. This cannot be undone.
            </p>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-destructive hover:bg-destructive/80 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {editing && (
        <EditMetaDialog
          chart={chart}
          onClose={() => setEditing(false)}
          onSaved={onEdited}
        />
      )}
    </>
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

  const filteredLocal = useMemo(() => {
    if (authenticated) return [] as StoredChart[];
    const ids = new Set(displayCharts.map((c) => c.id));
    return localCharts.filter((c) => ids.has(c.id))
      .sort((a, b) => {
        const ai = displayCharts.findIndex((x) => x.id === a.id);
        const bi = displayCharts.findIndex((x) => x.id === b.id);
        return ai - bi;
      });
  }, [authenticated, localCharts, displayCharts]);

  const filteredCloud = useMemo(() => {
    if (!authenticated) return [] as CloudChart[];
    const ids = new Set(displayCharts.map((c) => c.id));
    return cloudCharts.filter((c) => ids.has(c.id))
      .sort((a, b) => {
        const ai = displayCharts.findIndex((x) => x.id === a.id);
        const bi = displayCharts.findIndex((x) => x.id === b.id);
        return ai - bi;
      });
  }, [authenticated, cloudCharts, displayCharts]);

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
      ) : displayCharts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          {allCharts.length === 0 ? (
            <>
              <p className="text-muted-foreground">No charts saved yet.</p>
              <button
                type="button"
                onClick={() => navigate("/chart/new")}
                className="text-primary text-sm hover:underline"
              >
                Create your first chart →
              </button>
            </>
          ) : (
            <p className="text-muted-foreground">No charts match "{query}".</p>
          )}
        </div>
      ) : authenticated ? (
        viewMode === "cards" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 content-start">
            {filteredCloud.map((c) => (
              <CloudChartCard
                key={c.id}
                chart={c}
                onDeleted={loadCloud}
                onEdited={(updated) =>
                  setCloudCharts((prev) =>
                    prev.map((x) => (x.id === c.id ? updated : x)),
                  )
                }
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1 flex-1">
            {filteredCloud.map((c) => {
              const dt = new Date(c.birth_datetime);
              const dateStr = dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-4 px-4 py-3 bg-card border border-border rounded-lg hover:border-primary/40 hover:bg-secondary cursor-pointer transition-[border-color,background-color] duration-160 ease-out"
                  onClick={() => navigate(`/chart/${c.id}?source=cloud`)}
                >
                  <span className="text-foreground font-medium text-sm flex-1 truncate">{c.name}</span>
                  <span className="text-muted-foreground text-xs shrink-0">{dateStr}</span>
                </div>
              );
            })}
          </div>
        )
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 content-start">
          {filteredLocal.map((c) => (
            <ChartCard
              key={c.id}
              stored={c}
              onDeleted={loadLocal}
              onRenamed={(name) =>
                setLocalCharts((prev) =>
                  prev.map((x) => (x.id === c.id ? { ...x, name } : x)),
                )
              }
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1 flex-1">
          {filteredLocal.map((c) => {
            const sunZp = c.chart.zodiac_positions[CelestialBody.Sun];
            const signGlyph = sunZp ? (SIGN_GLYPHS[sunZp.sign] ?? "") : "";
            const dt = new Date(c.request.datetime);
            const dateStr = dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
            return (
              <div
                key={c.id}
                className="flex items-center gap-4 px-4 py-3 bg-card border border-border rounded-lg hover:border-primary/40 hover:bg-secondary cursor-pointer transition-[border-color,background-color] duration-160 ease-out"
                onClick={() => navigate(`/chart/${c.id}`)}
              >
                {sunZp && <span className="text-primary text-base shrink-0">{signGlyph}</span>}
                <span className="text-foreground font-medium text-sm flex-1 truncate">{c.name}</span>
                {c.location && <span className="text-muted-foreground text-xs shrink-0 hidden sm:block">{c.location}</span>}
                <span className="text-muted-foreground text-xs shrink-0">{dateStr}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
