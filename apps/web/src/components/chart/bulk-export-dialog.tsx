import { useState, type JSX } from "react";
import { toast } from "sonner";
import type { UnifiedChart } from "@/lib/unified-chart";
import { exportChartsJSON, exportChartsPNG } from "@/lib/export-charts";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ExportFormat = "json" | "png";

interface BulkExportDialogProps {
  charts: UnifiedChart[];
  open: boolean;
  onClose: () => void;
}

export function BulkExportDialog({
  charts,
  open,
  onClose,
}: BulkExportDialogProps): JSX.Element {
  const [format, setFormat] = useState<ExportFormat>("json");
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      if (format === "json") {
        await exportChartsJSON(charts);
      } else {
        await exportChartsPNG(charts);
      }
      toast.success("Exported");
      onClose();
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  function handleClose() {
    if (exporting) return;
    setFormat("json");
    onClose();
  }

  const count = charts.length;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
      }}
    >
      <DialogContent className="bg-card border-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle>Export charts</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Export format">
            <button
              type="button"
              role="radio"
              aria-checked={format === "json"}
              onClick={() => setFormat("json")}
              className={`flex flex-col items-start gap-0.5 px-4 py-3 rounded-lg border text-left transition-colors ${
                format === "json"
                  ? "border-primary bg-primary/5"
                  : "border-border bg-input hover:border-primary/50"
              }`}
            >
              <span className="text-sm font-medium text-foreground">JSON</span>
              <span className="text-xs text-muted-foreground">
                {count === 1
                  ? "Single .json file with chart data"
                  : "Zip of .json files — one per chart"}
              </span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={format === "png"}
              onClick={() => setFormat("png")}
              className={`flex flex-col items-start gap-0.5 px-4 py-3 rounded-lg border text-left transition-colors ${
                format === "png"
                  ? "border-primary bg-primary/5"
                  : "border-border bg-input hover:border-primary/50"
              }`}
            >
              <span className="text-sm font-medium text-foreground">
                PNG {count === 1 ? "(image)" : "(image zip)"}
              </span>
              <span className="text-xs text-muted-foreground">
                {count === 1
                  ? "Rendered chart wheel as a PNG image"
                  : "Zip of rendered chart wheels — one PNG per chart"}
              </span>
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Exporting {count} chart{count !== 1 ? "s" : ""}
          </p>
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={handleClose}
            disabled={exporting}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || count === 0}
            className="px-4 py-2 text-sm bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
          >
            {exporting ? "Exporting…" : "Export"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
