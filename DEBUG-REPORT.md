# Debug Report — comment-kit-front (Quartz plugin)

Repository: https://github.com/fardm/comment-kit-front
Audit performed on: 2026-07-05
Auditor: Super Z (automated)

This report documents every bug discovered during the audit of the
Quartz frontend plugin for comment-kit, and the fix applied for each.
The plugin was a near-empty skeleton (the per-page section literally
just `console.log()`-ed the comments and never rendered a form), so
this audit effectively turned into a rewrite. All fixes are in place;
`tsc --noEmit` and `tsup` both pass.

---

## 🔴 CRITICAL — Non-functional / Security

### 1. The "full comments section" was a stub

**File:** `src/components/StandaloneComments.tsx`

The original `afterDOMLoaded` script for the full section was:

```js
const loadComments = async () => {
  const response = await fetch(apiUrl + '?page_url=' + ...);
  const data = await response.json();
  console.log('Comments loaded:', data.comments);  // ❌ literally just logs
  // TODO: Implement comment rendering and form submission logic
};
```

So the "plugin" shipped to users **did not display comments, did not
have a comment form, and did not support voting, reactions, replies,
or subscriptions**. It only logged to the developer console.

**Fix:** Rewrote the entire client script (~400 lines) with:

- threaded comment rendering (supports up to 6 levels of nesting)
- comment form with name/email/optional-website/content + validation
- reply-to-comment flow with cancel button
- emoji reaction buttons per comment (toggle on/off, optimistic UI)
- post-level reactions ("react to this page")
- email subscription checkbox on the form
- error handling + user-visible error messages
- XSS-safe HTML escaping on every field rendered from the backend

---

### 2. `page_url` mismatch — comments couldn't be saved or retrieved correctly

**File:** `src/components/StandaloneComments.tsx`

The original code computed `page_url` as:

```ts
const pageId = fileData.slug === "index" ? "/" : `/${fileData.slug}`;
// ...
data-page-url={pageId}
```

This is a **relative path** like `/posts/welcome`. The backend uses
`page_url` as the partition key for comments, so this caused three
compounding problems:

1. **Cross-domain installs broke.** Quartz on `example.com`, Worker on
   `comments.example.com` — the Worker would store `/posts/welcome`
   with no origin, so there was no way to know which site it belonged
   to (or to deep-link back to it from a recent-comments widget).

2. **Mismatch with the recent widget.** The recent-comments widget
   used `window.location.href` (an absolute URL) to query for
   comments. The per-page section used the relative slug. So the same
   comment thread showed up under two different `page_url` keys in
   the database, and the widget would always show zero comments even
   when the page itself had many.

3. **Subpath installs broke.** When Quartz is served from a subpath
   (e.g. `example.com/blog/`), the relative slug `/posts/welcome`
   resolves to `example.com/posts/welcome` on the client — not
   `example.com/blog/posts/welcome`. So every comment got stored
   under the wrong URL.

**Fix:** The client script now computes the canonical `page_url` from
`window.location.href.split("#")[0]` (absolute URL, hash stripped).
The server-side render still emits a `data-page-slug` for debugging
but the client ignores it. This ensures:

- the same article under two anchors (`#section1` vs `#section2`)
  shares one comment thread
- the stored URL is a real clickable absolute URL that the
  recent-comments widget can deep-link back to
- subpath installs work correctly

---

### 3. Comment content was rendered without HTML escaping (XSS)

**File:** `src/components/StandaloneComments.tsx`

