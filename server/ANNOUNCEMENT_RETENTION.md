# Announcement inbox and seven-day retention

New admin announcements expire seven days after posting. Client-supplied expiry values are ignored; editing cannot reset creation time or extend retention. Existing notices older than seven days are also removed when this backend is deployed. Explicit admin deletion/deactivation remains available.

MongoDB TTL indexes on announcement/read-receipt `createdAt` operate independently of Render uptime. API reads and media-download requests exclude notices older than seven days immediately; MongoDB's background TTL deletion can occur shortly afterward. A startup/hourly job also purges old announcements and batches orphaned read receipts left after TTL deletion. Read receipts have their own seven-day TTL as a fallback.

`GET /api/announcements/active` preserves the unread-only popup contract. `?includeRead=true` returns all still-active notices addressed to that user, with `isRead`, for the new student/teacher inbox. Student role/course/grade targeting remains enforced for read and unread notices. Marking a notice as read does not remove it from this inbox.

The red megaphone opens the inbox for students/teachers and announcement management for admins. Student dashboard action order: AI, chat, announcements, notifications. Teacher has a menu button and a grouped chat/announcement/notification row. Admin actions sit below the identity text so long names cannot collide with the controls. Targets are 44×44 with 8-pixel gaps, and header content uses normal layout flow rather than overlapping absolute rows.

This deletes announcement database records and read receipts; it does not change general chat/notification retention or delete potentially shared Cloudinary files. Deploy the backend to activate retention. The header/inbox UI requires the updated Expo app (and a new mobile release for Play Store users).
