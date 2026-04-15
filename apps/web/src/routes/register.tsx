import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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

export function RegisterPage() {
  const navigate = useNavigate();
  const client = useAstroClient();
  const setAuth = useAuth((s) => s.setAuth);
  const isAuthenticated = useAuth((s) => s.isAuthenticated);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    displayName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    form?: string;
  }>({});

  useEffect(() => {
    if (isAuthenticated()) navigate("/", { replace: true });
  }, []);

  function validate(): boolean {
    const errs: typeof errors = {};
    if (!displayName.trim()) errs.displayName = "Display name is required";
    if (!email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email";
    if (!password) errs.password = "Password is required";
    else if (password.length < 8) errs.password = "Password must be at least 8 characters";
    if (!confirmPassword) errs.confirmPassword = "Please confirm your password";
    else if (confirmPassword !== password) errs.confirmPassword = "Passwords don't match";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      const tokens = await client.register({
        email: email.trim(),
        password,
        display_name: displayName.trim(),
      });
      client.setTokens(tokens.access_token, tokens.refresh_token);
      const user = await client.getMe();
      setAuth(user, tokens);
      toast.success(`Welcome to Almagest, ${user.display_name}!`);
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const status = err instanceof Error && "status" in err
        ? (err as { status: number }).status
        : 0;
      if (status === 409) {
        setErrors({ email: "An account with this email already exists" });
      } else if (status === 400) {
        setErrors({ form: "Please check your details and try again." });
      } else {
        setErrors({ form: "Something went wrong. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12 relative overflow-hidden">
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

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, color-mix(in srgb, var(--primary) 8%, transparent) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-[400px]">
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
          <p className="text-muted-foreground text-sm mt-1">Create your account</p>
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
            <label htmlFor="displayName" className="text-xs text-muted-foreground font-medium">
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className={`w-full bg-input border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-dim-foreground focus:outline-none transition-colors min-h-[44px] ${
                errors.displayName
                  ? "border-destructive/40 focus:border-destructive"
                  : "border-border focus:border-primary"
              }`}
            />
            {errors.displayName && (
              <span className="text-xs text-destructive">{errors.displayName}</span>
            )}
          </div>

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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
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

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmPassword" className="text-xs text-muted-foreground font-medium">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full bg-input border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-dim-foreground focus:outline-none transition-colors min-h-[44px] ${
                errors.confirmPassword
                  ? "border-destructive/40 focus:border-destructive"
                  : "border-border focus:border-primary"
              }`}
            />
            {errors.confirmPassword && (
              <span className="text-xs text-destructive">{errors.confirmPassword}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg py-3 transition-colors min-h-[44px]"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>

          <div className="text-center">
            <span className="text-dim-foreground text-sm">Already have an account? </span>
            <Link
              to="/login"
              className="text-primary text-sm hover:text-primary-hover transition-colors"
            >
              Sign in
            </Link>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes twinkle {
          from { opacity: 0.3; }
          to { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
