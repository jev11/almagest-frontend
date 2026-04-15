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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
        <Label htmlFor="chart-name" className="text-xs text-muted-foreground mb-1.5 font-medium">
          Name (optional)
        </Label>
        <Input
          id="chart-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Chart"
          className="min-h-[44px]"
        />
      </div>

      {/* Date of Birth */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 font-medium">Date of Birth</Label>
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
        <Label className="text-xs text-muted-foreground mb-1.5 font-medium">Birth Location</Label>
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
        <Label className="text-xs text-muted-foreground mb-1.5 font-medium">House System</Label>
        <Select
          value={houseSystem}
          onValueChange={(v) => { if (v) setHouseSystem(v as HouseSystem); }}
        >
          <SelectTrigger className="min-h-[44px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HOUSE_SYSTEMS.map((h) => (
              <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Zodiac Type */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 font-medium">Zodiac Type</Label>
        <Select
          value={zodiacType}
          onValueChange={(v) => { if (v) setZodiacType(v as ZodiacType); }}
        >
          <SelectTrigger className="min-h-[44px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ZodiacType.Tropical}>Tropical</SelectItem>
            <SelectItem value={ZodiacType.Sidereal}>Sidereal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Ayanamsa (sidereal only) */}
      {zodiacType === ZodiacType.Sidereal && (
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 font-medium">Ayanamsa</Label>
          <Select
            value={ayanamsa}
            onValueChange={(v) => { if (v) setAyanamsa(v); }}
          >
            <SelectTrigger className="min-h-[44px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AYANAMSA_OPTIONS.map((a) => (
                <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            <Label className="text-xs text-muted-foreground mb-1.5 font-medium">Lunar Node</Label>
            <Select
              value={nodeType}
              onValueChange={(v) => { if (v) setNodeType(v as "mean" | "true"); }}
            >
              <SelectTrigger className="min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mean">Mean Node</SelectItem>
                <SelectItem value="true">True Node</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {errors.submit && (
        <Alert variant="destructive">
          <AlertDescription>{errors.submit}</AlertDescription>
        </Alert>
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
