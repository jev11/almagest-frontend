import type { JSX } from "react";
import {
  Check,
  Pin,
  MoreVertical,
  SquarePen,
  Download,
  Trash2,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
} from "lucide-react";
import type { UnifiedChart } from "@/lib/unified-chart";
import { getChartSummary } from "@/lib/chart-summary";
import { formatRelativeTime } from "@/lib/format";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ChartsTableAction = "pin" | "edit" | "export" | "delete";

export type SortKey = "name" | "born" | "location" | "lastViewed";
export type SortDir = "asc" | "desc";
export interface SortState {
  key: SortKey;
  dir: SortDir;
}

interface ChartsTableProps {
  charts: UnifiedChart[];
  selected: Set<string>;
  anySelected: boolean;
  sortState: SortState;
  onSortChange: (next: SortState) => void;
  onToggleSelect: (id: string) => void;
  onOpen: (chart: UnifiedChart) => void;
  onRowMenu: (action: ChartsTableAction, chart: UnifiedChart) => void;
}

const SORT_LABELS: Record<SortKey, string> = {
  name: "Name",
  born: "Date",
  location: "Location",
  lastViewed: "Last viewed",
};

// Clicking a *new* column jumps to each key's most informative direction.
const DEFAULT_DIR: Record<SortKey, SortDir> = {
  name: "asc",
  location: "asc",
  born: "desc",
  lastViewed: "desc",
};

export function ChartsTable({
  charts,
  selected,
  anySelected,
  sortState,
  onSortChange,
  onToggleSelect,
  onOpen,
  onRowMenu,
}: ChartsTableProps): JSX.Element {
  const { isPhone } = useBreakpoint();

  if (isPhone) {
    return (
      <div
        className="flex flex-col gap-gap-sm"
        data-any-selected={anySelected || undefined}
      >
        <PhoneSortControl sortState={sortState} onSortChange={onSortChange} />
        <div className="charts-table charts-table-phone flex flex-col">
          {charts.map((c) => (
            <PhoneRow
              key={c.id}
              chart={c}
              selected={selected.has(c.id)}
              onToggleSelect={onToggleSelect}
              onOpen={onOpen}
              onRowMenu={onRowMenu}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="charts-table" data-any-selected={anySelected || undefined}>
      <div className="tr thead">
        <div></div>
        <SortHeader
          label="Name"
          sortKey="name"
          sortState={sortState}
          onSortChange={onSortChange}
        />
        <div>Sun / Moon / ASC</div>
        <SortHeader
          label="Date"
          sortKey="born"
          sortState={sortState}
          onSortChange={onSortChange}
        />
        <SortHeader
          label="Location"
          sortKey="location"
          sortState={sortState}
          onSortChange={onSortChange}
        />
        <div>Tags</div>
        <SortHeader
          label="Last viewed"
          sortKey="lastViewed"
          sortState={sortState}
          onSortChange={onSortChange}
        />
        <div></div>
      </div>
      {charts.map((c) => (
        <TableRow
          key={c.id}
          chart={c}
          selected={selected.has(c.id)}
          onToggleSelect={onToggleSelect}
          onOpen={onOpen}
          onRowMenu={onRowMenu}
        />
      ))}
    </div>
  );
}

interface SortHeaderProps {
  label: string;
  sortKey: SortKey;
  sortState: SortState;
  onSortChange: (next: SortState) => void;
}

function SortHeader({
  label,
  sortKey,
  sortState,
  onSortChange,
}: SortHeaderProps): JSX.Element {
  const active = sortState.key === sortKey;
  const ariaSort: "ascending" | "descending" | "none" = active
    ? sortState.dir === "asc"
      ? "ascending"
      : "descending"
    : "none";

  function handleClick() {
    if (active) {
      onSortChange({ key: sortKey, dir: sortState.dir === "asc" ? "desc" : "asc" });
    } else {
      onSortChange({ key: sortKey, dir: DEFAULT_DIR[sortKey] });
    }
  }

  return (
    <div aria-sort={ariaSort}>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1 bg-transparent border-0 p-0 text-inherit font-inherit tracking-inherit uppercase cursor-pointer hover:text-foreground transition-colors"
      >
        <span>{label}</span>
        {active ? (
          sortState.dir === "asc" ? (
            <ChevronUp size={12} />
          ) : (
            <ChevronDown size={12} />
          )
        ) : (
          <ArrowUpDown size={12} className="opacity-40" />
        )}
      </button>
    </div>
  );
}

interface PhoneSortControlProps {
  sortState: SortState;
  onSortChange: (next: SortState) => void;
}

function PhoneSortControl({
  sortState,
  onSortChange,
}: PhoneSortControlProps): JSX.Element {
  const arrow = sortState.dir === "asc" ? "↑" : "↓";
  return (
    <div className="flex items-center justify-end gap-gap-sm">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-pad-sm py-pad-xs rounded-md border border-border bg-card text-[length:var(--text-sm)] text-muted-foreground hover:text-foreground hover:bg-card-hover transition-colors"
              aria-label="Sort charts"
            >
              <span>Sort: {SORT_LABELS[sortState.key]} {arrow}</span>
              <ChevronDown size={12} />
            </button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-[180px]">
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => {
            const active = sortState.key === k;
            return (
              <DropdownMenuItem
                key={k}
                onClick={() => {
                  if (active) {
                    onSortChange({
                      key: k,
                      dir: sortState.dir === "asc" ? "desc" : "asc",
                    });
                  } else {
                    onSortChange({ key: k, dir: DEFAULT_DIR[k] });
                  }
                }}
              >
                {active ? (
                  sortState.dir === "asc" ? (
                    <ChevronUp size={14} className="text-muted-foreground" />
                  ) : (
                    <ChevronDown size={14} className="text-muted-foreground" />
                  )
                ) : (
                  <ArrowUpDown size={14} className="text-muted-foreground opacity-50" />
                )}
                {SORT_LABELS[k]}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface TableRowProps {
  chart: UnifiedChart;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onOpen: (chart: UnifiedChart) => void;
  onRowMenu: (action: ChartsTableAction, chart: UnifiedChart) => void;
}

function TableRow({
  chart,
  selected,
  onToggleSelect,
  onOpen,
  onRowMenu,
}: TableRowProps): JSX.Element {
  const summary = getChartSummary(chart.chart);

  const dt = new Date(chart.birthDatetime);
  const dateStr = dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  const location = chart.location && chart.location.length > 0 ? chart.location : "—";

  return (
    <div
      className="tr"
      data-selected={selected}
      onClick={() => onOpen(chart)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen(chart);
      }}
    >
      <button
        type="button"
        className="row-sel"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(chart.id);
        }}
        aria-label="Select chart"
        aria-pressed={selected}
      >
        {selected && <Check size={10} strokeWidth={3} />}
      </button>
      <div className="name">
        {chart.pinned && (
          <span style={{ color: "var(--accent)" }} title="Pinned">
            <Pin size={12} fill="currentColor" />
          </span>
        )}
        <span className="name-text">{chart.name}</span>
      </div>
      <div className="num-cell">
        {summary.sun && (
          <span className={`g c-${summary.sun.element}`}>{summary.sun.glyph}</span>
        )}
        {summary.moon && (
          <span className={`g c-${summary.moon.element}`} style={{ marginLeft: 6 }}>
            {summary.moon.glyph}
          </span>
        )}
        {summary.asc && (
          <span className={`g c-${summary.asc.element}`} style={{ marginLeft: 6 }}>
            {summary.asc.glyph}
          </span>
        )}
      </div>
      <div className="num-cell">{dateStr}</div>
      <div className="cell-sub">{location}</div>
      <div className="tag-cell">
        {chart.tags.map((t) => (
          <span key={t} className="chip">{t}</span>
        ))}
      </div>
      <div className="cell-sub">{formatRelativeTime(chart.lastViewedAt)}</div>
      <div onClick={(e) => e.stopPropagation()}>
        <RowMenu chart={chart} onRowMenu={onRowMenu} />
      </div>
    </div>
  );
}

interface PhoneRowProps {
  chart: UnifiedChart;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onOpen: (chart: UnifiedChart) => void;
  onRowMenu: (action: ChartsTableAction, chart: UnifiedChart) => void;
}

function PhoneRow({
  chart,
  selected,
  onToggleSelect,
  onOpen,
  onRowMenu,
}: PhoneRowProps): JSX.Element {
  const summary = getChartSummary(chart.chart);

  const dt = new Date(chart.birthDatetime);
  const dateStr = dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  const location = chart.location && chart.location.length > 0 ? chart.location : null;
  const hasTagRow = chart.tags.length > 0;

  return (
    <div
      className="tr tr-phone"
      data-selected={selected}
      onClick={() => onOpen(chart)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen(chart);
      }}
    >
      <button
        type="button"
        className="row-sel"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(chart.id);
        }}
        aria-label="Select chart"
        aria-pressed={selected}
      >
        {selected && <Check size={10} strokeWidth={3} />}
      </button>
      <div className="flex flex-col gap-gap-xs min-w-0 flex-1">
        <div className="flex items-center gap-gap-xs min-w-0">
          {chart.pinned && (
            <span style={{ color: "var(--accent)" }} title="Pinned">
              <Pin size={12} fill="currentColor" />
            </span>
          )}
          <span className="name-text text-[length:var(--text-sm)] font-medium truncate">
            {chart.name}
          </span>
        </div>
        <div className="text-[length:var(--text-xs)] text-dim-foreground flex items-center gap-1 min-w-0">
          {summary.sun && (
            <span className={`g c-${summary.sun.element}`}>{summary.sun.glyph}</span>
          )}
          {summary.moon && (
            <span className={`g c-${summary.moon.element}`}>{summary.moon.glyph}</span>
          )}
          {summary.asc && (
            <span className={`g c-${summary.asc.element}`}>{summary.asc.glyph}</span>
          )}
          <span className="truncate">
            {" · "}
            {dateStr}
            {location ? ` · ${location}` : ""}
          </span>
        </div>
        {hasTagRow && (
          <div className="flex flex-wrap gap-gap-xs">
            {chart.tags.map((t) => (
              <span key={t} className="chip">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <RowMenu chart={chart} onRowMenu={onRowMenu} />
      </div>
    </div>
  );
}

interface RowMenuProps {
  chart: UnifiedChart;
  onRowMenu: (action: ChartsTableAction, chart: UnifiedChart) => void;
}

function RowMenu({ chart, onRowMenu }: RowMenuProps): JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-border transition-colors"
            aria-label="Row actions"
          >
            <MoreVertical size={14} />
          </button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-[150px]">
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onRowMenu("pin", chart);
          }}
        >
          <Pin size={14} className="text-muted-foreground" />
          {chart.pinned ? "Unpin" : "Pin"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onRowMenu("edit", chart);
          }}
        >
          <SquarePen size={14} className="text-muted-foreground" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onRowMenu("export", chart);
          }}
        >
          <Download size={14} className="text-muted-foreground" />
          Export
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onRowMenu("delete", chart);
          }}
        >
          <Trash2 size={14} />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
