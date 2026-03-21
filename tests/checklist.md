# GolfGives Platform — End-to-End Testing Checklist

> Run through every section below before each production release.
> Mark each item ✅ pass, ❌ fail (with note), or ⏭ skip (with reason).

---

## 1. Authentication

### Sign Up
- [ ✅] Register with a new email and password → redirected to `/dashboard/onboarding`
- [ ✅] Duplicate email shows "User already registered" error
- [✅ ] Short password (< 8 chars) is rejected with a message
- [ ✅] Welcome email arrives in inbox (check Resend dashboard if not received)


### Log In
- [✅ ] Valid credentials → redirected to `/dashboard`
- [ ✅] Wrong password → shows "Invalid login credentials" error
- [✅ ] Unknown email → shows error (not a 500)


### Password Reset
- [ ✅] "Forgot password" sends reset email
- [ ✅] Reset link navigates to change-password page
- [✅ ] New password saves and user can log in with it

### Log Out
- [✅ ] Clicking logout clears session and redirects to `/`
- [ ✅] Hitting a protected route after logout redirects to `/login`

---

## 2. Onboarding

- [ ✅] First-time user sees onboarding page after signup
- [ ✅] Returning user who has completed onboarding is redirected to `/dashboard`
- [✅ ] Onboarding saves charity selection and contribution percentage
- [ ✅] Invalid charity ID is rejected

---

## 3. Dashboard

### Score Entry
- [ ✅] Submit a valid Stableford score (1–45) with today's date → success
- [ ✅] Score `0` → error "Score must be between 1 and 45"
- [ ✅] Score `46` → error "Score must be between 1 and 45"
- [ ✅] Future date → error "Score date cannot be in the future"
- [ ✅] Duplicate date → score saves with `warning` toast shown to user
- [ ✅] Non-subscriber submitting a score → 403 with "active subscription required" message
- [ ✅] Lapsed subscriber → 403 with "subscription has lapsed" message
- [ ✅] Cancelled subscriber → 403 with "subscription is cancelled" message
- [ ✅] Latest 5 scores display correctly after submission

### Score Deletion
- [ ✅] Delete own score → score removed from list
- [✅ ] Score not found → 404 shown
- [✅ ] Attempt to delete another user's score → 403 Forbidden
- [ ✅] Invalid UUID in body → 400 "id must be a valid UUID"

### Charity Selector
- [✅ ] Current charity and percentage show correctly
- [✅ ] "Change charity" opens modal
- [ ✅] Search filters charity list
- [✅ ] Slider range is 10%–100%, step 5%
- [✅ ] Monthly contribution amount updates as slider moves
- [✅ ] Save updates selection; modal closes with success toast
- [✅] Saving without selecting a charity → "Please select a charity" error
- [ ✅] Modal closes on backdrop click

---

## 4. Settings

### Profile
- [ ] Display name updates and is reflected in the nav
- [ ] Avatar URL previews if valid image URL
- [ ] Email field is disabled (cannot be changed)
- [ ] Empty display name trims whitespace before saving

### Subscription
- [ ] Active subscription shows plan name, price, renewal date, and "Active" badge
- [ ] Cancelled subscription shows "Cancels on…" and "Cancelled" badge
- [ ] No subscription shows "View Plans" link
- [ ] "Manage Billing & Invoices" opens Stripe portal (hasStripe users only)

### Password Change

- [ ] New password < 8 chars → "New password must be at least 8 characters" error
- [ ] Mismatched passwords → "Passwords do not match" error
- [ ] Correct current password + valid new password → success toast
- [ ] Wrong current password → server error displayed

### Danger Zone
- [ ] "Delete My Account" button shows confirmation form
- [ ] Partial confirmation text keeps submit disabled
- [ ] Exact phrase "DELETE MY ACCOUNT" enables submit
- [ ] Submitting deletes account and redirects to `/`
- [ ] Cancel hides the form

---

## 5. Charities (Public)

- [ ] `/charities` page lists all active charities
- [ ] Featured charities appear prominently
- [ ] Inactive charities are not shown to public users
- [ ] Charity logo loads (or placeholder shown)

---

## 6. Draws (Public)

- [ ] `/draws` lists all published draws, newest first
- [ ] Unpublished draws are not visible to non-admins
- [ ] Draw detail page shows drawn numbers, match tiers, and winner list
- [ ] Non-existent draw ID → 404

---

## 7. Subscriptions / Checkout

- [ ] Clicking "Subscribe" on pricing page → redirected to Stripe Checkout
- [ ] `plan=monthly` and `plan=yearly` both route to correct Stripe price
- [ ] Unknown plan value → 400 "plan must be 'monthly' or 'yearly'"
- [ ] User with existing active subscription → 409 "You already have an active subscription" (no duplicate checkout)
- [ ] Successful payment → Stripe webhook fires, subscription row set to `active`, user redirected to `/dashboard?subscription=success`
- [ ] Cancelled checkout at Stripe → user redirected back to `/pricing`

---

## 8. Winner Proof Upload

