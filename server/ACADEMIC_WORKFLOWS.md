# Exams and automatic teacher performance

## Workflow and access

Admin: assign an exam/homework to an approved teacher, select class/board and all matching students or a specific roster. Teacher: schedule work for their assigned students, or publish a paper for an admin assignment. The roster, marks maximum and deadlines are fixed when scheduled; cancel and recreate an incorrect schedule before answers exist. Website admins can cancel with a reason; cancellation is also available through the admin API.

Publish one PDF/JPEG/PNG/WebP question paper, at most 20 MB. Students see the paper only at its scheduled start. Between start and answer deadline, assigned students submit up to five answer files, each at most 20 MB. Answers are final; review all pages first. Files upload directly to Cloudinary; MongoDB stores verified asset references. Existing Android chunk-upload retry/checkpoint handling is reused.

The responsible teacher (or admin) evaluates each submission, publishes marks and feedback, and can correct marks repeatedly. Grade history preserves changes. Admin grading does not count as teacher evaluation work. Students see only their own results; teachers manage only their own exams. Exam publication, answer submission and published marks use the existing notification service.

Admin Class Marks & Toppers shows published exam/homework marks by month and class/board. Leaders use average percentage of published exams only, excluding homework. Each student's graded-exam count is shown: these averages are not a common-exam competition. New records snapshot class/board; older records fall back to the student's current class/board.

## Monthly scoring: recorded-evidence-v1

These are configurable-in-code demonstration rules, not a validated assessment of teaching quality. Each category is 0–100. Only actual records contribute; missing evidence is N/A, not zero. A recorded missed deadline counts as zero.

| Category | Base weight | Measurement |
| --- | ---: | --- |
| Class starts / punctuality | 20 | Mean of started-class rate and on-time-class rate |
| Assigned question papers | 15 | Mean of submitted-paper rate and on-time-paper rate |
| Evaluation work completion | 15 | Percentage of received answer submissions graded by the responsible teacher |
| Student results / improvement | 25 | Attainment; where a prior comparable result exists, 70% attainment + 30% improvement |
| Doubt responses / grading speed | 5 | Mean of available doubt-response score and on-time grading percentage |

Final score = sum(category score × base weight) / sum(available base weights). All five categories have 80 base-weight points; if all are available, effective weights are 25%, 18.75%, 18.75%, 31.25%, 6.25%. Coverage = available base weights / 80. We exclude feedback, conduct, extra contribution and question-paper quality until reliable records exist. Assigned work currently means answer-sheet evaluation, not an unimplemented general task system.

- Class presence requires the owner's authenticated Start/Join action, from 30 minutes before start through scheduled end; students/admin do not establish teacher attendance. Five-minute punctuality grace. This records initiation, not proof that the teacher stayed the entire class. Existing classes without tracking evidence are excluded. Cancelled-before-cutoff classes/papers are excluded.
- Papers are expected only when explicitly assigned by admin, not automatically every week. Self-scheduled papers do not earn paper-timeliness credit. Only the responsible teacher's publication counts. Only due or already submitted work is scored.
- Completion counts due or already evaluated student submissions against grading deadlines. Turnaround is first teacher grading time minus student submission time. Missing student submissions are not charged as teacher grading work.
- Results average each student/subject's published exam percentages, then average those groups. Prior baseline is the latest previous result for that teacher/student/subject, from the previous year of records. Improvement = clamp(50 + 2 × percentage-point change, 0, 100). No baseline means attainment only. Historical new-work reports use grade history at the month cutoff; legacy scores corrected after cutoff are excluded because their old values are unavailable.
- Doubt response score = 50% answered rate + 25% first-response-within-24-hours rate + 25% resolved rate. Only the teacher's own replies count. Co-assigned doubts handled only by another teacher are excluded for this teacher. Unanswered queries less than 24 hours old are not scored yet. Displayed response hours measure first reply, while resolution rate uses the existing resolved timestamp.
- Best Teacher eligibility: approved teacher, at least 50% coverage, three observations and two scored categories. Current-month candidates must also be active. Equal scores share rank and Best Teacher status. Sparse records remain visible but unranked. Coverage is displayed because teachers can have different available categories; compare evidence as well as totals.
- Months use Asia/Kolkata boundaries. Current-month scores/winners are provisional. A daily 01:15 IST job refreshes current/previous months, with startup catch-up. Opening a report regenerates its month, so an idle Render instance catches up on the next request. Reports are recalculated, not permanently locked audit records.

Admin sees all teachers. Teacher report JSON, Excel and WhatsApp contain only that teacher's rating and overall rank. Excel files contain scores, evidence and scoring notes. WhatsApp opens a prepared message/chat selector; the user chooses the recipient and sends it. Excel can also be shared through the phone's share sheet.

## Deployment and validation

Deploy backend first, then website and a new mobile release: these screens cannot appear in the already-published Play Store binary without an app update. No dependency upgrades are needed. Existing Cloudinary and notification environment settings are reused. Answer/grade transactions require a MongoDB replica set (including Atlas); standalone MongoDB is unsupported. Allow the new model indexes to finish building before inviting users to submit.

Local verification: 111 automated tests passed, including workflow/transaction failure mocks, access isolation, scoring/history boundaries and an actual XLSX round trip. Android JavaScript/Hermes export and Vite production build passed. These checks do not prove live database transactions, Cloudinary delivery, push delivery, device keyboards or WhatsApp behavior. Pilot one assigned exam with a teacher and two students, grade/correct it, verify admin/teacher/student visibility, Excel and sharing, then roll out. No production data was seeded, and no cloud build, commit, push or deployment was performed for this work.
