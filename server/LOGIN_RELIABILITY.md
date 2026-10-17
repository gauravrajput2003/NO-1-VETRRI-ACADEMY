# Parent login repair — 17 October 2026

## Confirmed findings

- The affected student is active. The saved mobile number includes an Indian
  country prefix and spaces within the ten-digit number. The old login query
  checked a few exact strings but did not match this stored spelling.
- A read-only check found 80 student mobile numbers containing formatting. This
  is a count of formatted numbers, not a claim that all 80 accounts fail login.
- The installed app treats any HTTP 401 as an expired session. When login
  returns 401 and there is no saved refresh token, its refresh interceptor throws
  an error with no HTTP response. The login screen then shows the misleading
  "Network error. Please try again." message instead of invalid credentials.
- The login limiter reads `body.email`, while the app sends `body.identifier`.
  Different accounts sharing a carrier, school or home IP therefore shared one
  failed-login counter.
- The global rate limiter runs before route authentication, so `req.user` is
  unset. Its per-user limit was not being applied to authenticated app traffic.

## Changes

- Preserve fast exact lookup for existing phone/email formats, then fall back
  to a role-scoped, bounded query that accepts spaces, country prefixes and
  common telephone punctuation. Regex input contains only literal digits.
- If more than one account matches the formatted fallback, require registered
  email/admin help rather than silently choosing a different student.
- Return HTTP 400 for incorrect login details so the existing Play Store app
  displays the form error without trying to refresh a nonexistent session.
  Protected endpoints retain their HTTP 401 behavior.
- Key failed-login limits by IP and a hashed, normalized identifier. Equivalent
  phone spellings share an account's limit; different parents have separate
  counters. Successful logins still do not count against this failure limit.
- Let the dedicated login limiter handle login requests instead of also spending
  the shared-IP general allowance. Other routes keep their general throttling.
- Verify JWTs before selecting the global per-user rate-limit bucket. Merely
  supplying a forged Authorization header does not grant the higher limit.

No account data migration, password reset, frontend change or dependency update
is needed. Existing uncommitted CORS additions in `server/index.js` were preserved.

## Verification

- Live public Render API: health returned HTTP 200; empty student login returned
  HTTP 400. A diagnostic incorrect-password request returned the old HTTP 401,
  demonstrating that local changes were not yet deployed during diagnosis.
- Read-only production database query: the old lookup found no account for the
  reported number; the new fallback found exactly one active student. No login
  session or database record was changed by this verification.
- `node --test server/tests/*.test.js`: 41 tests passed, including ten new login
  reliability tests. Auth and limiter JavaScript syntax checks passed.
- Real parent passwords were not requested or tested. Successful login with the
  parent's actual password must be confirmed after backend deployment.

## Rollout and remaining operational checks

1. Deploy these backend changes to the existing Render service. Preserve the
   endpoint URL used by the released app.
2. Ask the affected parent to retry the same ten-digit mobile and existing
   password. No new AAB is required for this repair.
3. Test one formatted-number account, one ordinary mobile account, an email
   login, a wrong-password login, and two accounts sharing a network.
4. If a genuine timeout/no-response error remains, check the Render logs and
   availability around its exact time. The installed app has a 60-second API
   timeout. The Render compute plan was not inspected: if this is a Free service,
   its idle spin-down/cold start can independently cause slow initial requests.
   An always-on hosting instance is the durable hosting-side remedy for that
   condition; code changes cannot disable Render's free-instance sleep policy.

Reference: [Render's documented Free-service idle behavior](https://render.com/docs/free#spinning-down-on-idle).
