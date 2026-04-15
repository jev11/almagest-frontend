# shadcn/ui Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ad-hoc custom components in `apps/web` with shadcn/ui primitives across forms, layout, and home/chart cards while keeping shadcn defaults (no token mapping).

**Architecture:** Five sequential PRs. PR 1 installs the full primitive set with no app code changes (foundation). PRs 2-5 each migrate one surface (forms, layout, card wrappers, interactive bits inside cards). Domain visualizations (chart canvas, wheel, aspect grid, timeline) are out of scope.

**Tech Stack:** shadcn/ui CLI (`npx shadcn@latest`), `@base-ui/react`, Tailwind CSS v4, components.json `style: "base-nova"`.

**Reference spec:** `docs/superpowers/specs/2026-04-15-shadcn-migration-design.md`
**Skipped primitives:** `docs/ui-migration-skipped.md`

**Working directory for all CLI commands:** `apps/web/` (unless otherwise stated).

**Note on TDD:** the affected components have no existing unit tests, and shadcn primitives are vendored from a registry rather than written from scratch. This plan uses **build / typecheck / manual visual verification** as the gate. Where pure logic could be unit-tested (none in this plan), TDD would apply. Do not fabricate tests for UI presentation changes.

**Per-task workflow (every task ends with this):**
1. `npm run typecheck --workspace=apps/web` — must pass
2. `npm run build --workspace=apps/web` — must succeed
3. Manual visual check (for migration tasks) — start dev server, exercise the surface
4. Update `AGENT_CHANGELOG.md` with a one-section entry
5. Update `PHASE3_TASK_CHECKLIST.md` if a relevant item exists
6. Commit referencing the PR/task

---

## PR 1 — Foundation: install primitives

### Task 1.1: Verify shadcn registry coverage of the primitive set

**Files:** none modified. Discovery only.

- [ ] **Step 1: List `@shadcn` registry items via MCP**

Use the shadcn MCP:
```
mcp__shadcn__list_items_in_registries({ registries: ["@shadcn"] })
```
Confirm these primitives are present:
`card`, `input`, `label`, `select`, `dropdown-menu`, `popover`, `separator`, `badge`, `collapsible`, `progress`, `alert`, `alert-dialog`, `avatar`.

- [ ] **Step 2: Note any missing primitives**

If any from the list above are missing under `style: "base-nova"`, record them. They will fall back to the default style during install (per spec PR 1 step 3). MCP unavailable? Fall back to `npx shadcn@latest view @shadcn` from `apps/web/`.

- [ ] **Step 3: No commit**

Discovery task only. Continue to Task 1.2.

---

### Task 1.2: Smoke-test install with `card`

**Files:**
- Create: `apps/web/src/components/ui/card.tsx` (via CLI)

- [ ] **Step 1: Install card**

