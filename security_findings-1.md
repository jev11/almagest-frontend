# Security Findings 1

## Scope

Security review of the frontend monorepo with emphasis on:

- Authentication and session handling
- Token storage and transport
- Privacy exposure of user data
- Browser-side persistence of sensitive data
- Client-side authorization boundaries
- DOM / rendering injection risks
- External network calls and third-party data exposure

This was a frontend-focused review. It does not verify backend protections such as:

- server-side authorization
- cookie settings
- CORS
- rate limiting
- CSRF defenses
- audit logging
- encryption at rest

## Executive Summary

The codebase does not show obvious classic frontend XSS sinks such as:

- `dangerouslySetInnerHTML`
- `eval`
- `new Function`
- raw HTML injection paths in React views

That is good.

The main security issues are instead concentrated in:

1. session token handling
2. privacy-sensitive location and birth-data flows
3. local persistence of highly sensitive user data
4. incomplete client-side access control wiring

The most important finding is the current auth model:

- access token stored in browser persistence
- refresh token stored in browser persistence
- tokens rehydrated into the API client on startup

That design substantially increases the blast radius of any XSS or malicious browser extension.

## Findings Overview

1. High: Refresh and access tokens are stored in `localStorage`
2. Medium: Sensitive location and birth-data flows are sent directly to third parties from the browser
3. Medium: Highly sensitive chart and birth data are stored locally by default
4. Medium: Route guard exists but is not actually applied to authenticated areas
5. Low to Medium: Registration flow enables account enumeration
6. Low: SVG string rendering should be escaped if future inputs become user-controlled

## Finding 1: Refresh and access tokens are stored in browser persistence

Severity: High

### Evidence

Auth state is persisted with Zustand:

- `apps/web/src/hooks/use-auth.ts`

Persisted fields include:

- `user`
- `accessToken`
- `refreshToken`

Relevant logic:

- `use-auth.ts` stores `accessToken` and `refreshToken`
- `App.tsx` rehydrates them into the API client on startup
- `packages/astro-client/src/client.ts` attaches the access token as a `Bearer` header and sends the refresh token to `/v1/auth/refresh`

### Why This Matters

Any successful XSS in the app can read `localStorage` and extract:

- the current access token
- the refresh token
- user profile data

That turns a reflected or stored XSS from a temporary page compromise into a persistent session compromise. A malicious browser extension or injected third-party script can do the same.

The refresh token is the more serious issue. If stolen, it can often be used to mint fresh access tokens until revoked or expired.

### Threat Scenarios

1. A future UI feature introduces an XSS bug.
2. An attacker script reads `localStorage["almagest-auth"]`.
3. It exfiltrates both tokens.
4. The attacker uses the refresh token to keep the session alive.

Or:

1. A shared/public computer is used.
2. The browser profile is not cleared.
3. A later user or local malware reads stored tokens and chart data.

### Affected Areas

- `apps/web/src/hooks/use-auth.ts`
- `apps/web/src/App.tsx`
- `packages/astro-client/src/client.ts`

### Resolution Steps

#### Preferred solution

Move refresh-token handling to secure httpOnly cookies.

1. Store the refresh token only in a secure, httpOnly, same-site cookie set by the backend.
2. Do not expose the refresh token to JavaScript at all.
3. Keep the access token in memory only on the frontend.
4. On page reload, restore the session by calling a refresh/session endpoint that reads the cookie server-side.
5. Rotate refresh tokens on each refresh if your backend supports token rotation.

#### Interim solution if backend cookie auth is not ready

1. Remove `refreshToken` from Zustand persistence.
2. Keep refresh tokens only in memory for the current tab session.
3. Optionally persist only a short-lived access token if absolutely necessary, but memory-only is still better.
4. Shorten token lifetimes.
5. On logout, ensure both frontend state and backend refresh state are invalidated.

#### Hardening controls to add alongside the token change

1. Add a strict CSP to reduce XSS impact.
2. Review all user-controlled rendering paths before adding any HTML-capable component.
3. Ensure refresh endpoint supports revocation and token rotation.
4. Log suspicious refresh patterns server-side.

### Suggested Implementation Direction

- Replace persisted auth store with:
  - `user`
  - maybe an in-memory access token
  - no persisted refresh token
- Add a bootstrap session call during app startup.
- Let the backend own long-lived session state.

### Priority

This should be the first security remediation item.

## Finding 2: Sensitive location and birth-data flows are sent directly to third parties from the browser

Severity: Medium

### Evidence

The frontend makes browser-direct requests to third-party services:

- reverse geocoding through Nominatim
- timezone lookup through `timeapi.io`
- location search through Nominatim

Relevant files:

- `apps/web/src/hooks/use-reverse-geocode.ts`
- `apps/web/src/hooks/use-timezone.ts`
- `apps/web/src/components/forms/location-search.tsx`
- `apps/web/src/hooks/use-current-sky.ts` requests browser geolocation

