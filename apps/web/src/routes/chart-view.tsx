import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bookmark, BookmarkCheck, Settings } from "lucide-react";
import { toast } from "sonner";
import { chartCache, useAstroClient } from "@astro-app/astro-client";
import { calculateApproximate } from "@astro-app/approx-engine";
import type { StoredChart } from "@astro-app/astro-client";
import { HouseSystem, ZodiacType } from "@astro-app/shared-types";
import type { ChartData } from "@astro-app/shared-types";
import { ChartCanvas } from "@/components/chart/chart-canvas";
import type { ChartInfo } from "@astro-app/chart-renderer";
import { formatTime } from "@/lib/format";
import { useSettings } from "@/hooks/use-settings";
import { useTimezone } from "@/hooks/use-timezone";
import { PlanetCard } from "@/components/home/planet-card";
import { AspectGrid } from "@/components/home/aspect-grid";
import { DistributionOverlay } from "@/components/chart/distribution-overlay";
import { ElementModalityCard } from "@/components/home/element-modality-card";
import { cn, localTimeToUtc } from "@/lib/utils";
import { LocationSearch } from "@/components/forms/location-search";
import { DateTimePicker } from "@/components/forms/date-time-picker";
import { ChartSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { ErrorCard } from "@/components/ui/error-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type Tab = "chart" | "transits";

const AYANAMSA_OPTIONS = [
  { value: "lahiri", label: "Lahiri" },
  { value: "raman", label: "Raman" },
  { value: "krishnamurti", label: "Krishnamurti" },
  { value: "fagan_bradley", label: "Fagan-Bradley" },
  { value: "djwhal_khul", label: "Djwhal Khul" },
];

const HOUSE_SYSTEMS: { value: HouseSystem; label: string }[] = [
  { value: HouseSystem.Placidus, label: "Placidus" },
  { value: HouseSystem.Koch, label: "Koch" },
  { value: HouseSystem.WholeSign, label: "Whole Sign" },
  { value: HouseSystem.Equal, label: "Equal" },
  { value: HouseSystem.Campanus, label: "Campanus" },
  { value: HouseSystem.Regiomontanus, label: "Regiomontanus" },
  { value: HouseSystem.Porphyry, label: "Porphyry" },
  { value: HouseSystem.Morinus, label: "Morinus" },
  { value: HouseSystem.Alcabitius, label: "Alcabitius" },
  { value: HouseSystem.Topocentric, label: "Topocentric" },
];

const selectClass =
  "w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer";

export function ChartViewPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const source = searchParams.get("source");
  const navigate = useNavigate();
  const client = useAstroClient();
  const timeFormat = useSettings((s) => s.appearance.timeFormat);
  const [stored, setStored] = useState<StoredChart | null>(null);
  const chartLat = stored?.request.latitude ?? 0;
  const chartLon = stored?.request.longitude ?? 0;
  const { iana: timezoneIana, display: timezoneDisplay } = useTimezone(chartLat, chartLon);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("chart");

  // Settings dialog state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingName, setPendingName] = useState("");
  const [pendingDate, setPendingDate] = useState("");
  const [pendingTime, setPendingTime] = useState("12:00");
  const [pendingLocation, setPendingLocation] = useState<{ name: string; lat: number; lon: number; timezone: string } | null>(null);
  const [pendingHouseSystem, setPendingHouseSystem] = useState<HouseSystem>(HouseSystem.Placidus);
  const [pendingZodiac, setPendingZodiac] = useState<ZodiacType>(ZodiacType.Tropical);
  const [pendingNodeType, setPendingNodeType] = useState<"mean" | "true">("mean");
  const [pendingAyanamsa, setPendingAyanamsa] = useState<string>("lahiri");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoadError(null);

    if (source === "cloud") {
      client.getCloudChart(id).then((cloud) => {
        const chartData = cloud.chart_data as ChartData;
        const stored: StoredChart = {
          id: cloud.id,
          name: cloud.name,
          chart: chartData,
          request: {
            datetime: cloud.birth_datetime,
            latitude: cloud.latitude,
            longitude: cloud.longitude,
            house_system: cloud.house_system as HouseSystem,
          },
          createdAt: new Date(cloud.created_at).getTime(),
          updatedAt: new Date(cloud.updated_at).getTime(),
        };
        setStored(stored);
        setLoading(false);
      }).catch(() => {
        setLoadError("Could not load cloud chart. Is the API running?");
        setLoading(false);
      });
    } else {
      chartCache.get(id).then((c) => {
        setStored(c ?? null);
        setLoading(false);
      });
    }
  }, [id, source, client]);

  // Sync pending settings from loaded chart — convert UTC to local time for display
  useEffect(() => {
    if (!stored) return;
    setPendingName(stored.name);
    // Format date/time in the chart's local timezone
    const dt = new Date(stored.request.datetime);
    const localDate = dt.toLocaleDateString("en-CA", { timeZone: timezoneIana }); // "YYYY-MM-DD"
    const localHour = dt.toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezoneIana });
    setPendingDate(localDate);
    setPendingTime(localHour);
    setPendingLocation({
      name: stored.location ?? `${stored.request.latitude.toFixed(2)}, ${stored.request.longitude.toFixed(2)}`,
      lat: stored.request.latitude,
      lon: stored.request.longitude,
      timezone: timezoneIana,
    });
    setPendingHouseSystem((stored.request.house_system as HouseSystem) ?? HouseSystem.Placidus);
    setPendingZodiac((stored.request.zodiac_type as ZodiacType) ?? ZodiacType.Tropical);
    setPendingNodeType(stored.nodeType ?? useSettings.getState().defaults.nodeType);
    setPendingAyanamsa(stored.request.ayanamsa ?? "lahiri");
  }, [stored, timezoneIana]);

  const currentSky = useMemo(() => {
    if (!stored) return null;
    try {
      return calculateApproximate(new Date(), 0, 0);
    } catch {
      return null;
    }
  }, [stored]);

  async function handleSave() {
    if (!stored) return;
    try {
      await chartCache.set(stored);
      setSaved(true);
      toast.success("Chart saved");
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error("Could not save chart");
    }
  }

  async function handleApplySettings() {
    if (!stored || !pendingLocation) return;
    setApplying(true);
    try {
      // If timezone is UTC, datetime is already UTC (no conversion needed)
      const utcDatetime = pendingLocation.timezone === "UTC"
        ? new Date(`${pendingDate}T${pendingTime}:00Z`)
        : localTimeToUtc(pendingDate, pendingTime, pendingLocation.timezone);

      const newRequest = {
        datetime: utcDatetime.toISOString(),
        latitude: pendingLocation.lat,
        longitude: pendingLocation.lon,
        house_system: pendingHouseSystem,
        zodiac_type: pendingZodiac,
        ...(pendingZodiac === ZodiacType.Sidereal ? { ayanamsa: pendingAyanamsa } : {}),
      };
      const res = await client.calculateNatal(newRequest);
      const updated: StoredChart = {
        ...stored,
        name: pendingName.trim() || stored.name,
        location: pendingLocation.name,
        chart: res,
        request: newRequest,
        nodeType: pendingNodeType,
        updatedAt: Date.now(),
      };
      await chartCache.set(updated);
      setStored(updated);
      setSettingsOpen(false);
      toast.success("Chart updated");
    } catch {
      toast.error("Could not recalculate chart. Is the API running?");
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex gap-phi-5 p-phi-5 h-full items-start">
        <div className="min-w-0" style={{ flex: "1.618" }}>
          <ChartSkeleton />
        </div>
        <div className="flex flex-col gap-phi-3" style={{ flex: "1" }}>
          <TableSkeleton rows={13} />
        </div>
      </div>
    );
  }

  if (!stored) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <ErrorCard
          message={loadError ?? "Chart not found."}
          onRetry={() => navigate("/charts")}
          retryLabel="Back to My Charts"
          variant="page"
          className="max-w-xs w-full"
        />
      </div>
    );
  }

  const { chart, name, request } = stored;
  const chartNodeType = stored.nodeType; // undefined falls back to global in components

  const chartInfo: ChartInfo = {
    location: stored.location,
    latitude: request.latitude,
    longitude: request.longitude,
    timezone: timezoneDisplay,
  };

  const dt = new Date(request.datetime);
  const datePart = dt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: timezoneIana,
  });
  const timePart = formatTime(dt, timeFormat, { timeZone: timezoneIana });
  const subtitle = `${datePart}, ${timePart}`;

  const tabs: { id: Tab; label: string }[] = [
    { id: "chart", label: "Chart" },
    { id: "transits", label: "Transits" },
  ];

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Top bar */}
        <div className="flex items-center gap-4 px-6 h-12 shrink-0 border-b border-border">
          <button
            type="button"
            className="w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <span className="text-foreground font-medium text-sm truncate">{name}</span>
            <span className="text-muted-foreground text-xs ml-2">{subtitle}</span>
          </div>
          <div className="flex items-center gap-1">
            {/* Tabs in top bar */}
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={cn(
                  "px-3 py-1 text-sm font-medium rounded-md transition-colors",
                  activeTab === tab.id
                    ? "text-foreground bg-secondary"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
            <button
              type="button"
              title="Chart settings"
              className="w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings size={18} />
            </button>
            <button
              type="button"
              title={saved ? "Saved" : "Save chart"}
              className={cn(
                "w-11 h-11 flex items-center justify-center transition-colors",
                saved ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
              onClick={handleSave}
            >
              {saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
            </button>
          </div>
        </div>

        {/* Content: golden ratio layout matching home screen */}
        <div className="flex gap-phi-5 flex-1 min-h-0 overflow-y-auto p-phi-5 items-start">
          {/* Left column — chart + aspect grid */}
          <div className="flex flex-col gap-phi-4 min-w-0" style={{ flex: "1.618" }}>
            <div
              className="relative w-full aspect-square rounded-lg overflow-hidden bg-card border border-border"
              style={{ containerType: "inline-size" }}
            >
              {activeTab === "transits" && currentSky ? (
                <ChartCanvas data={chart} outerData={currentSky} chartInfo={chartInfo} nodeType={chartNodeType} className="w-full h-full" />
              ) : (
                <ChartCanvas data={chart} chartInfo={chartInfo} nodeType={chartNodeType} className="w-full h-full" />
              )}
              <DistributionOverlay chartData={chart} />
            </div>
            <AspectGrid chartData={chart} nodeType={chartNodeType} />
          </div>

          {/* Right column — planet card */}
          <div className="flex flex-col gap-phi-4" style={{ flex: "1" }}>
            <PlanetCard chartData={chart} nodeType={chartNodeType} />
            <ElementModalityCard chartData={chart} />
          </div>
        </div>
      </div>

      {/* Settings dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Chart</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-medium">Name</label>
              <input
                type="text"
                value={pendingName}
                onChange={(e) => setPendingName(e.target.value)}
                className={`${selectClass} cursor-text`}
              />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-medium">Date &amp; Time</label>
              <DateTimePicker
                date={pendingDate}
                time={pendingTime}
                onDateChange={setPendingDate}
                onTimeChange={setPendingTime}
              />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-medium">Location</label>
              <LocationSearch
                value={pendingLocation}
                onChange={setPendingLocation}
              />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-medium">House System</label>
              <div className="relative">
                <select
                  value={pendingHouseSystem}
                  onChange={(e) => setPendingHouseSystem(e.target.value as HouseSystem)}
                  className={selectClass}
                >
                  {HOUSE_SYSTEMS.map((h) => (
                    <option key={h.value} value={h.value}>{h.label}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">▼</div>
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-medium">Zodiac Type</label>
              <div className="relative">
                <select
                  value={pendingZodiac}
                  onChange={(e) => setPendingZodiac(e.target.value as ZodiacType)}
                  className={selectClass}
                >
                  <option value={ZodiacType.Tropical}>Tropical</option>
                  <option value={ZodiacType.Sidereal}>Sidereal</option>
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">▼</div>
              </div>
            </div>

            {/* Ayanamsa (sidereal only) */}
            {pendingZodiac === ZodiacType.Sidereal && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5 font-medium">Ayanamsa</label>
                <div className="relative">
                  <select
                    value={pendingAyanamsa}
                    onChange={(e) => setPendingAyanamsa(e.target.value)}
                    className={selectClass}
                  >
                    {AYANAMSA_OPTIONS.map((a) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">▼</div>
                </div>
              </div>
            )}

            {/* Advanced settings */}
            <button
              type="button"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowAdvanced((v) => !v)}
            >
              <span className={`text-xs transition-transform ${showAdvanced ? "rotate-90" : ""}`}>▶</span>
              Advanced settings
            </button>
            {showAdvanced && (
              <div className="flex flex-col gap-4 pl-4 border-l-2 border-border">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5 font-medium">Lunar Node</label>
                  <div className="relative">
                    <select
                      value={pendingNodeType}
                      onChange={(e) => setPendingNodeType(e.target.value as "mean" | "true")}
                      className={selectClass}
                    >
                      <option value="mean">Mean Node</option>
                      <option value="true">True Node</option>
                    </select>
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">▼</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplySettings}
              disabled={applying || !pendingLocation}
              className="px-4 py-2 text-sm bg-primary hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {applying ? "Recalculating…" : "Apply & Recalculate"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