Run from `apps/web/`:
```bash
npx shadcn@latest add card
```
Expected: file `src/components/ui/card.tsx` created. No prompts beyond confirm-overwrite (which there shouldn't be).

- [ ] **Step 2: Typecheck**

Run from repo root:
```bash
npm run typecheck --workspace=apps/web
```
Expected: no errors.

- [ ] **Step 3: Build**

```bash
npm run build --workspace=apps/web
```
Expected: build succeeds, `dist/` produced.

- [ ] **Step 4: Update changelog**

Append to `AGENT_CHANGELOG.md` under a new top-level section dated today (`## YYYY-MM-DD — shadcn migration PR 1: foundation install`):
- list created file
- note registry style used and whether `base-nova` resolved cleanly

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/card.tsx AGENT_CHANGELOG.md
git commit -m "feat(ui): add shadcn card primitive (PR1 smoke-test)"
```

---

### Task 1.3: Bulk-install remaining primitives

**Files:**
- Create: 12 files in `apps/web/src/components/ui/` (one per primitive)

- [ ] **Step 1: Install in one batch**

Run from `apps/web/`:
```bash
npx shadcn@latest add input label select dropdown-menu popover separator badge collapsible progress alert alert-dialog avatar
```
Expected: 12 new files in `src/components/ui/`.

If any primitive errors out (missing in `base-nova`), install it individually with the default style fallback by passing the explicit URL from the registry. Document the fallback in the commit message.

- [ ] **Step 2: List the new files**

```bash
ls apps/web/src/components/ui/
```
Confirm: button, dialog, error-boundary, error-card, skeleton, sonner, switch, tooltip *(pre-existing)*, plus card, input, label, select, dropdown-menu, popover, separator, badge, collapsible, progress, alert, alert-dialog, avatar *(new)*.

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck --workspace=apps/web
```
Expected: no errors. (shadcn primitives are self-contained — they may pull in `@radix-ui/*` or `@base-ui/react` peer deps; the CLI installs those automatically.)

- [ ] **Step 4: Build**

```bash
npm run build --workspace=apps/web
```
Expected: build succeeds.

- [ ] **Step 5: Update changelog**

Append a sub-section under PR 1 listing all 12 newly added primitives.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/ui/ apps/web/package.json apps/web/package-lock.json AGENT_CHANGELOG.md
git commit -m "feat(ui): add remaining shadcn primitives (PR1 foundation)"
```

> **End of PR 1.** Open a PR for the foundation. PR 2 begins after merge (or in same branch if working serially).

---

## PR 2 — Forms surface

### Task 2.1: Migrate `birth-data-form` selects to `Select`

**Files:**
- Modify: `apps/web/src/components/forms/birth-data-form.tsx`

The form has 4 native `<select>` elements wrapped in a `relative` div with a custom ▼ chevron, plus a shared `selectClass` constant.

- [ ] **Step 1: Add Select import**

At the top of `birth-data-form.tsx`:
```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
```

- [ ] **Step 2: Replace house system select**

Replace the entire House System block (the `<div>` containing the native `<select>` with `HOUSE_SYSTEMS.map`) with:
```tsx
<div>
  <label className={labelClass}>House System</label>
  <Select
    value={houseSystem}
    onValueChange={(v) => setHouseSystem(v as HouseSystem)}
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
```

- [ ] **Step 3: Replace zodiac type select**

Same pattern, `value`/`onValueChange` → `setZodiacType`. Two `SelectItem`s for Tropical/Sidereal.

- [ ] **Step 4: Replace ayanamsa select (sidereal-only)**

Wrap with the existing `{zodiacType === ZodiacType.Sidereal && (...)}` conditional. Map over `AYANAMSA_OPTIONS`.

- [ ] **Step 5: Replace lunar node select (advanced)**

Inside the `{showAdvanced && ...}` block. Two `SelectItem`s for `mean`/`true`.

- [ ] **Step 6: Remove `selectClass` constant**

Delete the `selectClass = "..."` constant near the top of the file. It's now unused. Confirm with a search for `selectClass` — should only appear in deleted lines.

- [ ] **Step 7: Typecheck + build**

```bash
npm run typecheck --workspace=apps/web && npm run build --workspace=apps/web
```

- [ ] **Step 8: Visual check**

```bash
npm run dev --workspace=apps/web
```
Visit `/chart/new`. For each select: open it, pick a value, submit form, confirm correct value reaches the API call. Specifically test the sidereal flow (toggling Zodiac to Sidereal makes Ayanamsa appear).

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/components/forms/birth-data-form.tsx
git commit -m "refactor(forms): migrate birth-data-form selects to shadcn Select (PR2)"
```

---

### Task 2.2: Migrate `birth-data-form` text input + labels to `Input` and `Label`

**Files:**
- Modify: `apps/web/src/components/forms/birth-data-form.tsx`

- [ ] **Step 1: Import primitives**

```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
```

- [ ] **Step 2: Replace name field**

Replace the Name block:
```tsx
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
```

- [ ] **Step 3: Replace all other `<label className={labelClass}>...</label>` with `<Label className="text-xs text-muted-foreground mb-1.5 font-medium">...</Label>`**

Apply to: Date of Birth, Birth Location, House System, Zodiac Type, Ayanamsa, Lunar Node. Use `htmlFor` where the wrapped control has a sensible id; otherwise omit (selects/custom controls don't take htmlFor cleanly).

- [ ] **Step 4: Remove `labelClass` constant**

Delete `const labelClass = "..."`. Search to confirm no remaining references.

- [ ] **Step 5: Replace error-submit block with `Alert`**

Add import:
```tsx
import { Alert, AlertDescription } from "@/components/ui/alert";
```
Replace the `errors.submit` block:
```tsx
{errors.submit && (
  <Alert variant="destructive">
    <AlertDescription>{errors.submit}</AlertDescription>
  </Alert>
)}
```

- [ ] **Step 6: Typecheck + build**

```bash
npm run typecheck --workspace=apps/web && npm run build --workspace=apps/web
```

- [ ] **Step 7: Visual check**

`/chart/new`. Confirm: name input still typeable; labels render with consistent style; submitting with no API server triggers the destructive Alert.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/forms/birth-data-form.tsx
git commit -m "refactor(forms): migrate birth-data-form inputs/labels/alert to shadcn (PR2)"
```

---

### Task 2.3: Migrate `date-time-picker` inputs to `Input`

**Files:**
- Modify: `apps/web/src/components/forms/date-time-picker.tsx`

The picker uses two manually-styled `<input>` with a shared `inputClass` constant. The error-state border is conditional via `cn(inputClass, dateError && "border-destructive")`.

- [ ] **Step 1: Import Input**

```tsx
import { Input } from "@/components/ui/input";
```

- [ ] **Step 2: Replace date `<input>` with `<Input>`**

```tsx
<Input
  type="text"
  value={dateText}
  onChange={(e) => { /* keep existing handler body */ }}
  onBlur={handleDateBlur}
  placeholder="DD/MM/YYYY"
  maxLength={10}
  className={cn("min-h-[44px] [color-scheme:dark]", dateError && "border-destructive")}
  style={{ flex: "1 1 0" }}
/>
```
Keep the `onChange` body identical (auto-slash insertion logic).

- [ ] **Step 3: Replace time `<input>` with `<Input>` analogously**

Keep colon-insertion handler. `style={{ flex: "0 0 120px" }}`.

- [ ] **Step 4: Remove `inputClass` constant**

Delete the multi-line `inputClass = "..."` block. Confirm no remaining references.

- [ ] **Step 5: Typecheck + build**

```bash
npm run typecheck --workspace=apps/web && npm run build --workspace=apps/web
```

- [ ] **Step 6: Visual check**

`/chart/new`. Type a date in DD/MM/YYYY — slash auto-inserts. Type an invalid date (e.g. 32/13/2020) and tab out — destructive border appears + error text. Repeat for time field. Toggle 12h/24h format in settings — placeholder updates.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/forms/date-time-picker.tsx
git commit -m "refactor(forms): migrate date-time-picker inputs to shadcn Input (PR2)"
```

---

### Task 2.4: Migrate `location-search` to `Input` + `Popover`

**Files:**
- Modify: `apps/web/src/components/forms/location-search.tsx`

Currently uses a manual `containerRef` + outside-click `useEffect`. Replace with `Popover` and remove the outside-click handler.

- [ ] **Step 1: Import primitives**

```tsx
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
```

- [ ] **Step 2: Restructure JSX with Popover**

Replace the entire `return (...)` body:
```tsx
return (
  <div className={cn("relative", className)}>
    <Popover open={open && results.length > 0} onOpenChange={setOpen}>
      <PopoverAnchor>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
          <Input
            type="text"
            value={query}
            onChange={handleInput}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Search city..."
            className="pl-9 min-h-[44px]"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="p-0 w-[var(--radix-popover-trigger-width)]"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ul>
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                className="w-full text-left px-3 py-3 text-sm text-foreground hover:bg-border transition-colors truncate min-h-[44px]"
                onClick={() => handleSelect(r)}
              >
                {r.displayName}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>

    {searchError && (
      <p className="mt-1.5 text-xs text-destructive">Location search unavailable. Try again.</p>
    )}
    {value && (
      <p className="mt-1.5 text-xs text-primary">
        {value.lat.toFixed(4)}°{value.lat >= 0 ? "N" : "S"},{" "}
        {Math.abs(value.lon).toFixed(4)}°{value.lon >= 0 ? "E" : "W"} · {formatTimezoneDisplay(value.timezone)}
      </p>
    )}
  </div>
);
```

> Note: if your `popover` primitive is the `@base-ui/react` flavor (not Radix), the trigger-width CSS var name differs. Use `--base-ui-popover-anchor-width` or whatever the installed primitive exposes; check the primitive's source in `src/components/ui/popover.tsx`.

- [ ] **Step 3: Remove outside-click effect and containerRef**

Delete:
- The `containerRef` `useRef` declaration
- The `useEffect` block with `mousedown` listener
- The `ref={containerRef}` on the outer `<div>`

`Popover` handles outside-click and escape natively.

- [ ] **Step 4: Typecheck + build**

```bash
npm run typecheck --workspace=apps/web && npm run build --workspace=apps/web
```

- [ ] **Step 5: Visual check**

`/chart/new`. Type 3+ chars → results appear in popover. Click a result → input shows city, popover closes, coordinates + timezone line appears below. Click outside → popover closes. Press Escape while popover open → closes.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/forms/location-search.tsx
git commit -m "refactor(forms): migrate location-search to shadcn Input + Popover (PR2)"
```

---

### Task 2.5: PR 2 close-out

- [ ] **Step 1: Update changelog**

Append to `AGENT_CHANGELOG.md` under `## YYYY-MM-DD — shadcn migration PR 2: forms surface`:
- list 3 modified files (birth-data-form, date-time-picker, location-search)
- note primitives now used (Select, Input, Label, Alert, Popover)
- note removed: `selectClass`, `labelClass`, `inputClass` constants; manual outside-click effect

- [ ] **Step 2: Update PHASE3_TASK_CHECKLIST.md**

Add (or check off) a line: "shadcn migration PR 2: forms surface".

- [ ] **Step 3: Commit changelog**

```bash
git add AGENT_CHANGELOG.md PHASE3_TASK_CHECKLIST.md
git commit -m "docs: changelog for shadcn migration PR 2 (forms)"
```

> **End of PR 2.**

---

## PR 3 — Layout surface

### Task 3.1: Migrate sidebar `UserMenu` to `DropdownMenu`

**Files:**
- Modify: `apps/web/src/components/layout/sidebar.tsx`

Currently `UserMenu` is a separate inner component with its own outside-click + escape effects.

- [ ] **Step 1: Import DropdownMenu**

At the top of `sidebar.tsx`:
```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
```

- [ ] **Step 2: Delete the `UserMenu` function entirely**

Remove the whole `function UserMenu({ onClose }: { onClose: () => void }) { ... }` block including its imports of `useEffect`, `useRef` if no longer used elsewhere in the file (verify with a grep before removing).

Also remove from `Sidebar`:
- `const [menuOpen, setMenuOpen] = useState(false);`
- `{menuOpen && <UserMenu onClose={() => setMenuOpen(false)} />}`

- [ ] **Step 3: Replace user button with `DropdownMenu`**

Replace the user area `<button>...</button>` (the one with the avatar circle + name) with:
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
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
  </DropdownMenuTrigger>
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
```

Make sure `useAstroClient`, `useAuth`, `toast`, `Settings`, `LogOut`, `navigate` are still imported in `Sidebar` scope (they were previously used inside `UserMenu`).

- [ ] **Step 4: Remove unused imports**

If `useEffect` and `useRef` were only used by the deleted `UserMenu`, remove them from the top-of-file React import. Also remove `menuRef` references.

- [ ] **Step 5: Typecheck + build**

```bash
npm run typecheck --workspace=apps/web && npm run build --workspace=apps/web
```

- [ ] **Step 6: Visual check**

`npm run dev --workspace=apps/web`. Sign in. In the sidebar, click user avatar → menu opens above. Click outside → closes. Press Escape → closes. Click Settings → navigates. Click Sign out → toast + redirect.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/layout/sidebar.tsx
git commit -m "refactor(layout): migrate sidebar UserMenu to shadcn DropdownMenu (PR3)"
```

---

### Task 3.2: Migrate sidebar user circle to `Avatar`

**Files:**
- Modify: `apps/web/src/components/layout/sidebar.tsx`

- [ ] **Step 1: Import Avatar**

```tsx
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
```

- [ ] **Step 2: Replace the user initial circle**

In the `DropdownMenuTrigger` button body (added in Task 3.1), replace:
```tsx
<div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
  <span className="text-primary-foreground text-xs font-semibold">{initial}</span>
</div>
```
with:
```tsx
<Avatar className="w-8 h-8 shrink-0">
  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
    {initial}
  </AvatarFallback>
</Avatar>
```

- [ ] **Step 3: Typecheck + build + visual check**

Same commands. Confirm avatar still shows the user initial with same size and color.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/layout/sidebar.tsx
git commit -m "refactor(layout): use shadcn Avatar for sidebar user circle (PR3)"
```

---

### Task 3.3: PR 3 close-out

- [ ] **Step 1: Update changelog**

Append `## YYYY-MM-DD — shadcn migration PR 3: layout surface`:
- modified: `sidebar.tsx`
- added: DropdownMenu, Avatar usage
- removed: inline `UserMenu` component, manual outside-click + escape effects

- [ ] **Step 2: Commit**

```bash
git add AGENT_CHANGELOG.md
git commit -m "docs: changelog for shadcn migration PR 3 (layout)"
```

> **End of PR 3.**

---

## PR 4 — Card wrappers

Goal: replace the ad-hoc `bg-card border border-border rounded-lg p-phi-N` wrapper on every home/chart card with `<Card>` / `<CardContent>`. Internals (tables, SVG, glyph rendering) untouched.

For each task in this PR, the structural change is the same:

**Pattern:**
```tsx
// before
<div className="bg-card border border-border rounded-lg p-phi-4 card-hover">
  ...children
</div>

// after
<Card className="card-hover">
  <CardContent className="p-phi-4">
    ...children
  </CardContent>
</Card>
```

**Verify after every task:** the card renders with the same outer dimensions, padding, hover transition, and visual border. shadcn `Card` defaults will likely supply background + border that match `bg-card` / `border-border`; if there's a clash, override with `className`.

### Task 4.1: Wrap `moon-card` with `Card`

**Files:**
- Modify: `apps/web/src/components/home/moon-card.tsx`

Note: `moon-card` uses `card-moon` (a custom class) not `bg-card` directly. Check `apps/web/src/index.css` or globals for the `.card-moon` definition. Preserve any custom moon-specific styling by passing `className="card-moon card-hover animate-fade-in"` on `<Card>`.

- [ ] **Step 1: Import Card**

```tsx
import { Card, CardContent } from "@/components/ui/card";
```

- [ ] **Step 2: Replace outer wrapper**

Change the `<div className="card-moon p-phi-4 card-hover animate-fade-in">` to:
```tsx
<Card className="card-moon card-hover animate-fade-in">
  <CardContent className="p-phi-4">
    ... existing flex children unchanged ...
  </CardContent>
</Card>
```

- [ ] **Step 3: Typecheck + build + visual check**

Visit `/`. Confirm moon card renders identically — same bg, border, padding, hover.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/home/moon-card.tsx
git commit -m "refactor(home): wrap moon-card with shadcn Card (PR4)"
```

---

### Task 4.2: Wrap `planet-card` with `Card` + replace divider with `Separator`

**Files:**
- Modify: `apps/web/src/components/home/planet-card.tsx`

The card has an inner divider `<div className="border-t border-border my-phi-3" />` between the position table and the dignity detail.

- [ ] **Step 1: Import Card and Separator**

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
```

- [ ] **Step 2: Replace outer wrapper**

Change the outer `<div className="bg-card border border-border rounded-lg p-phi-3 card-hover cursor-pointer" onClick={...}>` to:
```tsx
<Card
  className="card-hover cursor-pointer"
  onClick={() => setExpanded((v) => !v)}
>
  <CardContent className="p-phi-3">
    ... existing children unchanged ...
  </CardContent>
</Card>
```

- [ ] **Step 3: Replace divider**

Replace `<div className="border-t border-border my-phi-3" />` with:
```tsx
<Separator className="my-phi-3" />
```

- [ ] **Step 4: Typecheck + build + visual check**

Visit `/`. Click planet card → expands. Confirm divider line and outer card identical.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/home/planet-card.tsx
git commit -m "refactor(home): wrap planet-card with Card + Separator (PR4)"
```

---

### Task 4.3: Wrap `retrograde-tracker` with `Card`

**Files:**
- Modify: `apps/web/src/components/home/retrograde-tracker.tsx`

- [ ] **Step 1: Import Card**

```tsx
import { Card, CardContent } from "@/components/ui/card";
```

- [ ] **Step 2: Replace outer wrapper**

Change `<div className="bg-card border border-border rounded-lg p-phi-4 card-hover">` to `<Card className="card-hover"><CardContent className="p-phi-4">...children...</CardContent></Card>`.

- [ ] **Step 3: Typecheck + build + visual check**

Visit `/`. Confirm retrograde tracker renders identically.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/home/retrograde-tracker.tsx
git commit -m "refactor(home): wrap retrograde-tracker with Card (PR4)"
```

---

### Task 4.4: Wrap `element-modality-card` with `Card`

**Files:**
- Modify: `apps/web/src/components/home/element-modality-card.tsx`

- [ ] **Step 1: Import Card**

```tsx
import { Card, CardContent } from "@/components/ui/card";
```

- [ ] **Step 2: Replace outer wrapper**

Change `<div className="bg-card border border-border rounded-lg p-phi-4 card-hover" style={{ containerType: "inline-size" }}>` to:
```tsx
<Card className="card-hover" style={{ containerType: "inline-size" }}>
  <CardContent className="p-phi-4">
    ... existing table ...
  </CardContent>
</Card>
```

- [ ] **Step 3: Typecheck + build + visual check**

`/`. Confirm element/modality grid still renders. Container query (`3.5cqi` font-size) still works — resize the viewport and confirm font scales.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/home/element-modality-card.tsx
git commit -m "refactor(home): wrap element-modality-card with Card (PR4)"
```

---

### Task 4.5: Wrap `planetary-hours` with `Card` + replace divider

**Files:**
- Modify: `apps/web/src/components/home/planetary-hours.tsx`

This card has both a "no result" branch and an expand/collapse with an inner divider.

- [ ] **Step 1: Import Card and Separator**

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
```

- [ ] **Step 2: Replace the no-result branch wrapper**

Change `<div className="bg-card border border-border rounded-lg p-phi-4">...heading + message...</div>` to:
```tsx
<Card>
  <CardContent className="p-phi-4">
    ... existing heading + "Planetary hours unavailable..." ...
  </CardContent>
</Card>
```

- [ ] **Step 3: Replace the main wrapper**

Change `<div className="bg-card border border-border rounded-lg p-phi-4 card-hover cursor-pointer" onClick={...}>` to:
```tsx
<Card
  className="card-hover cursor-pointer"
  onClick={() => setExpanded((v) => !v)}
>
  <CardContent className="p-phi-4">
    ... existing compact/expanded branches ...
  </CardContent>
</Card>
```

- [ ] **Step 4: Replace inner divider**

Replace `<div className="border-t border-border my-phi-3" />` (between Day Hours and Night Hours) with `<Separator className="my-phi-3" />`.

- [ ] **Step 5: Typecheck + build + visual check**

`/`. Confirm card renders. Click → expand. Confirm divider between day/night sections.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/home/planetary-hours.tsx
git commit -m "refactor(home): wrap planetary-hours with Card + Separator (PR4)"
```

---

### Task 4.6: Wrap `chart-card` with `Card`

**Files:**
- Modify: `apps/web/src/components/chart/chart-card.tsx`

`chart-card` is the chart list item. It has `group relative` for hover state and contains a `⋯` menu and two dialogs. **Only the outer wrapper is migrated in this task.** The dialogs and menu are migrated in PR 5.

- [ ] **Step 1: Import Card**

```tsx
import { Card, CardContent } from "@/components/ui/card";
```

- [ ] **Step 2: Replace outer wrapper**

Change `<div className="bg-card border border-border rounded-lg p-4 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/40 hover:bg-secondary transition-[border-color,background-color] duration-160 ease-out group relative" onClick={...}>` to:
```tsx
<Card
  className="cursor-pointer hover:border-primary/40 hover:bg-secondary transition-[border-color,background-color] duration-160 ease-out group relative"
  onClick={() => navigate(`/chart/${stored.id}`)}
>
  <CardContent className="p-4 flex flex-col items-center gap-3">
    ... existing children: ⋯ button, dropdown div, mini wheel, info text ...
  </CardContent>
</Card>
```

- [ ] **Step 3: Typecheck + build + visual check**

Visit `/charts`. Confirm chart cards render in the grid with same hover state. Click body → navigates to chart. Hover → `⋯` button appears. Don't migrate the menu/dialogs yet (PR 5).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/chart/chart-card.tsx
git commit -m "refactor(chart): wrap chart-card outer with Card (PR4)"
```

---

### Task 4.7: PR 4 close-out

- [ ] **Step 1: Update changelog**

`## YYYY-MM-DD — shadcn migration PR 4: card wrappers`. List 6 modified files. Note: outer `<div>` wrappers replaced with `Card` + `CardContent`; inner dividers in planet-card and planetary-hours replaced with `Separator`. Internals untouched.

- [ ] **Step 2: Commit**

```bash
git add AGENT_CHANGELOG.md
git commit -m "docs: changelog for shadcn migration PR 4 (cards)"
```

> **End of PR 4.**

---

## PR 5 — Interactive bits inside cards

### Task 5.1: Replace `DignityBadge` with shadcn `Badge`

**Files:**
- Modify: `apps/web/src/components/home/planet-card.tsx`

- [ ] **Step 1: Import Badge**

```tsx
import { Badge } from "@/components/ui/badge";
```

- [ ] **Step 2: Replace `DignityBadge` body**

Change:
```tsx
function DignityBadge({ dignity }: { dignity: DignityType }) {
  const isPositive = dignity === "domicile" || dignity === "exaltation";
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] leading-none font-medium ${
      isPositive ? "bg-green-900/30 text-success" : "bg-red-900/30 text-destructive"
    }`}>
      {DIGNITY_LABELS[dignity]}
    </span>
  );
}
```
to:
```tsx
function DignityBadge({ dignity }: { dignity: DignityType }) {
  const isPositive = dignity === "domicile" || dignity === "exaltation";
  return (
    <Badge
      variant="outline"
      className={`px-1.5 py-0.5 text-[10px] leading-none font-medium border-0 ${
        isPositive ? "bg-green-900/30 text-success" : "bg-red-900/30 text-destructive"
      }`}
    >
      {DIGNITY_LABELS[dignity]}
    </Badge>
  );
}
```

- [ ] **Step 3: Typecheck + build + visual check**

`/`. Expand a planet-card. Confirm dignity badges show same colors and sizes (Sun in Aries → green Exaltation badge; Moon in Capricorn → red Detriment).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/home/planet-card.tsx
git commit -m "refactor(home): use shadcn Badge for DignityBadge (PR5)"
```

---

### Task 5.2: Convert planet-card expand/collapse to `Collapsible`

**Files:**
- Modify: `apps/web/src/components/home/planet-card.tsx`

Currently uses `useState` + ternary `{!expanded ? compact : expanded}`. The whole card toggles on click.

- [ ] **Step 1: Import Collapsible**

```tsx
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
```

- [ ] **Step 2: Restructure to Collapsible**

Replace the whole card body. The pattern: card always shows the compact position table; clicking it toggles the dignity-detail extra section. Keep the existing `expanded` state and toggle on Card click as today, but render via Collapsible:

```tsx
<Card
  className="card-hover cursor-pointer"
  onClick={() => setExpanded((v) => !v)}
>
  <CardContent className="p-phi-3">
    {apiError && retry && (
      <ErrorCard message="Showing approximation." onRetry={retry} className="text-xs mb-3" />
    )}

    {/* Compact position table — always visible (extracted from current "compact view" branch) */}
    <table className="w-full text-sm">
      <tbody>
        {displayBodies.map((body) => {
          // ... existing compact row rendering, including dignity badge column when expanded ...
        })}
      </tbody>
    </table>

    <Collapsible open={expanded}>
      <CollapsibleContent>
        <Separator className="my-phi-3" />
        <div className="text-muted-foreground text-[11px] uppercase tracking-wider mb-phi-2">
          Dignity Detail
        </div>
        <table className="w-full text-sm">
          ... existing dignity-detail table from current "expanded" branch ...
        </table>
      </CollapsibleContent>
    </Collapsible>
  </CardContent>
</Card>
```