### Why This Matters

This application handles especially sensitive personal information:

- birth place
- birth datetime
- current location
- natal/transit chart inputs

Even if the data is not directly exploitable, it is privacy-sensitive. Sending coordinates directly from the user’s browser to third-party services means:

- those providers see user IP address
- they see precise coordinates or search terms
- your backend has no central policy enforcement or observability over these disclosures

For an astrology product, this is not incidental metadata. It is part of the user’s core personal dataset.

### Threat / Privacy Scenarios

1. A user grants geolocation permission on the home page.
2. The app resolves the coordinates via third-party services.
3. Multiple external services now have:
   - IP address
   - timestamp
   - user’s approximate or exact location

For birth-chart creation:

1. The user types a birth city into search.
2. Search terms go directly to a third-party geocoder.
3. This can reveal sensitive personal context before the user even submits a chart.

### Affected Areas

- `apps/web/src/hooks/use-current-sky.ts`
- `apps/web/src/hooks/use-reverse-geocode.ts`
- `apps/web/src/hooks/use-timezone.ts`
- `apps/web/src/components/forms/location-search.tsx`

### Resolution Steps

#### Preferred solution

Move location enrichment behind your own backend.

1. Replace browser-direct requests with backend endpoints:
   - `/v1/geo/search`
   - `/v1/geo/reverse`
   - `/v1/geo/timezone`
2. Let the backend call the third-party providers.
3. Apply rate limiting and caching server-side.
4. Centralize provider credentials, headers, and terms-of-service compliance in one place.
5. Avoid exposing raw third-party URLs and request patterns to the client.

#### Privacy controls

1. Add a clear privacy notice before requesting live geolocation.
2. Explain that coordinates may be sent to geocoding/timezone services if backend proxying is not yet implemented.
3. Offer a manual-location mode that does not require geolocation permission.
4. Reduce stored precision for cached coordinates if exact precision is not necessary.

#### Product/UX controls

1. Ask for geolocation only when a user benefit is explicit.
2. Make “use current location” opt-in instead of automatic if privacy expectations require it.
3. Add a user-facing “clear location history/cache” action.

### Suggested Implementation Direction

Phase 1:

- add backend proxy endpoints
- switch frontend requests to first-party endpoints

Phase 2:

- add server-side caching
- add privacy copy and settings controls

### Priority

This should follow shortly after the auth-token fix.

## Finding 3: Highly sensitive chart and birth data are stored locally by default

Severity: Medium

### Evidence

Local chart storage uses IndexedDB:

- `packages/astro-client/src/cache.ts`

Chart creation writes full stored chart objects locally:

- `packages/astro-client/src/hooks.ts`

Stored chart data includes:

- birth datetime
- latitude
- longitude
- location label
- full chart output

Location data is also persisted in `localStorage`:

- `apps/web/src/stores/sky-store.ts`

### Why This Matters

Birth data is highly personal information. Persisting it locally by default means:

- it remains on disk across sessions
- it may be available to other users on the same machine/browser profile
- it becomes accessible to malicious scripts in the event of XSS

This is partly a privacy risk and partly a security amplification issue.

### Threat Scenarios

1. Shared household computer
2. Workplace-managed browser profile
3. Browser extension with storage access
4. Future XSS gaining access to IndexedDB and `localStorage`

### Affected Areas

- `packages/astro-client/src/cache.ts`
- `packages/astro-client/src/hooks.ts`
- `apps/web/src/stores/sky-store.ts`

### Resolution Steps

1. Re-evaluate whether local persistence should be default-on.
2. Provide a settings toggle:
   - “Store charts locally on this device”
3. Add a visible control to clear:
   - local charts
   - cached current location
   - timezone/reverse-geocode cache
4. Reduce location precision for non-essential caches.
5. Consider encrypting locally stored chart payloads if the threat model justifies it.
   - note: client-side encryption does not help against XSS if the key is also available in JS
6. Clearly disclose device-local persistence in privacy copy.

### Suggested Policy

- cloud account data: user-consented, server-managed
- device-local cache: explicit opt-in or clearly explained default

### Priority

High for privacy posture, medium for exploitability.

## Finding 4: Route guard exists but is not applied to authenticated app areas

Severity: Medium

### Evidence

A guard component exists:

- `apps/web/src/components/layout/protected-route.tsx`

But `App.tsx` mounts routes directly and does not wrap pages with `ProtectedRoute`:

- `/chart/new`
- `/chart/:id`
- `/charts`
- `/transits`
- `/settings`

### Why This Matters

This is not a substitute for backend authorization, and backend auth should remain the real control. But leaving authenticated routes unguarded in the frontend creates several problems:

