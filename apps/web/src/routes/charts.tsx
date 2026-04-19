import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, Plus } from "lucide-react";
import { toast } from "sonner";
import { chartCache, useAstroClient } from "@astro-app/astro-client";
import type { StoredChart, CloudChart } from "@astro-app/astro-client";
import { BulkActionBar } from "@/components/chart/bulk-action-bar";
import { BulkTagDialog } from "@/components/chart/bulk-tag-dialog";
import { BulkExportDialog } from "@/components/chart/bulk-export-dialog";
import { ChartsTable } from "@/components/chart/charts-table";
import type {
  ChartsTableAction,
  SortKey,
  SortDir,
  SortState,
} from "@/components/chart/charts-table";
import { formatRelativeTime } from "@/lib/format";
import { CardSkeleton } from "@/components/ui/skeleton";
import { ErrorCard } from "@/components/ui/error-card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { fromStored, fromCloud, chartHref } from "@/lib/unified-chart";
import type { UnifiedChart } from "@/lib/unified-chart";
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

function compareByKey(
  a: UnifiedChart,
  b: UnifiedChart,
  key: SortKey,
  dir: SortDir,
): number {
  const mul = dir === "asc" ? 1 : -1;
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name) * mul;
    case "location":
      return (a.location ?? "").localeCompare(b.location ?? "") * mul;
    case "born":
      return a.birthDatetime.localeCompare(b.birthDatetime) * mul;
    case "lastViewed": {
      const av = a.lastViewedAt ?? -Infinity;
      const bv = b.lastViewedAt ?? -Infinity;
      if (av === bv) return (b.createdAt - a.createdAt) * (dir === "asc" ? -1 : 1);
      return (av - bv) * mul;
    }
  }
}