> **Important:** the *current* code has two structurally-different tables in the compact vs expanded branches (the expanded version adds an extra `<td>` for the dignity badge). Decide which behavior you want:
> - **Option A (recommended):** always render the badge column; show `—` in compact mode for non-dignity bodies. Single table, less duplication.
> - **Option B:** keep two tables, one in the always-visible area and one in `CollapsibleContent`. More duplication but pixel-identical to current.
>
> Going with Option A here. Refactor the `displayBodies.map` row template to always include the dignity column, returning `null`-rendering `<td>` when not in dignity body list.

- [ ] **Step 3: Remove the duplicated `<>` expanded branch**

After collapsing into a single template, the old `{!expanded ? compact : expanded}` ternary collapses to one rendering. Delete the old expanded branch. Remove the "click to collapse" hint (or move it inside `CollapsibleContent`).

- [ ] **Step 4: Typecheck + build + visual check**

`/`. Click planet-card. Confirm: compact view shows position table including dignity badges where applicable; expanded view adds the dignity-detail grid below a separator. Click again → collapses smoothly.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/home/planet-card.tsx
git commit -m "refactor(home): use shadcn Collapsible for planet-card expand (PR5)"
```

---

### Task 5.3: Convert planetary-hours expand/collapse to `Collapsible`

**Files:**
- Modify: `apps/web/src/components/home/planetary-hours.tsx`

Same shape as Task 5.2: card always shows compact summary; expanded reveals day/night hour lists.

- [ ] **Step 1: Import Collapsible**

```tsx
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
```

- [ ] **Step 2: Restructure**

Always render the compact summary (planet day/hour line, progress bar, "next hour:" label). Wrap the expanded content (heading + day-hours block + separator + night-hours block) in `<Collapsible open={expanded}><CollapsibleContent>...</CollapsibleContent></Collapsible>`.

Remove the `{!expanded ? compact : expanded}` ternary; replace with always-shown compact + collapsible expanded section.

> Important: in the current code, the compact and expanded branches show *different* headings (compact has no header; expanded has "Today's Planetary Hours" + day-name pill). Move the expanded heading inside the `CollapsibleContent`.

- [ ] **Step 3: Typecheck + build + visual check**

`/`. Click planetary-hours card. Compact view: planet/hour summary + progress + "next hour" line. Expanded view: same compact summary stays, plus day-hours section, separator, night-hours section appear below.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/home/planetary-hours.tsx
git commit -m "refactor(home): use shadcn Collapsible for planetary-hours expand (PR5)"
```

---

### Task 5.4: Replace planetary-hours progress bar with `Progress`

**Files:**
- Modify: `apps/web/src/components/home/planetary-hours.tsx`

Currently:
```tsx
<div className="mt-phi-3 h-1 rounded-full bg-border overflow-hidden">
  <div
    className="h-full rounded-full bg-primary transition-all"
    style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
  />
</div>
```

- [ ] **Step 1: Import Progress**

```tsx
import { Progress } from "@/components/ui/progress";
```

- [ ] **Step 2: Replace progress markup**

```tsx
<Progress
  value={Math.min(100, Math.max(0, progress * 100))}
  className="mt-phi-3 h-1"
/>
```

- [ ] **Step 3: Typecheck + build + visual check**

`/`. Confirm progress bar fills proportionally. Default shadcn Progress uses `bg-primary/20` track + `bg-primary` indicator — should match current visual closely.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/home/planetary-hours.tsx
git commit -m "refactor(home): use shadcn Progress for planetary-hours bar (PR5)"
```

---

### Task 5.5: Migrate chart-card delete dialog to `AlertDialog`

**Files:**
- Modify: `apps/web/src/components/chart/chart-card.tsx`

Currently uses regular `Dialog` for both delete and rename. Delete is semantically a confirmation, so it becomes `AlertDialog`. Rename stays a plain `Dialog`.

- [ ] **Step 1: Import AlertDialog**

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
```

