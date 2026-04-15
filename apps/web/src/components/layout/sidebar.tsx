import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Plus,
  Sun,
  RefreshCw,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAstroClient } from "@astro-app/astro-client";
import { useSidebar } from "@/hooks/use-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const TOP_NAV = [
  { label: "Home", icon: Home, path: "/" },
  { label: "New Chart", icon: Plus, path: "/chart/new" },
  { label: "My Charts", icon: Sun, path: "/charts" },
  { label: "Transits", icon: RefreshCw, path: "/transits" },
];

function NavButton({
  label,
  icon: Icon,
  path,
  isActive,
  collapsed,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  path: string;
  isActive: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const btn = (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-phi-2 rounded-lg text-sm transition-[background-color,color,transform] duration-160 ease-out active:scale-[0.97]",
        collapsed
          ? "w-[34px] h-[34px] justify-center"
          : "w-full h-[34px] px-phi-2 justify-start",
        isActive
          ? "bg-primary/10 text-primary border-l-2 border-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary border-l-2 border-transparent",
      )}
    >
      <Icon size={20} className="shrink-0" />
      {!collapsed && <span className="font-medium">{label}</span>}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip key={path}>
        <TooltipTrigger render={btn} />
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return btn;
}

export function Sidebar() {
  const { collapsed, toggle } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const clearAuth = useAuth((s) => s.clearAuth);
  const client = useAstroClient();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggle]);

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const initial = user?.display_name?.charAt(0).toUpperCase() ?? "?";
  const displayName = user?.display_name ?? "Guest";

  return (
    <aside
      onDoubleClick={toggle}
      className={cn(
        "hidden md:flex flex-col bg-background border-r border-border transition-all duration-200 ease-in-out shrink-0",
        collapsed ? "w-[89px]" : "w-[144px]",
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center p-phi-2 gap-phi-2",
          collapsed ? "justify-center py-phi-2 px-0" : "",
        )}
      >
        {!collapsed && (
          <span className="flex-1 font-semibold text-foreground text-[14px] leading-tight truncate font-display">Almagest</span>
        )}
        <button
          onClick={toggle}
          className="p-phi-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>

      {/* Top nav */}
      <nav className={cn("flex flex-col gap-phi-1 px-phi-2", collapsed && "items-center px-0 mx-auto")}>
        {TOP_NAV.map(({ label, icon, path }) => (
          <NavButton
            key={path}
            label={label}
            icon={icon}
            path={path}
            isActive={isActive(path)}
            collapsed={collapsed}
            onClick={() => navigate(path)}
          />
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User area */}
      <div className={cn("relative p-phi-2 border-t border-border", collapsed && "flex justify-center px-0")}>
        <DropdownMenu>
          <DropdownMenuTrigger
            nativeButton={false}
            render={
              <button
                className={cn(
                  "flex items-center gap-phi-2 rounded-lg transition-colors cursor-pointer",
                  collapsed ? "p-0" : "w-full py-1 hover:bg-secondary px-phi-2",
                )}
              >
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <span className="text-primary-foreground text-xs font-semibold">{initial}</span>
                </div>
                {!collapsed && (
                  <span className="text-foreground text-sm font-medium leading-none truncate">{displayName}</span>
                )}
              </button>
            }
          />
          <DropdownMenuContent side="top" align="start" className="w-56">
            {user && (
              <>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col">
                    <p className="text-sm text-foreground font-medium truncate">{user.display_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings size={16} />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={async () => {
                try { await client.logout(); } catch { /* ignore */ }
                clearAuth();
                toast.success("Signed out");
                navigate("/login");
              }}
            >
              <LogOut size={16} />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