- [ ] Winner uploads a valid JPEG ≤ 5 MB → proof_url saved, success response
- [ ] Upload a PNG and a WebP → both succeed
- [ ] Non-image file (e.g. PDF renamed to .jpg) → 400 "File content does not match its declared type"
- [ ] File > 5 MB → 400 "File too large"
- [ ] File < 12 bytes → 400 "File is too small"
- [ ] Non-winner user attempting upload → 403 Forbidden
- [ ] Winner with `payment_status = 'paid'` uploading → 409 "Prize has already been paid"
- [ ] Winner who already has a proof_url uploads again WITHOUT `replaceExisting=true` → 409 with `hasExistingProof: true`
- [ ] Winner who already has a proof_url uploads again WITH `replaceExisting=true` → new proof_url saved successfully

---

## 9. Admin — Draws

### Lifecycle
- [✅ ] Create a draw (configured status)
- [✅ ] Simulate → status becomes `simulated`, drawn numbers and winners returned
- [✅ ] Simulate with no draw entries → succeeds with `warning` field in response
- [✅ ] Publish without simulating first → 409 "Cannot publish… Run simulate first"
- [ ✅] Simulate again on `simulated` draw → idempotent, previous winners cleared and re-run
- [ ✅] Publish after simulate → status becomes `published`, draw emails triggered
- [✅ ] Reset a `simulated` draw → status back to `configured`, winners deleted
- [ ✅] Reset a `published` draw → 409 "A published draw cannot be reset"
- [ ✅] Non-admin calling PUT → 403 Forbidden

### Draw Entries
- [ ] Active subscriber with ≥ 1 score in the draw month has an entry created
- [ ] Subscriber with no scores in the month has no entry
- [ ] Entry scores_snapshot matches the scores submitted for that month

---

## 10. Admin — Winners

- [ ] `pending` tab shows unverified winners
- [ ] `verified` tab shows verified, unpaid winners
- [ ] `paid` tab shows paid winners
- [ ] `all` tab shows every winner
- [ ] Verify action sets `verified_at`, moves winner to `verified` tab
- [ ] Reject action sets `payment_status = rejected`, winner disappears from pending
- [ ] Mark Paid (single) sets `payment_status = paid`
- [ ] Bulk select + Mark Paid processes all selected winners
- [ ] "View Proof" modal shows uploaded image and bank details
- [ ] Non-admin accessing admin routes → 403 / redirect to dashboard

---

## 11. Admin — Charities

- [ ] Charity list shows all charities (active and inactive)
- [ ] Create charity with only Name → succeeds
- [ ] Create charity without Name → 400 "Name is required"
- [ ] Logo URL preview appears after entering a valid URL
- [ ] Toggle `is_active` and `is_featured` persist correctly
- [ ] Edit charity → changes saved, reflected immediately in list
- [ ] Delete charity → removed from list (check it doesn't break references)

---

## 12. Admin — Users

- [ ] User list loads with pagination
- [ ] Clicking a user opens their detail page
- [ ] Detail page shows profile, subscription status, scores, and draw entries
- [ ] Admin can manually set `is_admin = true` for a user

---

## 13. Email Notifications

- [ ] Welcome email sent on new signup (check Resend logs)
- [ ] Draw published email sent to all entrants when draw is published
- [ ] Winner notification email sent when a winner is created (if applicable)
- [ ] Emails use correct branding and links (BASE_URL resolves correctly in production)

---

## 14. Security & Performance

- [ ] All API routes require authentication (test with no session cookie)
- [ ] `X-Frame-Options: DENY` header present on all pages
- [ ] `Content-Security-Policy` header present
- [ ] `X-Content-Type-Options: nosniff` present
- [ ] Auth endpoints rate-limited: >10 req/min from same IP → 429
- [ ] `GET /api/health` returns `200 healthy` when Supabase and Stripe are reachable
- [ ] `GET /api/health` returns `503 degraded` when a service is down
- [ ] No `X-Powered-By: Next.js` header in responses
- [ ] Images served in AVIF/WebP where browser supports it
- [ ] Admin routes under `/admin/*` are inaccessible to non-admin authenticated users

---

## 15. Error Handling & Edge Cases

- [ ] Network offline → appropriate error toast shown (not a blank screen)
- [ ] API returning 500 → error message surfaced in UI
- [ ] React crash in a component → ErrorBoundary catches it, fallback UI shown
- [ ] Toast notifications appear for success and error states across all forms
- [ ] Toast auto-dismisses after 4 seconds
- [ ] Multiple simultaneous toasts stack without overlap
- [ ] All forms disable submit button while a request is in flight

---

## 16. Mobile / Responsive

- [ ] Dashboard usable at 375 px (iPhone SE)
- [ ] Admin pages scroll horizontally if needed; no content cut off
- [ ] Charity selector modal is a bottom sheet on mobile
- [ ] Score entry form inputs are large enough to tap (min 44 px height)
- [ ] Navigation works on both mobile (hamburger/bottom bar) and desktop

---

*Last updated: 2026-03-21*