- [ ] **Step 2: Replace the delete `<Dialog>` block**

Replace the entire `<Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>...</Dialog>` block (the delete one, not rename) with:
```tsx
<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
  <AlertDialogContent className="bg-card border-border text-foreground max-w-sm">
    <AlertDialogHeader>
      <AlertDialogTitle>Delete chart?</AlertDialogTitle>
      <AlertDialogDescription>
        "{stored.name}" will be permanently deleted.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction
        onClick={handleDelete}
        className="bg-destructive hover:bg-destructive/80 text-white"
      >
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

- [ ] **Step 3: Remove `Dialog` import if no longer used elsewhere in this file**

The rename `Dialog` is still used, so keep the existing `Dialog`/`DialogContent`/etc imports. Do not remove.

- [ ] **Step 4: Typecheck + build + visual check**

`/charts`. Hover a chart card → click `⋯` → click Delete → confirmation dialog. Cancel → closes. Confirm Delete → chart removed, toast shown.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/chart/chart-card.tsx
git commit -m "refactor(chart): use shadcn AlertDialog for delete confirmation (PR5)"
```

---

### Task 5.6: Migrate chart-card `⋯` menu to `DropdownMenu`

**Files:**
- Modify: `apps/web/src/components/chart/chart-card.tsx`

The `⋯` button + manual conditional menu div is currently a hand-rolled toggle without outside-click handling.

