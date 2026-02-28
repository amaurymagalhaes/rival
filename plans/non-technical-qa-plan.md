# Rival Assessment - Non-Technical QA Checklist

This checklist is based on the requirements in `assessment.md`.
Use it from the frontend only.

## How to use

- [ ] Open the app in a browser.
- [ ] Follow each test case exactly.
- [ ] Tick each case only when it passes.
- [ ] For each failure, take a screenshot and note what happened.

## 0) Environment checks (run first)

- [ ] ENV-01 App opens at the frontend URL.
- [ ] ENV-02 `Register` and `Login` pages open.
- [ ] ENV-03 `Feed` page opens.
- [ ] ENV-04 You can create a brand-new user account.

If ENV-04 fails, stop and report environment issue before continuing.

---

## A) Required Features (must pass)

### A1. Authentication

- [ ] AUTH-01 Register a new account.
  Step: Go to `Register`, submit valid details.
  Expected: You are redirected to `Dashboard`.

- [ ] AUTH-02 Login with the same account.
  Step: Log out, then login with the same credentials.
  Expected: Login succeeds and `Dashboard` opens.

- [ ] AUTH-03 Invalid login shows error.
  Step: Use correct email + wrong password.
  Expected: Clear error message is shown.

- [ ] AUTH-04 Protected route requires login.
  Step: Log out, manually open `/dashboard`.
  Expected: Redirect to `/login`.

### A2. Private dashboard blog management

- [ ] BLOG-01 Create draft blog.
  Step: In Dashboard, create a blog with Publish unchecked.
  Expected: Blog appears with `Draft` label.

- [ ] BLOG-02 Edit blog.
  Step: Change title/content and save.
  Expected: Updated content is visible in Dashboard.

- [ ] BLOG-03 Publish blog.
  Step: Edit a draft, check Publish, save.
  Expected: Blog is published.

- [ ] BLOG-04 Delete blog.
  Step: Delete from Dashboard and confirm.
  Expected: Blog is removed from Dashboard.

### A3. Public blog access

- [ ] PUBLIC-01 Published blog detail opens.
  Step: Open a published post from Feed.
  Expected: Blog detail page loads with title/content.

- [ ] PUBLIC-02 Draft is not publicly visible.
  Step: Keep one blog as draft and open Feed.
  Expected: Draft does not appear in Feed.

- [ ] PUBLIC-03 Unknown slug shows not-found page.
  Step: Open `/blogs/does-not-exist`.
  Expected: Friendly "Blog not found" page appears.

### A4. Public feed requirements

- [ ] FEED-01 Feed loads.
  Step: Open `/feed`.
  Expected: A list of published posts is shown.

- [ ] FEED-02 Newest-first order.
  Step: Compare visible publish dates.
  Expected: Newest posts appear first.

- [ ] FEED-03 Pagination works.
  Step: Click `Load more`.
  Expected: More posts load without full page reload.

- [ ] FEED-04 Empty state works.
  Step: Test environment with zero published posts.
  Expected: Friendly empty message appears.

- [ ] FEED-05 Loading state works.
  Step: Refresh Feed on slow connection.
  Expected: Loading/skeleton UI appears first.

---

## B) Implemented Optional Features (should pass)

### B1. Like system

- [ ] LIKE-01 Like increments count.
  Step: Open blog detail and click Like once.
  Expected: Count increases by 1.

- [ ] LIKE-02 Like persists.
  Step: Refresh page after liking.
  Expected: Count remains updated.

- [ ] LIKE-03 Unlike decrements count.
  Step: Click Like again (toggle off).
  Expected: Count decreases by 1.

### B2. Comment system

- [ ] COMMENT-01 Logged-in comment works.
  Step: While logged in, submit a comment.
  Expected: Comment appears in list.

- [ ] COMMENT-02 Logged-out user cannot post.
  Step: Log out and open same blog detail.
  Expected: Comment input is hidden and login message appears.

- [ ] COMMENT-03 Empty comment blocked.
  Step: Submit empty comment.
  Expected: Validation error appears.

---

## C) UX & Reliability Checks

- [ ] UX-01 Friendly error fallback.
  Step: Temporarily break backend connectivity and open Feed.
  Expected: Error message and retry button appear.

- [ ] UX-02 Header auth states are correct.
  Step: Compare header while logged in vs logged out.
  Expected: Correct menu options are shown for each state.

- [ ] UX-03 Mobile responsiveness.
  Step: Test on narrow viewport.
  Expected: Pages remain usable and readable.

---

## D) Submission Readiness Checklist

- [ ] SUBMIT-01 All required test cases in section A passed.
- [ ] SUBMIT-02 Implemented optional cases in section B passed.
- [ ] SUBMIT-03 No blocker bug remains in auth/feed/blog/like/comment.
- [ ] SUBMIT-04 README includes setup, architecture, tradeoffs, improvements, scale notes.
- [ ] SUBMIT-05 Public repo URL and live app URL are ready.
- [ ] SUBMIT-06 CortexOne task completed.
- [ ] SUBMIT-07 Signed up at `https://cortexone.rival.io`.
- [ ] SUBMIT-08 Created one meaningful function in CortexOne.

---

## Test Report Template

- Date:
- Tester:
- Environment URL:
- Total cases:
- Passed:
- Failed:
- Blockers:
- Notes:

For each failed case:

- Case ID:
- Screenshot:
- Actual result:
- Expected result:
