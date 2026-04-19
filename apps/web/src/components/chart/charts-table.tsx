import type { JSX } from "react";
import { Check, Pin, MoreVertical, Pencil, Tag, Download, Trash2 } from "lucide-react";
import type { UnifiedChart } from "@/lib/unified-chart";
import { MiniWheel, toMiniWheelProps } from "@/components/chart/mini-wheel";
import { getChartSummary, getDominantElement } from "@/lib/chart-summary";
import { formatRelativeTime } from "@/lib/format";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ChartsTableAction = "pin" | "rename" | "tag" | "export" | "delete";

interface ChartsTableProps {
  charts: UnifiedChart[];
  selected: Set<string>;
  anySelected: boolean;
  onToggleSelect: (id: string) => void;
  onOpen: (chart: UnifiedChart) => void;
  onRowMenu: (action: ChartsTableAction, chart: UnifiedChart) => void;
}

export function ChartsTable({
  charts,
  selected,
  anySelected,
  onToggleSelect,
  onOpen,
  onRowMenu,
}: ChartsTableProps): JSX.Element {
  return (
    <div className="charts-table" data-any-selected={anySelected || undefined}>
      <div className="tr thead">
        <div></div>
        <div></div>
        <div>Name</div>
        <div className="hide-sm">Sun / Moon / ASC</div>
        <div className="hide-sm">Born</div>
        <div className="hide-sm">Location</div>
        <div className="hide-sm">Tags</div>
        <div className="hide-sm">Last viewed</div>
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
  const dominant = getDominantElement(chart.chart);
  const dominantChip = dominant.length > 0 ? dominant[0] : null;

  const dt = new Date(chart.birthDatetime);
  const dateStr = dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  const location = chart.location && chart.location.length > 0 ? chart.location : "—";
  const firstTag = chart.tags[0];

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
      <div className="mini-wheel">
        <MiniWheel {...toMiniWheelProps(chart.chart, { size: 32, variant: "compact" })} />
      </div>
      <div className="name">
        {chart.pinned && (
          <span style={{ color: "var(--accent)" }} title="Pinned">
            <Pin size={12} fill="currentColor" />
          </span>
        )}
        <span className="name-text">{chart.name}</span>
      </div>
      <div className="hide-sm num-cell">
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
      <div className="hide-sm num-cell">{dateStr}</div>
      <div className="hide-sm cell-sub">{location}</div>
      <div className="hide-sm tag-cell">
        {dominantChip && (
          <span className={`chip dom-${dominantChip}`}>{dominantChip}</span>
        )}
        {firstTag && <span className="chip">{firstTag}</span>}
      </div>
      <div className="hide-sm cell-sub">{formatRelativeTime(chart.lastViewedAt)}</div>
      <div onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger
            nativeButton={false}
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
                onRowMenu("rename", chart);
              }}
            >
              <Pencil size={14} className="text-muted-foreground" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onRowMenu("tag", chart);
              }}
            >
              <Tag size={14} className="text-muted-foreground" />
              Tag
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
      </div>
    </div>
  );
}