- [ ] **Step 1: Import DropdownMenu**

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
```

- [ ] **Step 2: Replace the `⋯` button + conditional menu**

Replace the entire block (the `<button>` with `MoreHorizontal` and the `{menuOpen && <div>...</div>}` directly after it) with:
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button
      type="button"
      className="absolute top-2 right-2 w-9 h-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-border transition-colors opacity-0 group-hover:opacity-100"
      onClick={(e) => e.stopPropagation()}
    >
      <MoreHorizontal size={16} />
    </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent
    align="end"
    onClick={(e) => e.stopPropagation()}
    className="min-w-[140px]"
  >
    <DropdownMenuItem
      onClick={() => { setNewName(stored.name); setRenameOpen(true); }}
    >
      <Pencil size={14} className="text-muted-foreground" />
      Rename
    </DropdownMenuItem>
    <DropdownMenuItem
      className="text-destructive focus:text-destructive"
      onClick={() => setDeleteOpen(true)}
    >
      <Trash2 size={14} />
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

- [ ] **Step 3: Remove `menuOpen` state**

Delete `const [menuOpen, setMenuOpen] = useState(false);`. Search for any remaining `setMenuOpen` references — should all be gone.

- [ ] **Step 4: Typecheck + build + visual check**

`/charts`. Hover card → `⋯` appears → click → menu opens. Click outside → closes. Click Rename → dialog opens. Click Delete → confirmation alert dialog opens.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/chart/chart-card.tsx
git commit -m "refactor(chart): use shadcn DropdownMenu for chart-card menu (PR5)"
```

