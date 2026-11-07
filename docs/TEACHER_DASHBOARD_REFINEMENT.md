# Teacher dashboard and discussions refinement

29 October 2026

## Research and design decisions

- [Khan Academy classroom experience](https://blog.khanacademy.org/meet-the-new-khan-academy-classroom-experience/) describes a dashboard organised around frequent teacher tasks and reports for progress and assignment completion.
- [Canvas course analytics](https://community.instructure.com/en/kb/articles/660625-how-do-i-view-course-analytics-in-a-course-as-an-instructor) provides a reference for separating analytics summaries from detailed reports.
- Applied these as design guidance: compact page gutters, clear summary cards, activity charts, coverage alongside scores, a dedicated conversation workspace and contextual creation dialogs.

## Implementation

- Removed the authenticated workspace's narrow maximum width. Laptop page gutters now scale between 16 and 32px.
- Dashboard Monthly Score now reads the same current-month `/academic-reports/teacher-performance` endpoint as My Performance, selects the logged-in teacher's report, and links there. It previously displayed the separate manual monthly grading score. Manual grading remains separately available.
- Added a real category-score bar chart and a growth card with score ring and evidence-coverage bar. Null category scores are excluded from the chart and remain N/A in the report. The chart is explicitly labelled as category scores, not a weekly trend. No sample 84% or simulated weekly history is used in the actual app.
- Added category symbols, score ring, coverage summary and action icons to My Monthly Performance while retaining the report's formula, evidence, eligibility rules, month filter, refresh, Excel and WhatsApp controls.
- Added GSAP ScrollTrigger reveals to lower dashboard sections and Framer Motion hover feedback to the performance summary. Both respect reduced-motion preferences. Native scrolling remains in place.
- Discussions now auto-open the first available thread, show loading/retry states, highlight the selected thread and ignore stale detail responses after fast thread switches. Creation moved to an accessible dialog. Existing endpoints, role conditions, attachment/PDF handling, status changes, admin controls and Socket.IO subscriptions remain. Voice recording is available inside creation and reply composers.
- Browser checks use isolated mocked responses; they make no production API requests or database writes. The displayed fixture score of 56.4 is test data matching the supplied screenshot, not an assertion about a newly fetched live account.

## Verification

- Production Vite build passed; existing Browserslist and large-chunk warnings remain.
- Existing contrast and attendance tests: 21 passed.
- Browser checks: score 56.4 and correct performance link; two scored chart categories with three null categories excluded; five report symbols and three N/A entries; automatic first discussion selection; thread switching; mocked reply payload and endpoint; creation recipient control and Escape dismissal; stale-request protection with a delayed first thread; no horizontal overflow on dashboard/report/discussions at 390px; no GSAP transforms with reduced motion; no browser page errors.
- Screenshots: `docs/design-system/adoption/teacher-insights.png`, `monthly-performance.png`, `discussions-workspace.png`.

No backend deployment or production data migration was performed.
