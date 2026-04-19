import type { JSX } from "react";
import { Plus } from "lucide-react";
import { MiniWheel } from "@/components/chart/mini-wheel";

interface EmptyStateProps {
  onNew: () => void;
}

const DEMO_POSITIONS: Array<[number, string]> = [
  [30, "\u2609"],
  [150, "\u263D"],
  [80, "\u263F"],
  [200, "\u2640"],
  [265, "\u2642"],
  [110, "\u2643"],
  [320, "\u2644"],
];

export function EmptyState({ onNew }: EmptyStateProps): JSX.Element {
  return (
    <section className="empty">
      <div className="empty-copy">
        <div className="eyebrow">★ Your library awaits</div>
        <h2>
          No charts <em>yet</em>.
        </h2>
        <p>
          Cast your first natal chart to begin. Save loved ones, public figures,
          clients — anyone you want to study under the sky you were born into.
        </p>
        <div className="empty-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onNew}
          >
            <Plus size={14} /> New Chart
          </button>
        </div>
      </div>
      <div className="empty-viz">
        <MiniWheel
          size={300}
          variant="featured"
          positions={DEMO_POSITIONS}
          ascDeg={20}
        />
      </div>
    </section>
  );
}