---

### Task 5.7: PR 5 close-out + final regression sweep

- [ ] **Step 1: Manual regression across all routes**

`npm run dev --workspace=apps/web`. Walk through each route and exercise interactions:
- `/` — every home card renders, planet-card and planetary-hours expand, retrograde tracker, moon card
- `/chart/new` — full form: name, date/time picker (24h and 12h), location search, all 4 selects, advanced toggle, sidereal flow, submit (with backend running)
- `/chart/:id` — chart view (no shadcn changes, sanity check)
- `/charts` — chart grid, hover `⋯`, rename, delete confirmation
- `/transits` — sanity check
- `/settings` — sanity check
- Sidebar — collapse/expand, user menu, sign out

Document any visual regressions in the changelog.

- [ ] **Step 2: Update changelog**

`## YYYY-MM-DD — shadcn migration PR 5: interactive primitives + final sweep`. List modified files (`planet-card`, `planetary-hours`, `chart-card`). Primitives now used: Badge, Collapsible, Progress, AlertDialog, DropdownMenu. Note any visual deltas worth flagging.

- [ ] **Step 3: Update PHASE3_TASK_CHECKLIST.md**

Mark "shadcn migration" complete.

- [ ] **Step 4: Commit**

```bash
git add AGENT_CHANGELOG.md PHASE3_TASK_CHECKLIST.md
git commit -m "docs: changelog for shadcn migration PR 5 (interactive bits) + close-out"
```

> **End of migration.** All five PRs complete.

---

## Final acceptance check

Run through the spec acceptance criteria:
- [ ] Every primitive in the Primitive Set lives in `src/components/ui/`
- [ ] Every surface listed in PRs 2-5 uses shadcn primitives where specified
- [ ] No regressions in routes: `/`, `/chart/new`, `/chart/:id`, `/charts`, `/transits`, `/settings`
- [ ] `docs/ui-migration-skipped.md` reflects final exclusions
- [ ] `AGENT_CHANGELOG.md` has one entry per PR

If all pass → migration is complete.
