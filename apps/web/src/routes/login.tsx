import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAstroClient } from "@astro-app/astro-client";
import { useAuth } from "@/hooks/use-auth";

const STARS = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  x: Math.round((Math.random() * 100) * 10) / 10,
  y: Math.round((Math.random() * 100) * 10) / 10,
  r: Math.round((Math.random() * 1.5 + 0.3) * 10) / 10,
  opacity: Math.round((Math.random() * 0.5 + 0.2) * 100) / 100,
  delay: Math.round(Math.random() * 4 * 10) / 10,
}));

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const client = useAstroClient();
  const setAuth = useAuth((s) => s.setAuth);
  const isAuthenticated = useAuth((s) => s.isAuthenticated);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  const from = (location.state as { from?: string } | null)?.from ?? "/";

  useEffect(() => {
    if (isAuthenticated()) navigate(from, { replace: true });
  }, []);

  function validate(): boolean {
    const errs: typeof errors = {};
    if (!email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email";
    if (!password) errs.password = "Password is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      const tokens = await client.login({ email: email.trim(), password });
      client.setTokens(tokens.access_token, tokens.refresh_token);
      const user = await client.getMe();
      setAuth(user, tokens);
      toast.success(`Welcome back, ${user.display_name}`);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const status = err instanceof Error && "status" in err
        ? (err as { status: number }).status
        : 0;
      if (status === 401 || status === 400) {
        setErrors({ form: "Invalid email or password" });
      } else {
        setErrors({ form: "Something went wrong. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      {/* Starfield backdrop */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      >
        {STARS.map((s) => (
          <circle
            key={s.id}
            cx={`${s.x}%`}
            cy={`${s.y}%`}
            r={s.r}
            fill="white"
            opacity={s.opacity}
            style={{
              animation: `twinkle ${2.5 + s.delay}s ease-in-out infinite alternate`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </svg>

      {/* Radial glow from center */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, color-mix(in srgb, var(--primary) 8%, transparent) 0%, transparent 70%)",
        }}
      />

      {/* Card */}
      <div className="relative w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
            style={{
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--primary) 30%, transparent) 0%, color-mix(in srgb, var(--primary) 5%, transparent) 100%)",
              border: "1px solid color-mix(in srgb, var(--primary) 30%, transparent)",
              boxShadow: "0 0 24px color-mix(in srgb, var(--primary) 20%, transparent)",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="3" style={{ fill: "var(--primary)" }} />
              <circle cx="12" cy="12" r="6" style={{ stroke: "var(--primary)" }} strokeWidth="0.75" strokeOpacity="0.5" />
              <circle cx="12" cy="12" r="10" style={{ stroke: "var(--primary)" }} strokeWidth="0.5" strokeOpacity="0.25" />
              <line x1="12" y1="2" x2="12" y2="22" style={{ stroke: "var(--primary)" }} strokeWidth="0.5" strokeOpacity="0.3" />
              <line x1="2" y1="12" x2="22" y2="12" style={{ stroke: "var(--primary)" }} strokeWidth="0.5" strokeOpacity="0.3" />
            </svg>
          </div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">Almagest</h1>
          <p className="text-muted-foreground text-sm mt-1">Sign in to your account</p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-card border border-border rounded-xl p-8 flex flex-col gap-5"
          style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}
        >
          {errors.form && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-sm text-destructive">
              {errors.form}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs text-muted-foreground font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={`w-full bg-input border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-dim-foreground focus:outline-none transition-colors min-h-[44px] ${
                errors.email
                  ? "border-destructive/40 focus:border-destructive"
                  : "border-border focus:border-primary"
              }`}
            />
            {errors.email && (
              <span className="text-xs text-destructive">{errors.email}</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs text-muted-foreground font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full bg-input border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-dim-foreground focus:outline-none transition-colors min-h-[44px] ${
                errors.password
                  ? "border-destructive/40 focus:border-destructive"
                  : "border-border focus:border-primary"
              }`}
            />
            {errors.password && (
              <span className="text-xs text-destructive">{errors.password}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg py-3 transition-colors min-h-[44px]"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <div className="text-center">
            <span className="text-dim-foreground text-sm">Don't have an account? </span>
            <Link
              to="/register"
              className="text-primary text-sm hover:text-primary-hover transition-colors"
            >
              Create one
            </Link>
          </div>
        </form>

        <p className="text-center text-xs text-dim-foreground mt-6">
          Forgot your password?{" "}
          <span className="text-muted-foreground/60">Password reset coming in a future release.</span>
        </p>
      </div>

      <style>{`
        @keyframes twinkle {
          from { opacity: var(--start-opacity, 0.3); }
          to { opacity: var(--end-opacity, 0.8); }
        }
      `}</style>
    </div>
  );
}
