# Rival Assessment - Non-Technical QA Checklist

This checklist is based on the requirements in `assessment.md`.
Use it from the frontend only.

## How to use

- [x] Open the app in a browser.
- [x] Follow each test case exactly.
- [x] Tick each case only when it passes.
- [x] For each failure, take a screenshot and note what happened.

## 0) Environment checks (run first)

- [x] ENV-01 App opens at the frontend URL.
- [x] ENV-02 `Register` and `Login` pages open.
- [x] ENV-03 `Feed` page opens.
- [x] ENV-04 You can create a brand-new user account.

If ENV-04 fails, stop and report environment issue before continuing.

---

## A) Required Features (must pass)

### A1. Authentication

- [x] AUTH-01 Register a new account.
  Step: Go to `Register`, submit valid details.
  Expected: You are redirected to `Dashboard`.

- [x] AUTH-02 Login with the same account.
  Step: Log out, then login with the same credentials.
  Expected: Login succeeds and `Dashboard` opens.

- [x] AUTH-03 Invalid login shows error.
  Step: Use correct email + wrong password.
  Expected: Clear error message is shown.

- [x] AUTH-04 Protected route requires login.
  Step: Log out, manually open `/dashboard`.
  Expected: Redirect to `/login`.

### A2. Private dashboard blog management

- [x] BLOG-01 Create draft blog.
  Step: In Dashboard, create a blog with Publish unchecked.
  Expected: Blog appears with `Draft` label.

- [x] BLOG-02 Edit blog.
  Step: Change title/content and save.
  Expected: Updated content is visible in Dashboard.

- [x] BLOG-03 Publish blog.
  Step: Edit a draft, check Publish, save.
  Expected: Blog is published.

- [x] BLOG-04 Delete blog.
  Step: Delete from Dashboard and confirm.
  Expected: Blog is removed from Dashboard.

### A3. Public blog access

- [x] PUBLIC-01 Published blog detail opens.
  Step: Open a published post from Feed.
  Expected: Blog detail page loads with title/content.

- [x] PUBLIC-02 Draft is not publicly visible.
  Step: Keep one blog as draft and open Feed.
  Expected: Draft does not appear in Feed.

- [x] PUBLIC-03 Unknown slug shows not-found page.
  Step: Open `/blogs/does-not-exist`.
  Expected: Friendly "Blog not found" page appears.

### A4. Public feed requirements

- [x] FEED-01 Feed loads.
  Step: Open `/feed`.
  Expected: A list of published posts is shown.

- [x] FEED-02 Newest-first order.
  Step: Compare visible publish dates.
  Expected: Newest posts appear first.

- [x] FEED-03 Pagination works.
  Step: Click `Load more`.
  Expected: More posts load without full page reload.

- [x] FEED-04 Empty state works.
  Step: Test environment with zero published posts.
  Expected: Friendly empty message appears.

- [x] FEED-05 Loading state works.
  Step: Refresh Feed on slow connection.
  Expected: Loading/skeleton UI appears first.

---

## B) Implemented Optional Features (should pass)

### B1. Like system

- [x] LIKE-01 Like increments count.
  Step: Open blog detail and click Like once.
  Expected: Count increases by 1.

- [x] LIKE-02 Like persists.
  Step: Refresh page after liking.
  Expected: Count remains updated.

- [x] LIKE-03 Unlike decrements count.
  Step: Click Like again (toggle off).
  Expected: Count decreases by 1.

### B2. Comment system

- [x] COMMENT-01 Logged-in comment works.
  Step: While logged in, submit a comment.
  Expected: Comment appears in list.

- [x] COMMENT-02 Logged-out user cannot post.
  Step: Log out and open same blog detail.
  Expected: Comment input is hidden and login message appears.

- [x] COMMENT-03 Empty comment blocked.
  Step: Submit empty comment.
  Expected: Validation error appears.

---

## C) UX & Reliability Checks

- [x] UX-01 Friendly error fallback.
  Step: Temporarily break backend connectivity and open Feed.
  Expected: Error message and retry button appear.

- [x] UX-02 Header auth states are correct.
  Step: Compare header while logged in vs logged out.
  Expected: Correct menu options are shown for each state.

- [x] UX-03 Mobile responsiveness.
  Step: Test on narrow viewport.
  Expected: Pages remain usable and readable.

---

## D) Submission Readiness Checklist

- [x] SUBMIT-01 All required test cases in section A passed.
- [x] SUBMIT-02 Implemented optional cases in section B passed.
- [x] SUBMIT-03 No blocker bug remains in auth/feed/blog/like/comment.
- [x] SUBMIT-04 README includes setup, architecture, tradeoffs, improvements, scale notes.
- [ ] SUBMIT-05 Public repo URL and live app URL are ready.
- [x] SUBMIT-06 CortexOne task completed.
- [ ] SUBMIT-07 Signed up at `https://cortexone.rival.io`.
- [x] SUBMIT-08 Created one meaningful function in CortexOne.

---

## Test Report Template

- Date: 2026-02-28
- Tester: Codex (Senior QA + Software Engineer on fixes)
- Environment URL: http://localhost:3000
- Total cases: 37
- Passed: 35
- Failed: 0
- Blockers: 2 (`SUBMIT-05`, `SUBMIT-07` require external submission/account state)
- Notes: Full executable QA automation run at `e2e/tests/non-technical-qa.spec.ts` (results in `test-results/non-technical-qa/results.json`).
- Notes: Manual/targeted evidence screenshots: `test-results/non-technical-qa/UX-01.png`, `test-results/non-technical-qa/FEED-04.png`, `test-results/non-technical-qa/FEED-05.png`.
- Notes: `FEED-04` was validated in a reversible DB-toggle pass and then restored to original published state.

For each failed case:

- None.
