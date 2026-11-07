# Vettri visual redesign — Step 1 review

29 October 2026. The user explicitly requested seeing the design-system step before continuing with portal adoption. This delivery is that review checkpoint.

## Preview

While the normal Vite development server runs, open `/design-system.html` on its displayed origin (for example `http://localhost:5173/design-system.html`). A separate review server was also started at `http://127.0.0.1:5181/design-system.html`.

This is a standalone entry point, not an application route. It uses labelled sample data and makes no API calls. Role selectors preview Student, Teacher and Admin treatments. Navigation previews contain all 67 existing labels/hrefs (19 Student, 21 Teacher, 27 Admin), extracted from their current dashboards. Preview interactions do not schedule classes, sign users in, change records, send notifications or log users out.

## Foundation

- Exact teal/ivory/champagne/pink brand tokens, typography, spacing, radii, shadows and layout dimensions in `tokens.css`.
- Fraunces 500–600 for editorial headings/numbers and Plus Jakarta Sans 400–700 for UI, loaded through Google Fonts.
- Accessible small-text token `--va-text-secondary: #526F6D`; the requested muted swatch remains available, but measures below 4.5:1 for small text on ivory. Gold buttons use dark ink on champagne, while gold pills use the requested gold-text color on gold-200.
- Namespaced Tailwind `academy.*` colors and `font-editorial` / `font-academy`. Existing legacy colors/fonts are retained until portal migration, so Step 1 does not recolor live screens by accident.
- Lucide icons, 18px / 1.7 stroke in shared controls.

Reusable components: AppShell, Sidebar, Topbar, BrandMark, PageHeader, Card, StatCard, Button, IconButton, Input, Select, Textarea, Badge/StatusPill, DataTable, Modal, Drawer, Tabs, Tooltip, EmptyState, Skeleton, Toast, NotificationPanel, Avatar, ProgressBar, ProgressRing, ChartCard, TrendChart, HeroCard, AlertBanner, InstallCard and AuthLayout.

Dialogs include focus trapping/restoration and Escape/backdrop dismissal. Tabs support keyboard navigation. Tables include local search, supplied filters, pagination and horizontal scrolling. Those presentation components accept callbacks/slots; existing business operations will be supplied during adoption rather than copied into the library.

## Files changed in Step 1

Added:

- `client/design-system.html` — standalone review entry point.
- `client/src/design-system/tokens.css` — shared token source.
- `client/src/design-system/components.jsx` — reusable visual components.
- `client/src/design-system/components.css` — shared component styling/responsive rules.
- `client/src/design-system/DesignSystemPreview.jsx` — interactive sample-data gallery.
- `client/src/design-system/preview.css` — gallery composition using the shared tokens.
- `client/src/design-system/previewNavigation.json` — existing menu labels and hrefs for review.
- `client/src/design-system/main.jsx` — isolated React entry point.
- `client/tests/designSystemContrast.test.mjs` — accessible text-color checks.
- This review document and `docs/design-system/` screenshot/verification artifacts.

Updated:

- `client/tailwind.config.js` — additive namespaced theme tokens/fonts.
- `client/src/index.css` — token import only for the existing app.
- `client/index.html` — new font loading; existing typography remains in place.
- `client/vite.config.js` — additional build entry for `design-system.html`; API/socket proxy behavior unchanged.
- `client/package.json` and `client/package-lock.json` — lucide-react dependency.

No application route, role guard, authentication flow, API call, backend file, business state or existing portal menu was changed for this step. Earlier teacher-dashboard/attendance fixes remain separate existing working-tree changes.

## Verification

The production build includes both the normal app and review entry. Existing build-size/Browserslist warnings remain.

An isolated Chrome test (sample data only) checked role navigation preservation, one page heading, modal visibility/Escape/focus restoration, table search/empty/filter/pagination, notification state, sidebar collapse, mobile drawer, and 4/2/1 stat columns. Mobile overflow caused by a hidden tooltip was corrected. Desktop/mobile screenshots and machine-readable checks are saved under `docs/design-system/`.

Native computer control was unavailable, so visual review used an isolated installed Chrome instance through the bundled Playwright runtime. No signed-in user browser or real account data was used.

## Next checkpoint

After the user reviews Step 1: adopt AppShell/Sidebar/Topbar in the three portals, then Teacher, Student and Admin dashboards, then remaining pages portal by portal. Keep the existing role routes, callbacks, data fetching and business state intact. List the adoption files after each step, as requested.
