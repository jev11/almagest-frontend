import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AstroClientProvider, useAstroClient } from "@astro-app/astro-client";
import type { TokenPair } from "@astro-app/astro-client";
import { AppLayout } from "@/components/layout/app-layout";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { HomePage } from "@/routes/home";
const ChartNewPage = lazy(() => import("@/routes/chart-new").then((m) => ({ default: m.ChartNewPage })));
const ChartViewPage = lazy(() => import("@/routes/chart-view").then((m) => ({ default: m.ChartViewPage })));
const ChartsPage = lazy(() => import("@/routes/charts").then((m) => ({ default: m.ChartsPage })));
const TransitsPage = lazy(() => import("@/routes/transits").then((m) => ({ default: m.TransitsPage })));
const SettingsPage = lazy(() => import("@/routes/settings").then((m) => ({ default: m.SettingsPage })));
const LoginPage = lazy(() => import("@/routes/login").then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("@/routes/register").then((m) => ({ default: m.RegisterPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function ThemeSync() {
  const theme = useSettings((s) => s.appearance.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else if (theme === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
      root.classList.toggle("light", !prefersDark);
    }
  }, [theme]);

  return null;
}

/**
 * Syncs persisted auth tokens from the Zustand store into the AstroClient on mount.
 * Must render inside AstroClientProvider.
 */
function AuthSync() {
  const client = useAstroClient();
  const accessToken = useAuth((s) => s.accessToken);
  const refreshToken = useAuth((s) => s.refreshToken);

  useEffect(() => {
    client.setTokens(accessToken, refreshToken);
  // Only run once on mount — subsequent token changes are applied directly in auth flows
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function AppProviders({ children }: { children: React.ReactNode }) {
  const updateTokens = useAuth((s) => s.updateTokens);
  const clearAuth = useAuth((s) => s.clearAuth);

  function handleTokenRefreshed(tokens: TokenPair) {
    updateTokens(tokens);
  }

  function handleAuthExpired() {
    clearAuth();
  }

  return (
    <>
      <ThemeSync />
      <AstroClientProvider
        baseUrl={(import.meta.env["VITE_API_URL"] as string | undefined) ?? "http://localhost:8000"}
        onTokenRefreshed={handleTokenRefreshed}
        onAuthExpired={handleAuthExpired}
      >
        <AuthSync />
        {children}
      </AstroClientProvider>
    </>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProviders>
        <BrowserRouter>
          <Suspense fallback={null}>
            <Routes>
              {/* Public auth routes — full-page, no sidebar */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* App shell */}
              <Route element={<AppLayout />}>
                <Route path="/" element={<ErrorBoundary><HomePage /></ErrorBoundary>} />
                <Route path="/chart/new" element={<ErrorBoundary><ChartNewPage /></ErrorBoundary>} />
                <Route path="/chart/:id" element={<ErrorBoundary><ChartViewPage /></ErrorBoundary>} />
                <Route path="/charts" element={<ErrorBoundary><ChartsPage /></ErrorBoundary>} />
                <Route path="/transits" element={<ErrorBoundary><TransitsPage /></ErrorBoundary>} />
                <Route path="/settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster />
      </AppProviders>
    </QueryClientProvider>
  );
}
