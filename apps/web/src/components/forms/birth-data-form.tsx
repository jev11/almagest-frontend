import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCalculateChart, useAstroClient } from "@astro-app/astro-client";
import { HouseSystem, ZodiacType } from "@astro-app/shared-types";
import { useSettings } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { localTimeToUtc } from "@/lib/utils";
import { LocationSearch } from "./location-search";
import { DateTimePicker } from "./date-time-picker";

interface LocationValue {
  name: string;
  lat: number;
  lon: number;
  timezone: string;
}

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

const AYANAMSA_OPTIONS = [
  { value: "lahiri", label: "Lahiri" },
  { value: "raman", label: "Raman" },
  { value: "krishnamurti", label: "Krishnamurti" },
  { value: "fagan_bradley", label: "Fagan-Bradley" },
  { value: "djwhal_khul", label: "Djwhal Khul" },
];

const selectClass =
  "w-full bg-input border border-border rounded-lg px-3 py-3 text-sm text-foreground focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer min-h-[44px]";

const labelClass = "block text-xs text-muted-foreground mb-1.5 font-medium";

export function BirthDataForm() {
  const navigate = useNavigate();
  const settings = useSettings();
  const calculateChart = useCalculateChart();
  const client = useAstroClient();
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const user = useAuth((s) => s.user);

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("12:00");
  const [location, setLocation] = useState<LocationValue | null>(null);
  const [houseSystem, setHouseSystem] = useState<HouseSystem>(
    (settings.defaults.houseSystem as HouseSystem) ?? HouseSystem.Placidus,
  );
  const [zodiacType, setZodiacType] = useState<ZodiacType>(
    (settings.defaults.zodiacType as ZodiacType) ?? ZodiacType.Tropical,
  );
  const [ayanamsa, setAyanamsa] = useState<string>(
    settings.defaults.ayanamsa ?? "lahiri",
  );
  const [nodeType, setNodeType] = useState<"mean" | "true">(settings.defaults.nodeType);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!date) errs.date = "Date of birth is required";
    if (!time) errs.time = "Time of birth is required";
    if (!location) errs.location = "Birth location is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const utcDate = localTimeToUtc(date, time, location!.timezone);
    const chartName = name.trim() || "My Chart";

    try {
      const stored = await calculateChart.mutateAsync({
        name: chartName,
        location: location!.name,
        nodeType,
        request: {
          datetime: utcDate.toISOString(),
          latitude: location!.lat,
          longitude: location!.lon,
          house_system: houseSystem,
          zodiac_type: zodiacType,
          ...(zodiacType === ZodiacType.Sidereal ? { ayanamsa } : {}),
        },
      });

      // If authenticated, also persist to the cloud
      if (isAuthenticated()) {
        // Check free tier limit (5 charts)
        const isPremium = user?.tier === "premium";
        try {
          await client.saveCloudChart({
            name: chartName,
            birth_datetime: utcDate.toISOString(),
            latitude: location!.lat,
            longitude: location!.lon,
            house_system: houseSystem,
            chart_data: stored.chart,
          });
          toast.success("Chart calculated and saved to cloud");
        } catch (cloudErr: unknown) {
          const status =
            cloudErr instanceof Error && "status" in cloudErr
              ? (cloudErr as { status: number }).status
              : 0;
          if (status === 403 && !isPremium) {
            toast.warning("Chart saved locally — upgrade to Premium for unlimited cloud storage");
          } else {
            toast.success("Chart calculated (cloud sync failed — saved locally)");
          }
        }
      } else {
        toast.success("Chart calculated successfully");
      }

      navigate(`/chart/${stored.id}`);
    } catch {
      const msg = "Calculation failed. Is the API running?";
      setErrors({ submit: msg });
      toast.error(msg);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Name */}
      <div>
        <label className={labelClass}>Name (optional)</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Chart"
          className="w-full bg-input border border-border rounded-lg px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors min-h-[44px]"
        />
      </div>

      {/* Date of Birth */}
      <div>
        <label className={labelClass}>Date of Birth</label>
        <DateTimePicker
          date={date}
          time={time}
          onDateChange={(d) => { setDate(d); setErrors((e) => ({ ...e, date: "" })); }}
          onTimeChange={(t) => { setTime(t); setErrors((e) => ({ ...e, time: "" })); }}
        />
        {(errors.date || errors.time) && (
          <p className="mt-1 text-xs text-destructive">{errors.date || errors.time}</p>
        )}
      </div>

      {/* Birth Location */}
      <div>
        <label className={labelClass}>Birth Location</label>
        <LocationSearch
          value={location}
          onChange={(v) => { setLocation(v); setErrors((e) => ({ ...e, location: "" })); }}
        />
        {errors.location && (
          <p className="mt-1 text-xs text-destructive">{errors.location}</p>
        )}
      </div>

      {/* House System */}
      <div>
        <label className={labelClass}>House System</label>
        <div className="relative">
          <select
            value={houseSystem}
            onChange={(e) => setHouseSystem(e.target.value as HouseSystem)}
            className={selectClass}
          >
            {HOUSE_SYSTEMS.map((h) => (
              <option key={h.value} value={h.value}>{h.label}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">▼</div>
        </div>
      </div>

      {/* Zodiac Type */}
      <div>
        <label className={labelClass}>Zodiac Type</label>
        <div className="relative">
          <select
            value={zodiacType}
            onChange={(e) => setZodiacType(e.target.value as ZodiacType)}
            className={selectClass}
          >
            <option value={ZodiacType.Tropical}>Tropical</option>
            <option value={ZodiacType.Sidereal}>Sidereal</option>
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">▼</div>
        </div>
      </div>

      {/* Ayanamsa (sidereal only) */}
      {zodiacType === ZodiacType.Sidereal && (
        <div>
          <label className={labelClass}>Ayanamsa</label>
          <div className="relative">
            <select
              value={ayanamsa}
              onChange={(e) => setAyanamsa(e.target.value)}
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
            <label className={labelClass}>Lunar Node</label>
            <div className="relative">
              <select
                value={nodeType}
                onChange={(e) => setNodeType(e.target.value as "mean" | "true")}
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

      {errors.submit && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
          {errors.submit}
        </p>
      )}

      <button
        type="submit"
        disabled={calculateChart.isPending}
        className="w-full bg-primary hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg py-3 transition-colors mt-1 min-h-[44px]"
      >
        {calculateChart.isPending ? "Calculating..." : "Calculate Chart"}
      </button>
    </form>
  );
}
