import { useState, type JSX } from "react";
import { toast } from "sonner";
import type { UnifiedChart } from "@/lib/unified-chart";
import { exportChartsJSON, exportChartsPDF } from "@/lib/export-charts";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ExportFormat = "json" | "pdf";

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
        await exportChartsPDF(charts);
      }
      toast.success("Exported");
      onClose();
    } catch (err) {
      console.error("[export]", err);
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
              aria-checked={format === "pdf"}
              onClick={() => setFormat("pdf")}
              className={`flex flex-col items-start gap-0.5 px-4 py-3 rounded-lg border text-left transition-colors ${
                format === "pdf"
                  ? "border-primary bg-primary/5"
                  : "border-border bg-input hover:border-primary/50"
              }`}
            >
              <span className="text-sm font-medium text-foreground">
                PDF {count === 1 ? "(document)" : "(document zip)"}
              </span>
              <span className="text-xs text-muted-foreground">
                {count === 1
                  ? "Chart wheel + aspect grid on a clean white page"
                  : "Zip of PDFs — each with the wheel + aspect grid, white background"}
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
