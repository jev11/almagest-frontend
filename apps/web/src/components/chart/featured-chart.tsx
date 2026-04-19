import type { JSX } from "react";
import { Columns2 } from "lucide-react";
import type { UnifiedChart } from "@/lib/unified-chart";
import { MiniWheel, toMiniWheelProps } from "@/components/chart/mini-wheel";
import { getChartSummary, getDominantElement } from "@/lib/chart-summary";

interface FeaturedChartProps {
  chart: UnifiedChart;
  onOpen: (chart: UnifiedChart) => void;
  onCompare: () => void;
  onEdit: (chart: UnifiedChart) => void;
}

export function FeaturedChart({
  chart,
  onOpen,
  onCompare,
  onEdit,
}: FeaturedChartProps): JSX.Element {
  const eyebrow = chart.pinned
    ? "\u2605 Pinned \u00b7 Recently viewed"
    : chart.lastViewedAt
      ? "\u2605 Most recent"
      : "\u2605 Your library";

  const bd = chart.birthDatetime;
  const dateStr = new Date(bd).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const timeStr = new Date(bd).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });

  const summary = getChartSummary(chart.chart);
  const dominantArr = getDominantElement(chart.chart);
  const dominant = dominantArr.length > 0 ? dominantArr[0] : null;

  const trio = [
    { lab: "Sun", v: summary.sun },
    { lab: "Moon", v: summary.moon },
    { lab: "Ascending", v: summary.asc },
  ];

  return (
    <section className="featured">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="featured-name">{chart.name}</h1>
        <div className="featured-meta">
          <span className="mono">{dateStr}</span>
          <span className="c-dim">·</span>
          <span className="mono">{timeStr}</span>
          {chart.location && (
            <>
              <span className="c-dim">·</span>
              <span>{chart.location}</span>
            </>
          )}
          {dominant && (
            <span className={`chip dom-${dominant}`}>{dominant}-dominant</span>
          )}
        </div>
        <div className="featured-big-trio">
          {trio.map(({ lab, v }) => (
            <div key={lab} className="cell">
              <span className="lab">{lab}</span>
              {v ? (
                <>
                  <span className="val">
                    <span className={`g c-${v.element}`}>{v.glyph}</span>
                    {v.signName}
                  </span>
                  <span className="lab" style={{ color: "var(--fg-muted)" }}>
                    {v.deg}° {v.signName}
                  </span>
                </>
              ) : (
                <span className="val">—</span>
              )}
            </div>
          ))}
        </div>
        {chart.notes && <p className="featured-notes">{chart.notes}</p>}
        <div className="featured-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onOpen(chart)}
          >
            Open chart
          </button>
          <button type="button" className="btn" onClick={onCompare}>
            <Columns2 size={14} /> Compare
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onEdit(chart)}
          >
            Edit
          </button>
        </div>
      </div>
      <div className="featured-wheel">
        <MiniWheel
          {...toMiniWheelProps(chart.chart, { size: 360, variant: "featured" })}
        />
      </div>
    </section>
  );
}