// Pinned rows always float above the rest — the user's sort choice only
// orders within each group.
function sortCharts(charts: UnifiedChart[], sort: SortState): UnifiedChart[] {
  const copy = [...charts];
  copy.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return compareByKey(a, b, sort.key, sort.dir);
  });
  return copy;
}

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
  const [sortState, setSortState] = useState<SortState>({
    key: "lastViewed",
    dir: "desc",
  });

  const [pendingDelete, setPendingDelete] = useState<UnifiedChart | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [bulkDeletePending, setBulkDeletePending] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const anySelected = selected.size > 0;

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

  const selectedCharts = useMemo<UnifiedChart[]>(
    () => allCharts.filter((c) => selected.has(c.id)),
    [allCharts, selected],
  );

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
    return sortCharts(filtered, sortState);
  }, [allCharts, query, sortState]);

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

  async function handleBulkDelete() {
    setBulkDeleting(true);
    const ids = Array.from(selected);
    const charts = allCharts.filter((c) => ids.includes(c.id));

    let failures = 0;
    for (const c of charts) {
      try {
        if (c.source === "cloud") {
          await client.deleteCloudChart(c.id);
        } else {
          await chartCache.delete(c.id);
        }
      } catch {
        failures++;
      }
    }

    if (failures === 0) {
      toast.success(
        `${charts.length} chart${charts.length !== 1 ? "s" : ""} deleted`,
      );
    } else {
      toast.error(
        `Deleted ${charts.length - failures} of ${charts.length} — ${failures} failed`,
      );
    }

    loadLocal();
    if (authenticated) loadCloud();

    clearSelection();
    setBulkDeletePending(false);
    setBulkDeleting(false);
  }

  async function handleTogglePin(chart: UnifiedChart) {
    const nextPinned = !chart.pinned;
    try {
      if (chart.source === "cloud") {
        await client.pinCloudChart(chart.id, nextPinned);
        loadCloud();
      } else {
        const stored = await chartCache.get(chart.id);
        if (!stored) return;
        await chartCache.set({
          ...stored,
          pinned: nextPinned,
          updatedAt: Date.now(),
        });
        loadLocal();
      }
      toast.success(nextPinned ? "Pinned" : "Unpinned");
    } catch {
      toast.error("Pin action failed");
    }
  }

  function openEditForSingle(c: UnifiedChart) {
    const base = c.source === "cloud" ? `/chart/${c.id}?source=cloud` : `/chart/${c.id}`;
    const sep = base.includes("?") ? "&" : "?";
    navigate(`${base}${sep}edit=1`);
  }

  function openExportForSingle(c: UnifiedChart) {
    setSelected(new Set([c.id]));
    setExportDialogOpen(true);
  }

  function handleRowMenu(action: ChartsTableAction, c: UnifiedChart) {
    switch (action) {
      case "delete":
        handleDelete(c);
        return;
      case "pin":
        handleTogglePin(c);
        return;
      case "edit":
        openEditForSingle(c);
        return;
      case "export":
        openExportForSingle(c);
        return;
    }
  }

  const isEmpty = chartCount === 0;
  const noMatches = !isEmpty && displayCharts.length === 0;

  const newChartButton = (
    <Button
      onClick={handleNew}
      disabled={atLimit}
      size="default"
      className="gap-1.5"
    >
      <Plus size={14} />
      New Chart
    </Button>
  );

  return (
    <div className="charts-page flex flex-col gap-gap-lg py-pad px-pad tablet:py-pad-lg tablet:px-pad-lg desktop:px-12 h-full">
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
              <span>No charts yet — start with a new one.</span>
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
        <div className="page-head-actions flex items-center gap-gap-sm">
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
          {atLimit ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="inline-flex" tabIndex={0}>
                    {newChartButton}
                  </span>
                }
              />
              <TooltipContent side="bottom">
                Free tier reached — upgrade to add more charts
              </TooltipContent>
            </Tooltip>
          ) : (
            newChartButton
          )}
        </div>
      </header>

      <div className="charts-toolbar" data-any-selected={anySelected || undefined}>
        <div className="search">
          <Search />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search charts, locations, tags…"
          />
        </div>
        <div className="toolbar-meta">
          {displayCharts.length} of {allCharts.length}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 wide:grid-cols-4 gap-gap flex-1 content-start">
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
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[length:var(--text-sm)] text-muted-foreground">
            No charts yet — tap New Chart to create one.
          </p>
        </div>
      ) : noMatches ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">
            No charts match "{query}".
          </p>
        </div>
      ) : (
        <ChartsTable
          charts={displayCharts}
          selected={selected}
          anySelected={anySelected}
          sortState={sortState}
          onSortChange={setSortState}
          onToggleSelect={toggleSelect}
          onOpen={handleOpen}
          onRowMenu={handleRowMenu}
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

      <AlertDialog
        open={bulkDeletePending}
        onOpenChange={(open) => {
          if (!open && !bulkDeleting) setBulkDeletePending(false);
        }}
      >
        <AlertDialogContent className="bg-card border-border text-foreground max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selected.size} chart{selected.size !== 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected chart
              {selected.size !== 1 ? "s" : ""}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="bg-destructive hover:bg-destructive/80 text-white"
            >
              {bulkDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BulkActionBar
        count={selected.size}
        compareReady={selected.size === 2}
        onClear={clearSelection}
        onCompare={() => toast.info("Compare — coming soon")}
        onTag={() => setTagDialogOpen(true)}
        onExport={() => setExportDialogOpen(true)}
        onDelete={() => setBulkDeletePending(true)}
      />

      <BulkTagDialog
        open={tagDialogOpen}
        charts={selectedCharts}
        onClose={() => setTagDialogOpen(false)}
        onApplied={() => {
          loadLocal();
          if (authenticated) loadCloud();
          clearSelection();
        }}
      />

      <BulkExportDialog
        open={exportDialogOpen}
        charts={selectedCharts}
        onClose={() => setExportDialogOpen(false)}
      />
    </div>
  );
}