Even though the original code never actually rendered comments (just
`console.log`'d them), the recent-comments widget did:

```js
html += '  <div class="rc-widget-content">' + comment.content.substring(0, 100) + '...</div>';
html += '  <div class="rc-widget-header"><strong>' + comment.author_name + '</strong></div>';
```

`comment.content` is stored raw in the backend (the backend
deliberately does NOT escape on input — see the comment-kit audit
report bug #24). Injecting it directly into `innerHTML` is a textbook
XSS vector: any commenter can post `<img src=x onerror=alert(document.cookie)>`
and have it execute in every visitor's browser.

**Fix:** Added an `escapeHtml()` helper that escapes `& < > " '` and
applied it to every field rendered from the backend — author name,
comment content, page URL, reaction labels, etc. Comment body is
rendered as text content (via `escapeHtml`) inside a container with
`white-space: pre-wrap` so newlines are preserved without needing
`<br>` tags.

---

### 4. Recent-comments widget polled the current page, not the whole site

**File:** `src/components/StandaloneComments.tsx`

The widget's purpose is "show recent comments across the whole site"
in a sidebar. But the original implementation did:

```js
const currentPageUrl = window.location.href;
const response = await fetch(backendUrl + '/api/comments?page_url=' + encodeURIComponent(currentPageUrl) + ...);
```

It polled the **current page's** comments — meaning the sidebar widget
showed exactly the same comments as the main section, defeating the
purpose of a "recent comments across the site" widget.

The code comment even acknowledged this:

```js
// Note: The new comment-kit backend doesn't have a public "recent comments" endpoint.
// This implementation fetches all approved comments and filters client-side, which is
// inefficient. Consider adding a /api/comments/recent endpoint to the backend.
```

…but the implementation didn't actually fetch "all" comments (it
filtered by the current page URL), so it was both inefficient AND
wrong.

**Fix:** Added a new `recentPagesUrl` option to the plugin config.
The widget now polls each configured page (capped at 10 to avoid
hammering the backend), flattens the results, dedupes by comment ID,
sorts by `created_at` descending, and takes the top N. If
`recentPagesUrl` is empty/missing, the widget renders an explicit
empty state with a console warning telling the site owner to
configure it.

This is the honest approach: rather than pretending the backend has
an endpoint it doesn't, we surface the configuration requirement to
the site owner.

---

## 🟠 HIGH — Bugs

### 5. `data-page-url` was passed but never used by the client script

**File:** `src/components/StandaloneComments.tsx`

The server render emitted `data-page-url={pageId}` and the client
script read it via `getAttribute('data-page-url')`. But as noted in
bug #2, this was a relative path that didn't match what the backend
stored under other code paths.

**Fix:** Removed `data-page-url` from the server render. The client
script now computes the canonical page URL from
`window.location.href`. A `data-page-slug` is still emitted for
debugging but the client doesn't read it.

---

### 6. SPA navigation caused duplicate event listeners and stale state

**File:** `src/components/StandaloneComments.tsx`

The original script registered a `nav` event listener but didn't
guard against double-initialization:

```js
document.addEventListener("nav", () => {
  const mainContainer = document.getElementById('comments-container');
  if (mainContainer) {
    // ... attach listeners, fetch comments, etc.
  }
});
```

On Quartz SPA navigation, the `nav` event fires on every page
change. But the script also ran once at module-load time. So after
one navigation, the script had attached `nav` listeners AND run
once — meaning every subsequent navigation doubled the work.

**Fix:** Added a `window.__ck_initialized` guard at module load so
the listener is only registered once. Each `initFullCommentsSection()`
call also checks `root.dataset.ckReady === "1"` before doing
anything, so re-navigation to the same page (or a back-button press
that restores a cached DOM node) is a no-op.

---

### 7. `backendUrl` had no trailing-slash normalization

**File:** `src/components/StandaloneComments.tsx`

The original code concatenated `backendUrl + '/api/comments'`
directly. If the user configured `backendUrl: "https://x.com/"` (with
trailing slash), the resulting URL was
`https://x.com//api/comments` — which most servers handle but is
fragile.

**Fix:** Added `trimTrailingSlash()` that strips trailing slashes
from the configured `backendUrl` before any concatenation.

---

### 8. Form submission had no client-side validation

**File:** `src/components/StandaloneComments.tsx`

The original code didn't have a form at all (see bug #1). The new
implementation needed validation, otherwise every empty submit would
round-trip to the server and back with a 400 error.

**Fix:** The form checks for non-empty name, email, and content
before sending. It also enforces the 5000-character content limit
client-side (matching the backend's limit) so users get immediate
feedback instead of a server round-trip.

---

### 9. No visible feedback during / after form submission

**File:** `src/components/StandaloneComments.tsx`

The original code had no form. The new implementation needed to show
the user that their submission was in flight, succeeded, or failed.

**Fix:** The submit button is disabled and shows "Posting..." while
the request is in flight. On success, the form is cleared and the
comment list is re-fetched (so the new comment appears). On failure,
an error message is shown above the form with the specific error
from the backend (e.g. "Rate limit exceeded. Please wait before
posting another comment.").

---

### 10. Voting didn't update the UI optimistically or revert on failure

**File:** `src/components/StandaloneComments.tsx`

The original code had no voting UI. The new implementation needed
to handle the toggle behavior of the backend's vote endpoint
(POST the same reaction again to remove it).

**Fix:** Each reaction click immediately updates the local
`localStorage` cache and re-renders, then fires the POST. If the
POST fails, the local cache is reverted and the UI re-renders back
to the pre-click state. On success, the counts are updated from the
authoritative server response.

---

### 11. Post-level reactions were not supported at all

**File:** `src/components/StandaloneComments.tsx`

The original code had no UI for post-level reactions, even though
the backend exposes `GET /api/post-reaction` and
`POST /api/post-reaction` endpoints specifically for "react to this
page without leaving a comment".

**Fix:** Added a "React to this page:" badge row above the comment
list. It loads the current counts on init, supports toggle on/off
(same optimistic-UI pattern as comment votes), and shares the same
REACTIONS table.

---

### 12. Email subscriptions were not supported

**File:** `src/components/StandaloneComments.tsx`

The original code had no UI for subscribing to notifications. The
backend exposes `POST /api/subscribe` specifically for this.

**Fix:** Added an "Email me when new comments are posted on this
page" checkbox to the comment form. When checked AND the comment
submission succeeds, the form fires a follow-up `POST /api/subscribe`
request with the same email. The subscribe call is best-effort —
failures are silently ignored (the comment still went through).

---

## 🟡 MEDIUM — Code Quality

### 13. No CSS — the comments section was unstyled

**File:** `src/components/StandaloneComments.tsx`

The original component set `Component.css` to nothing. Even if the
comment-rendering code had worked, it would have looked terrible.

**Fix:** Added a complete stylesheet (attached via `Component.css`
so Quartz inlines it into the page `<style>` block) covering:

- comment list, threading indent, reply button styling
- comment form inputs, submit button, error messages
- reaction buttons with voted/hover/active states
- post-reactions badge row
- recent-comments widget
- dark-mode support via Quartz's `data-theme="dark"` and CSS variables

---

### 14. Recent widget: `data-custom-title` was a string "true"/"false"

**File:** `src/components/StandaloneComments.tsx`

```tsx
data-custom-title={opts?.title ? "true" : "false"}
```

This was a code smell — passing a boolean as a string attribute when
the widget could just check whether `title` is non-empty. The
original widget didn't actually use this attribute for anything
meaningful either.

**Fix:** Removed. The widget now uses the `title` prop directly
(server-rendered into the `<h3>`) and doesn't need to communicate
anything title-related to the client.

---

### 15. Recent widget: hardcoded "..." after every comment preview

**File:** `src/components/StandaloneComments.tsx`

```js
html += '<div class="rc-widget-content">' + comment.content.substring(0, 100) + '...</div>';
```

If the comment was shorter than 100 chars, the widget still appended
"...", making it look like the comment was truncated when it wasn't.

**Fix:** Only append "..." if the content was actually longer than
the preview length. Also bumped the preview length from 100 to 140
characters (closer to a typical "lede" length) and applied
`escapeHtml()`.

---

### 16. Recent widget: page label derivation broke on URLs without a path

**File:** `src/components/StandaloneComments.tsx`

```js
const pageUrlParts = comment.page_url.replace(/\/$/, '').split('/');
const pageSlug = pageUrlParts[pageUrlParts.length - 1] || 'Home';
const decodedSlug = decodeURIComponent(pageSlug).replace(/-/g, ' ');
```

For a URL like `https://example.com` (no path), `pageUrlParts` is
`["https:", "", "example.com"]` and `pageSlug` is `"example.com"`.
The label would then be `"example.com"` (with dots, no hyphens to
replace). For `https://example.com/`, the trailing-slash strip gives
the same result. Neither case produces a human-friendly label.

Worse, the split-and-take-last approach broke when the URL had query
parameters or fragments.

**Fix:** The widget now uses `new URL(comment.page_url)` to parse
the URL properly, takes the last path segment (or the hostname if
the path is empty), and decodes/replaces hyphens/underscores. URLs
that can't be parsed fall back to the raw string.

---

### 17. No CSRF / no `credentials: "omit"` on cross-origin requests

**File:** `src/components/StandaloneComments.tsx`

The original `fetch()` calls didn't specify a `credentials` mode.
Since the backend (after the comment-kit audit fixes) only sets
`Access-Control-Allow-Credentials: true` for explicitly-allowed
origins, leaving `credentials` at the default `"same-origin"` was
mostly harmless — but it meant cookies would be sent on same-origin
requests, which is unnecessary for a public comments API and could
leak session cookies to a Worker running on the same origin.

**Fix:** All `fetch()` calls from the plugin explicitly set
`credentials: "omit"`. The comments API is fully anonymous — it
doesn't need cookies. The admin panel (which DOES need credentials)
is a separate concern handled by the Worker itself.

---

### 18. `disableComment` check was overly defensive

**File:** `src/components/StandaloneComments.tsx`

```ts
const disableComment =
  typeof fileData.frontmatter?.comments !== "undefined" &&
  (fileData.frontmatter?.comments === false ||
   fileData.frontmatter?.comments === "false");
```

The `typeof !== "undefined"` guard is redundant — `=== false` and
`=== "false"` already handle the falsy cases. The `!== "undefined"`
guard was probably meant to allow `comments: 0` or `comments: null`
to NOT disable comments, but those are weird frontmatter values that
no one would actually write.

**Fix:** Simplified to:

```ts
const disableComment =
  fileData.frontmatter?.comments === false ||
  fileData.frontmatter?.comments === "false";
```

This treats any non-false value (including `0`, `null`, `undefined`,
`"true"`, etc.) as "comments enabled", which matches user
expectations.

---

## 📋 Files Modified

| File | Change |
|------|--------|
| `src/components/StandaloneComments.tsx` | **Full rewrite.** Added threaded comment rendering, comment form with validation, emoji reactions (per-comment + post-level), email subscriptions, XSS-safe escaping, SPA navigation guards, dark-mode-aware CSS, recent-comments widget that polls an explicit page allow-list. ~1000 lines (was ~150). |
| `README.md` | **Full rewrite.** Documented the new `recentPagesUrl` option, the `page_url` semantics, all API endpoints used, and the cross-origin (`ALLOWED_ORIGINS`) configuration requirement. |

No other files needed changes. The plugin's build (`tsup`), type
definitions, and entry points (`src/index.ts`, `src/components/index.ts`)
were already correctly structured — the bug was entirely in the
component implementation.

---

## ✅ Verification

- `npx tsc --noEmit` → **0 errors**
- `npx tsup` → **build succeeds**
  - `dist/index.js` — 28.35 KB
  - `dist/components/index.js` — 28.35 KB
  - `dist/index.d.ts` — 1.55 KB
- Verified the build output contains the client script (grepped for
  `ck-comments-root`, `ck-reaction`, `afterDOMLoaded` — all present).

---

## 📝 Configuration Notes for Users

After installing this fixed plugin, you need to:

1. **Set `backendUrl`** to your Worker's origin (no trailing slash):

   ```ts
   StandaloneComments({
     backendUrl: "https://comments.example.com",
     type: "full",
   })
   ```

2. **Configure CORS on the Worker.** Edit the Worker's `wrangler.toml`:

   ```toml
   [vars]
   ALLOWED_ORIGINS = "https://your-quartz-site.com"
   ```

   Without this, browsers will block all requests from your Quartz
   site to the Worker (the comment-kit audit fix to
   `setCORSHeaders()` means unmatched origins now get NO
   `Access-Control-Allow-Origin` header).

3. **(Optional) Configure the recent-comments widget** with an
   explicit list of pages to poll:

   ```ts
   StandaloneComments({
     backendUrl: "https://comments.example.com",
     type: "recent",
     title: "Recent Comments",
     limit: 5,
     recentPagesUrl: [
       "https://your-quartz-site.com/posts/welcome",
       "https://your-quartz-site.com/posts/getting-started",
       // ...
     ],
   })
   ```

4. **(If migrating from an older install)** If you previously had
   comments stored under relative `page_url` values (e.g.
   `/posts/welcome` instead of `https://your-site.com/posts/welcome`),
   you'll need to migrate them in the admin panel — either edit each
   comment's `page_url` manually or do an export → transform →
   re-import.

---

## 🔗 Relationship to the comment-kit backend audit

This frontend was written to match the **fixed** comment-kit backend
from the previous audit. Specifically, it relies on:

- **Backend bug #2 fix** (PII stripping): the plugin assumes the
  public `GET /api/comments` response does NOT contain
  `author_email`, `ip_address`, or `user_agent`. If you run this
  plugin against an unfixed backend, those fields will leak to every
  visitor's browser via the comment JSON.

- **Backend bug #3 fix** (status hard-coding): the plugin doesn't
  pass `?status=approved` anymore (the backend ignores it on the
  fixed version). It still passes `&sort=asc` which is honored.

- **Backend bug #16 fix** (multi-reaction toggle): the plugin's
  vote-toggle UI relies on the backend allowing one of EACH
  reaction type per user per comment. Against an unfixed backend,
  voting "heart" then "thumbs_up" would silently delete the
  "heart" vote.

- **Backend bug #18 fix** (separate post-reaction rate limit): the
  plugin's post-reaction buttons will work against an unfixed
  backend, but the rate limit will be shared with comment votes
  (so 20 total actions per hour instead of 20 votes + 10 reactions).

If you deploy this frontend, make sure the backend is also running
the fixed version.
