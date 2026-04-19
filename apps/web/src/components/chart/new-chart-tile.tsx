import type { JSX } from "react";

interface NewChartTileProps {
  atLimit: boolean;
  onClick: () => void;
}

export function NewChartTile({ atLimit, onClick }: NewChartTileProps): JSX.Element {
  return (
    <button className="cc-new" onClick={onClick} aria-label="Create new chart">
      <div className="cc-new-wheel" aria-hidden="true">
        <svg viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.6"
            strokeDasharray="2 3"
            opacity="0.5"
          />
          <circle
            cx="60"
            cy="60"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            opacity="0.35"
          />
          <circle
            cx="60"
            cy="60"
            r="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            opacity="0.25"
          />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = ((i * 30 - 90) * Math.PI) / 180;
            const x1 = 60 + Math.cos(a) * 40;
            const y1 = 60 + Math.sin(a) * 40;
            const x2 = 60 + Math.cos(a) * 54;
            const y2 = 60 + Math.sin(a) * 54;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                strokeWidth="0.4"
                opacity="0.35"
              />
            );
          })}
          <g stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.9">
            <line x1="60" y1="53" x2="60" y2="67" />
            <line x1="53" y1="60" x2="67" y2="60" />
          </g>
        </svg>
      </div>
      <div className="cc-new-copy">
        <div className="cc-new-title">
          New <em>chart</em>
        </div>
        <div className="cc-new-sub">
          {atLimit
            ? "Free tier reached — upgrade to add more"
            : "Cast a natal chart for anyone"}
        </div>
      </div>
      <div className="cc-new-kbd">
        <kbd>N</kbd>
      </div>
    </button>
  );
}
