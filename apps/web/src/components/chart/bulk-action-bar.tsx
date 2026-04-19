import type { JSX } from "react";
import { Columns2, Tag, Trash2, Upload, X } from "lucide-react";

interface BulkActionBarProps {
  count: number;
  compareReady: boolean;
  onClear: () => void;
  onCompare: () => void;
  onTag: () => void;
  onExport: () => void;
  onDelete: () => void;
}

export function BulkActionBar({
  count,
  compareReady,
  onClear,
  onCompare,
  onTag,
  onExport,
  onDelete,
}: BulkActionBarProps): JSX.Element {
  return (
    <div className="bulk-bar" data-open={count > 0}>
      <div className="count">
        <span className="num">{count}</span> selected
      </div>
      <div className="sep" />
      <button
        type="button"
        onClick={onCompare}
        className={compareReady ? "primary" : ""}
        disabled={!compareReady}
      >
        <Columns2 size={13} /> Compare
        {count !== 2 && (
          <span className="c-dim" style={{ marginLeft: 4, fontSize: 11 }}>
            (pick 2)
          </span>
        )}
      </button>
      <button type="button" onClick={onTag}>
        <Tag size={13} /> Tag
      </button>
      <button type="button" onClick={onExport}>
        <Upload size={13} /> Export
      </button>
      <button type="button" onClick={onDelete} className="danger">
        <Trash2 size={13} /> Delete
      </button>
      <div className="sep" />
      <button
        type="button"
        onClick={onClear}
        style={{ padding: "6px 8px" }}
        aria-label="Clear selection"
      >
        <X size={13} />
      </button>
    </div>
  );
}
