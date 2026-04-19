import { useLocation, useNavigate } from "react-router-dom";
import { Home, PlusCircle, Sun, RefreshCw, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Home", icon: Home, path: "/" },
  { label: "New", icon: PlusCircle, path: "/chart/new" },
  { label: "Charts", icon: Sun, path: "/charts" },
  { label: "Transits", icon: RefreshCw, path: "/transits" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

export function MobileTabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex tablet:hidden bg-card border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map(({ label, icon: Icon, path }) => {
        const isActive = path === "/"
          ? location.pathname === "/"
          : location.pathname.startsWith(path);

        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-2 text-xs transition-colors min-h-[56px]",
              isActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