- inconsistent UX around protected features
- accidental exposure of pages that assume a logged-in user
- increased risk of frontend-only logic mistakes becoming user-visible

### Threat Scenarios

1. A page assumes auth state and leaks some cached user context.
2. A later feature relies on route protection existing and does not implement an additional check.
3. The frontend becomes inconsistent with backend access rules.

### Affected Areas

- `apps/web/src/components/layout/protected-route.tsx`
- `apps/web/src/App.tsx`

### Resolution Steps

1. Decide which routes are genuinely public and which require auth.
2. Wrap auth-required routes with `ProtectedRoute`.
3. Preserve redirect-back behavior after login.
4. Keep backend authorization mandatory even after the frontend guard is added.
5. Add tests ensuring protected pages redirect to login when unauthenticated.

### Important Note

This is defense in depth, not your primary auth boundary. The backend must still reject unauthorized requests.

## Finding 5: Registration flow enables account enumeration

Severity: Low to Medium

### Evidence

The registration page distinguishes a 409 response and shows:

- “An account with this email already exists”

File:

- `apps/web/src/routes/register.tsx`

### Why This Matters

This allows an attacker to test whether a given email address is already registered. In some products this is acceptable; in others it is not.

Risk depends on:

- sensitivity of the user base
- whether emails are considered confidential
- how easy automated probing is on the backend

### Threat Scenario

1. Attacker submits a list of known email addresses.
2. UI/backend response reveals which addresses are registered.
3. The attacker uses that list for phishing, credential stuffing, or targeted harassment.

### Resolution Steps

1. Use a generic registration failure message:
   - “Unable to create account. Please check your details or sign in.”
2. Avoid exposing “email already exists” directly in the client.
3. Add server-side rate limiting on registration attempts.
4. Consider email verification workflows that do not confirm account existence to the requester.

### Priority

Lower than the token and privacy issues, but worth cleaning up.

## Finding 6: SVG string generation should be escaped if future inputs become user-controlled

Severity: Low

### Evidence

The SVG adapter manually builds XML strings:

- `packages/chart-renderer/src/adapters/svg.ts`

At present, the inserted values are mostly:

- numeric geometry
- glyph constants
- theme values

This means I do not see an immediate exploitable injection with current code paths.

### Why This Matters

String-built XML/SVG becomes risky if any inserted field later becomes user-controlled, such as:

- chart labels
- theme names
- custom text annotations
- remotely sourced strings

Without proper escaping, that can lead to malformed markup or injection in downstream consumers of the SVG.

### Resolution Steps

1. Add XML escaping helpers now for:
   - text node content
   - attribute values
2. Route all dynamic string insertions through those helpers.
3. Add tests for escaping:
   - `<`
   - `>`
   - `&`
   - quotes
4. Document that only sanitized theme/text input is allowed in SVG output.

### Priority

Low today, but a good preventive hardening step.

## Positive Security Signals

The following are good signs in the current code:

1. No obvious `dangerouslySetInnerHTML` usage in the React app.
2. No `eval` / `new Function` style dynamic code execution.
3. Third-party geocode/timezone fetches do not appear to include auth tokens.
4. API token attachment is centralized in `packages/astro-client/src/client.ts`.
5. Error handling generally avoids dumping raw backend payloads directly into the DOM.

These do not remove the main findings, but they mean the app is not showing the most obvious frontend security anti-patterns.

## Recommended Remediation Order

### Phase 1: Immediate

1. Remove refresh-token persistence from `localStorage`
2. Move toward cookie-backed refresh/session handling
3. Audit all auth bootstrap and logout flows after the token change

### Phase 2: Privacy and data handling

1. Proxy geocode/timezone requests through the backend
2. Add explicit privacy disclosure for geolocation and location enrichment
3. Add controls for clearing local persisted chart and location data

### Phase 3: Defense in depth

1. Apply `ProtectedRoute` where appropriate
2. Reduce account enumeration in registration UX
3. Add SVG escaping helpers

## Recommended Tests and Verification

Add or extend tests for:

1. Auth bootstrap without persisted refresh token
2. Logout fully clearing device-local auth state
3. Protected-route redirect behavior
4. No token leakage on third-party fetches
5. Clearing local chart and location caches
6. SVG escaping behavior for dynamic strings

Also add manual verification steps for:

1. Session survives reload using cookie-backed refresh flow
2. Refresh token is not visible in `localStorage`
3. Geolocation prompts are user-initiated and documented
4. Local data removal works as expected

## Final Assessment

From a security perspective, the code is not alarming in the “obvious frontend exploit” sense. I did not find classic DOM-XSS sinks or obviously unsafe rendering patterns.

The real weakness is session architecture and privacy handling:

- token persistence is too exposed
- sensitive user data is stored locally and shared with third parties too freely

If you address those areas first, the overall security posture improves substantially.

