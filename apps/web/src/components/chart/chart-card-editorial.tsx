import type { JSX } from "react";
import { Check, Pin, MoreVertical, Pencil, Tag, Download, Trash2 } from "lucide-react";
import type { UnifiedChart } from "@/lib/unified-chart";
import { MiniWheel, toMiniWheelProps } from "@/components/chart/mini-wheel";
import { getChartSummary, getDominantElement } from "@/lib/chart-summary";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChartCardEditorialProps {
  chart: UnifiedChart;
  selected: boolean;
  anySelected: boolean;
  onToggleSelect: (id: string) => void;
  onOpen: (chart: UnifiedChart) => void;
  onPin: (chart: UnifiedChart) => void;
  onRename: (chart: UnifiedChart) => void;
  onTag: (chart: UnifiedChart) => void;
  onExport: (chart: UnifiedChart) => void;
  onDelete: (chart: UnifiedChart) => void;
}

export function ChartCardEditorial({
  chart,
  selected,
  anySelected: _anySelected,
  onToggleSelect,
  onOpen,
  onPin,
  onRename,
  onTag,
  onExport,
  onDelete,
}: ChartCardEditorialProps): JSX.Element {
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

  const hasTags = chart.tags.length > 0;
  const showTagRow = hasTags || dominantChip !== null;

  return (
    <div
      className="cc group/cc"
      data-selected={selected}
      onClick={() => onOpen(chart)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          // Space would otherwise scroll the page when a role="button" is
          // focused — preventDefault is the a11y-correct behavior.
          e.preventDefault();
          onOpen(chart);
        }
      }}
    >
      <button
        type="button"
        className="cc-select"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(chart.id);
        }}
        aria-label="Select chart"
        aria-pressed={selected}
      >
        {selected && <Check size={12} strokeWidth={3} />}
      </button>

      <div className="cc-wheel relative">
        <MiniWheel
          {...toMiniWheelProps(chart.chart, { size: 120, variant: "compact" })}
        />
        <DropdownMenu>
          <DropdownMenuTrigger
            nativeButton={false}
            render={
              <button
                type="button"
                className="absolute bottom-2 right-2 w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-border transition-colors opacity-0 group-hover/cc:opacity-100 data-[popup-open]:opacity-100"
                onClick={(e) => e.stopPropagation()}
                aria-label="Chart actions"
              >
                <MoreVertical size={14} />
              </button>
            }
          />
          <DropdownMenuContent
            align="end"
            onClick={(e) => e.stopPropagation()}
            className="min-w-[150px]"
          >
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onOpen(chart);
              }}
            >
              Open
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onPin(chart);
              }}
            >
              <Pin size={14} className="text-muted-foreground" />
              {chart.pinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onRename(chart);
              }}
            >
              <Pencil size={14} className="text-muted-foreground" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onTag(chart);
              }}
            >
              <Tag size={14} className="text-muted-foreground" />
              Tag
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onExport(chart);
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
                onDelete(chart);
              }}
            >
              <Trash2 size={14} />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div>
        <div className="cc-head">
          <h3>{chart.name}</h3>
          {chart.pinned && (
            <span className="cc-pin" title="Pinned">
              <Pin size={12} fill="currentColor" />
            </span>
          )}
        </div>
        <div className="cc-meta">
          {dateStr}
          {chart.location ? ` · ${chart.location}` : ""}
        </div>
      </div>

      <div className="cc-trio">
        {[
          { lab: "Sun", v: summary.sun },
          { lab: "Moon", v: summary.moon },
          { lab: "ASC", v: summary.asc },
        ].map(({ lab, v }) => (
          <div key={lab} className="cell">
            <span className="lab">{lab}</span>
            <span className="val">
              {v ? (
                <>
                  <span className={`g c-${v.element}`}>{v.glyph}</span>
                  <span className="num">{v.deg}°</span>
                </>
              ) : (
                <span className="num">—</span>
              )}
            </span>
          </div>
        ))}
      </div>

      {showTagRow && (
        <div className="cc-tags">
          {dominantChip && (
            <span className={`chip dom-${dominantChip}`}>{dominantChip}-dom</span>
          )}
          {chart.tags.map((t) => (
            <span key={t} className="chip">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
