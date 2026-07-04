import type {
  QuartzComponent,
  QuartzComponentProps,
  QuartzComponentConstructor,
} from "@quartz-community/types";

/**
 * StandaloneCommentsOptions
 *
 * @property backendUrl   - Origin (no trailing slash) of the comment-kit
 *                         Cloudflare Worker, e.g. "https://comments.example.com".
 *                         Defaults to "/comments" for legacy installs.
 * @property type         - "full" renders the full comments section on the
 *                         current page; "recent" renders a sidebar widget of
 *                         recent comments.
 * @property title        - Title for the recent-comments widget.
 * @property limit        - Max comments for the recent widget (default 5).
 * @property recentPagesUrl - DEPRECATED. The backend has no global "recent
 *                         comments" endpoint; the recent widget now polls
 *                         a small allow-list of pages instead. This option
 *                         lets the site owner pass that allow-list
 *                         explicitly. If omitted, the widget is hidden
 *                         with a console warning.
 */
export interface StandaloneCommentsOptions {
  backendUrl?: string;
  type?: "full" | "recent";
  title?: string;
  limit?: number;
  /** Pages to poll for the recent-comments widget (absolute URLs). */
  recentPagesUrl?: string[];
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Strip trailing slashes from a URL/origin. Backend handlers concatenate
 * `${backendUrl}/api/...` so a trailing slash would produce `//api/...`.
 */
function trimTrailingSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

// ----------------------------------------------------------------------------
// Client-side script
// ----------------------------------------------------------------------------
//
// This string is injected into a <script> tag and runs in the browser.
// It uses a self-invoking function with a unique namespace so that
// repeated SPA navigations don't leak listeners or duplicate state.
//
// NOTE: All runtime helpers used by the inline script (`escapeHtml`,
// `timeAgo`, `REACTIONS`, `getLocalVotes`, etc.) are defined INSIDE the
// script string below — they cannot be shared with the TSX module scope
// because the script runs in a separate <script> tag context, not as a
// JS module. Defining them at the TSX top-level would create dead code
// (ESLint would flag them as unused) and would also bloat the bundle
// with code that never executes server-side.
//
// IMPORTANT: This script is deliberately framework-free (vanilla JS) so
// it can be inlined without bundling. It uses `document` APIs only.

const CLIENT_SCRIPT = `
(function () {
  if (window.__ck_initialized) return;
  window.__ck_initialized = true;

  // Re-run on every Quartz SPA navigation
  document.addEventListener("nav", function () {
    initFullCommentsSection();
    initRecentCommentsWidget();
  });
  // Also init once on first load (covers the case where "nav" already
  // fired before our listener was registered).
  initFullCommentsSection();
  initRecentCommentsWidget();

  // -------------------------------------------------------- Full section
  function initFullCommentsSection() {
    var root = document.getElementById("ck-comments-root");
    if (!root || root.dataset.ckReady === "1") return;
    root.dataset.ckReady = "1";

    var backendUrl = root.dataset.backendUrl;
    var pageUrl = window.location.href.split("#")[0];

    // Local mutable state
    var state = {
      comments: [],
      pendingReplyTo: null,
      submitting: false
    };

    // ----- Fetch & render ---------------------------------------------
    function fetchComments() {
      var url = backendUrl + "/api/comments?page_url=" + encodeURIComponent(pageUrl) + "&sort=asc";
      return fetch(url, { credentials: "omit" })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status)); })
        .then(function (data) {
          state.comments = (data && data.comments) || [];
          render();
        })
        .catch(function (err) {
          console.error("[comment-kit] failed to load comments:", err);
          root.querySelector(".ck-list").innerHTML =
            '<p class="ck-error">Failed to load comments.</p>';
        });
    }

    function render() {
      renderList();
      renderForm();
      loadPostReactions();
    }

    function renderList() {
      var listEl = root.querySelector(".ck-list");
      if (!state.comments.length) {
        listEl.innerHTML = '<p class="ck-empty">No comments yet. Be the first to share your thoughts.</p>';
        return;
      }
      var html = state.comments.map(function (c) { return renderComment(c, 0); }).join("");
      listEl.innerHTML = html;
      attachReactionHandlers();
      attachReplyHandlers();
    }

    function renderComment(comment, depth) {
      var repliesHtml = "";
      if (comment.replies && comment.replies.length) {
        repliesHtml = '<div class="ck-replies">' +
          comment.replies.map(function (r) { return renderComment(r, depth + 1); }).join("") +
        '</div>';
      }

      var votes = getLocalVotes()[String(comment.id)] || [];
      var reactionsHtml = REACTIONS.map(function (r) {
        var count = (comment.reactions && comment.reactions[r.type]) || 0;
        var voted = votes.indexOf(r.type) !== -1 ? " ck-voted" : "";
        return '<button type="button" class="ck-reaction' + voted + '"' +
          ' data-comment-id="' + comment.id + '"' +
          ' data-reaction="' + r.type + '"' +
          ' title="' + escapeHtml(r.label) + '"' +
          ' aria-label="' + escapeHtml(r.label) + '">' +
          '<span class="ck-reaction-emoji">' + r.emoji + "</span>" +
          (count > 0 ? '<span class="ck-reaction-count">' + count + "</span>" : "") +
          "</button>";
      }).join("");

      var replyBtn = depth < 6
        ? '<button type="button" class="ck-reply-btn" data-reply-to="' + comment.id + '">Reply</button>'
        : "";

      var safeName = escapeHtml(comment.author_name);
      var safeContent = escapeHtml(comment.content);
      var safeUrl = comment.author_url ? escapeHtml(comment.author_url) : "";
      var safeTime = escapeHtml(timeAgo(comment.created_at));
      var authorLink = safeUrl
        ? '<a href="' + safeUrl + '" rel="nofollow noopener ugc" target="_blank">' + safeName + "</a>"
        : safeName;

      return '<div class="ck-comment" id="ck-comment-' + comment.id + '">' +
        '<div class="ck-comment-header">' +
          '<span class="ck-author">' + authorLink + "</span>" +
          '<span class="ck-time">' + safeTime + "</span>" +
        "</div>" +
        '<div class="ck-comment-body">' + safeContent + "</div>" +
        '<div class="ck-comment-actions">' +
          '<div class="ck-reactions">' + reactionsHtml + "</div>" +
          replyBtn +
        "</div>" +
        repliesHtml +
      "</div>";
    }

    function renderForm() {
      var formEl = root.querySelector(".ck-form");
      var replyIndicator = state.pendingReplyTo
        ? '<div class="ck-reply-indicator">Replying to comment #' + state.pendingReplyTo +
          ' <button type="button" class="ck-cancel-reply" data-action="cancel-reply">cancel</button></div>'
        : "";
      formEl.innerHTML = replyIndicator +
        '<input type="text" class="ck-input ck-name" placeholder="Name" maxlength="100" required>' +
        '<input type="email" class="ck-input ck-email" placeholder="Email (not published)" maxlength="254" required>' +
        '<input type="url" class="ck-input ck-url" placeholder="Website (optional)" maxlength="2048">' +
        '<textarea class="ck-input ck-content" placeholder="Write a comment..." maxlength="5000" required rows="4"></textarea>' +
        '<button type="submit" class="ck-submit">Post Comment</button>' +
        '<label class="ck-subscribe">' +
          '<input type="checkbox" class="ck-subscribe-check"> Email me when new comments are posted on this page' +
        "</label>";
    }

    // ----- Event wiring -----------------------------------------------
    function attachReactionHandlers() {
      var btns = root.querySelectorAll(".ck-reaction");
      for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener("click", onReactionClick);
      }
    }
    function attachReplyHandlers() {
      var btns = root.querySelectorAll(".ck-reply-btn");
      for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener("click", onReplyClick);
      }
      var cancelBtn = root.querySelector('.ck-cancel-reply[data-action="cancel-reply"]');
      if (cancelBtn) cancelBtn.addEventListener("click", onCancelReply);
    }

    function onReactionClick(e) {
      var btn = e.currentTarget;
      var commentId = btn.getAttribute("data-comment-id");
      var reactionType = btn.getAttribute("data-reaction");
      var votes = getLocalVotes();
      var cur = votes[commentId] || [];
      var alreadyVoted = cur.indexOf(reactionType) !== -1;

      // Optimistic UI update
      if (alreadyVoted) {
        votes[commentId] = cur.filter(function (t) { return t !== reactionType; });
      } else {
        votes[commentId] = cur.concat([reactionType]);
      }
      setLocalVotes(votes);

      fetch(backendUrl + "/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({ comment_id: parseInt(commentId, 10), reaction_type: reactionType })
      })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status)); })
        .then(function (data) {
          // Update count from authoritative server response
          for (var i = 0; i < state.comments.length; i++) {
            if (String(state.comments[i].id) === commentId) {
              state.comments[i].reactions = data.reactions;
              break;
            }
          }
          // Recursively update replies too
          updateReactionsInTree(state.comments, commentId, data.reactions);
          renderList();
        })
        .catch(function (err) {
          console.error("[comment-kit] vote failed:", err);
          // Revert optimistic update
          var v2 = getLocalVotes();
          v2[commentId] = cur;
          setLocalVotes(v2);
          renderList();
        });
    }

    function updateReactionsInTree(comments, commentId, reactions) {
      for (var i = 0; i < comments.length; i++) {
        if (String(comments[i].id) === commentId) {
          comments[i].reactions = reactions;
          return true;
        }
        if (comments[i].replies && updateReactionsInTree(comments[i].replies, commentId, reactions)) {
          return true;
        }
      }
      return false;
    }

    function onReplyClick(e) {
      state.pendingReplyTo = parseInt(e.currentTarget.getAttribute("data-reply-to"), 10);
      renderForm();
      var ta = root.querySelector(".ck-content");
      if (ta) ta.focus();
    }
    function onCancelReply() {
      state.pendingReplyTo = null;
      renderForm();
    }

    // ----- Form submit -------------------------------------------------
    function onSubmit(e) {
      e.preventDefault();
      if (state.submitting) return;

      var nameEl = root.querySelector(".ck-name");
      var emailEl = root.querySelector(".ck-email");
      var urlEl = root.querySelector(".ck-url");
      var contentEl = root.querySelector(".ck-content");
      var subscribeEl = root.querySelector(".ck-subscribe-check");

      var name = nameEl.value.trim();
      var email = emailEl.value.trim();
      var url = urlEl.value.trim();
      var content = contentEl.value.trim();

      if (!name || !email || !content) {
        showFormError("Please fill in name, email, and comment.");
        return;
      }
      if (content.length > 5000) {
        showFormError("Comment too long (max 5000 characters).");
        return;
      }

      state.submitting = true;
      var submitBtn = root.querySelector(".ck-submit");
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Posting..."; }

      var payload = {
        page_url: pageUrl,
        parent_id: state.pendingReplyTo,
        author_name: name,
        author_email: email,
        author_url: url || null,
        content: content
      };

      fetch(backendUrl + "/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify(payload)
      })
        .then(function (r) {
          return r.json().then(function (body) {
            return { ok: r.ok, status: r.status, body: body };
          });
        })
        .then(function (res) {
          if (!res.ok) {
            throw new Error((res.body && res.body.error) || ("HTTP " + res.status));
          }
          // Subscribe if checkbox is on (only meaningful when comment succeeds)
          if (subscribeEl && subscribeEl.checked) {
            return fetch(backendUrl + "/api/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "omit",
              body: JSON.stringify({ page_url: pageUrl, email: email })
            }).catch(function () { /* best-effort */ });
          }
        })
        .then(function () {
          state.pendingReplyTo = null;
          renderForm();
          return fetchComments();
        })
        .catch(function (err) {
          console.error("[comment-kit] submit failed:", err);
          showFormError(err.message || "Failed to post comment.");
        })
        .finally(function () {
          state.submitting = false;
          var sb = root.querySelector(".ck-submit");
          if (sb) { sb.disabled = false; sb.textContent = "Post Comment"; }
        });
    }

    function showFormError(msg) {
      var existing = root.querySelector(".ck-form-error");
      if (existing) existing.remove();
      var div = document.createElement("div");
      div.className = "ck-form-error";
      div.textContent = msg;
      var formEl = root.querySelector(".ck-form");
      formEl.insertBefore(div, formEl.firstChild);
    }

    // ----- Post-level reactions ---------------------------------------
    function loadPostReactions() {
      var badge = root.querySelector(".ck-post-reactions");
      if (!badge) return;
      fetch(backendUrl + "/api/post-reaction?page_url=" + encodeURIComponent(pageUrl), { credentials: "omit" })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status)); })
        .then(function (data) { renderPostReactions(data.reactions || {}); })
        .catch(function () { /* silent */ });
    }

    function renderPostReactions(counts) {
      var badge = root.querySelector(".ck-post-reactions");
      if (!badge) return;
      var local = getLocalPostReactions()[pageUrl] || [];
      var html = REACTIONS.map(function (r) {
        var count = counts[r.type] || 0;
        var voted = local.indexOf(r.type) !== -1 ? " ck-voted" : "";
        return '<button type="button" class="ck-post-reaction' + voted + '"' +
          ' data-reaction="' + r.type + '"' +
          ' title="' + escapeHtml(r.label) + '"' +
          ' aria-label="' + escapeHtml(r.label) + '">' +
          '<span class="ck-reaction-emoji">' + r.emoji + "</span>" +
          (count > 0 ? '<span class="ck-reaction-count">' + count + "</span>" : "") +
          "</button>";
      }).join("");
      badge.innerHTML = '<span class="ck-post-reactions-label">React to this page:</span>' + html;
      var btns = badge.querySelectorAll(".ck-post-reaction");
      for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener("click", onPostReactionClick);
      }
    }

    function onPostReactionClick(e) {
      var btn = e.currentTarget;
      var reactionType = btn.getAttribute("data-reaction");
      var local = getLocalPostReactions();
      var cur = local[pageUrl] || [];
      var already = cur.indexOf(reactionType) !== -1;

      if (already) {
        local[pageUrl] = cur.filter(function (t) { return t !== reactionType; });
      } else {
        local[pageUrl] = cur.concat([reactionType]);
      }
      setLocalPostReactions(local);

      fetch(backendUrl + "/api/post-reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({ page_url: pageUrl, reaction_type: reactionType })
      })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status)); })
        .then(function (data) { renderPostReactions(data.reactions || {}); })
        .catch(function (err) {
          console.error("[comment-kit] post reaction failed:", err);
          // Revert
          var v2 = getLocalPostReactions();
          v2[pageUrl] = cur;
          setLocalPostReactions(v2);
          renderPostReactions({});
        });
    }

    // ----- Wire form submit -------------------------------------------
    var form = root.querySelector(".ck-form");
    if (form) form.addEventListener("submit", onSubmit);

    // Initial fetch
    fetchComments();
  }

  // -------------------------------------------------------- Recent widget
  function initRecentCommentsWidget() {
    var root = document.getElementById("ck-recent-root");
    if (!root || root.dataset.ckReady === "1") return;
    root.dataset.ckReady = "1";

    var backendUrl = root.dataset.backendUrl;
    var limit = parseInt(root.dataset.limit || "5", 10) || 5;
    var pagesJson = root.dataset.pages || "[]";
    var pages;
    try { pages = JSON.parse(pagesJson); } catch { pages = []; }
    if (!Array.isArray(pages) || pages.length === 0) {
      root.innerHTML = '<p class="ck-recent-empty">No pages configured for the recent-comments widget.</p>';
      console.warn("[comment-kit] recent widget: no recentPagesUrl configured.");
      return;
    }

    // Poll each configured page (max 10 to avoid hammering the backend)
    var targets = pages.slice(0, 10);
    Promise.all(targets.map(function (p) {
      return fetch(backendUrl + "/api/comments?page_url=" + encodeURIComponent(p) + "&sort=desc&limit=" + limit, { credentials: "omit" })
        .then(function (r) { return r.ok ? r.json() : { comments: [] }; })
        .then(function (data) { return (data && data.comments) || []; })
        .catch(function () { return []; });
    })).then(function (batches) {
      // Flatten, sort by created_at desc, dedupe by id, take top N
      var all = [];
      for (var i = 0; i < batches.length; i++) {
        for (var j = 0; j < batches[i].length; j++) all.push(batches[i][j]);
      }
      // Dedupe by id (a page could appear twice in pages config)
      var seen = {};
      all = all.filter(function (c) {
        if (seen[c.id]) return false;
        seen[c.id] = true;
        return true;
      });
      all.sort(function (a, b) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      all = all.slice(0, limit);
      renderRecent(all);
    }).catch(function (err) {
      console.error("[comment-kit] recent widget failed:", err);
      root.innerHTML = '<p class="ck-recent-error">Failed to load recent comments.</p>';
    });
  }

  function renderRecent(comments) {
    var root = document.getElementById("ck-recent-root");
    if (!root) return;
    if (!comments.length) {
      root.innerHTML = '<p class="ck-recent-empty">No comments yet.</p>';
      return;
    }
    var html = '<ul class="ck-recent-list">';
    for (var i = 0; i < comments.length; i++) {
      var c = comments[i];
      var safeName = escapeHtml(c.author_name);
      var safeContent = escapeHtml(c.content.length > 140 ? c.content.slice(0, 140) + "..." : c.content);
      var safeTime = escapeHtml(timeAgo(c.created_at));
      var safePage = escapeHtml(c.page_url);
      // Derive a friendly page label from the URL path
      var label;
      try {
        var u = new URL(c.page_url);
        var parts = u.pathname.replace(/\\/$/, "").split("/").filter(Boolean);
        label = parts.length ? decodeURIComponent(parts[parts.length - 1]).replace(/[-_]/g, " ") : u.hostname;
      } catch (e) {
        label = c.page_url;
      }
      html += '<li class="ck-recent-item">' +
        '<div class="ck-recent-meta"><strong>' + safeName + "</strong> &middot; " +
        '<span class="ck-recent-time">' + safeTime + "</span></div>" +
        '<div class="ck-recent-content">' + safeContent + "</div>" +
        '<a class="ck-recent-link" href="' + safePage + '#ck-comment-' + c.id + '">on ' + escapeHtml(label) + "</a>" +
      "</li>";
    }
    html += "</ul>";
    root.innerHTML = html;
  }

  // -------- helpers exposed to inner functions ---------------------
  function escapeHtml(text) {
    if (text === null || text === undefined) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  function timeAgo(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    var diff = Date.now() - d.getTime();
    var s = Math.floor(diff / 1000);
    if (s < 60) return "just now";
    var m = Math.floor(s / 60);
    if (m < 60) return m + "m ago";
    var h = Math.floor(m / 60);
    if (h < 24) return h + "h ago";
    var days = Math.floor(h / 24);
    if (days < 7) return days + "d ago";
    return d.toLocaleDateString();
  }
  function getLocalVotes() {
    try { return JSON.parse(localStorage.getItem("ck_votes") || "{}"); } catch { return {}; }
  }
  function setLocalVotes(v) {
    try { localStorage.setItem("ck_votes", JSON.stringify(v)); } catch (e) {}
  }
  function getLocalPostReactions() {
    try { return JSON.parse(localStorage.getItem("ck_post_reactions") || "{}"); } catch { return {}; }
  }
  function setLocalPostReactions(v) {
    try { localStorage.setItem("ck_post_reactions", JSON.stringify(v)); } catch (e) {}
  }

  // Reaction type table (must match backend)
  var REACTIONS = [
    { type: "heart", emoji: "\\u2764\\uFE0F", label: "Heart" },
    { type: "thumbs_up", emoji: "\\uD83D\\uDC4D", label: "Thumbs up" },
    { type: "thumbs_down", emoji: "\\uD83D\\uDC4E", label: "Thumbs down" },
    { type: "laugh", emoji: "\\uD83D\\uDE04", label: "Laugh" },
    { type: "cry", emoji: "\\uD83D\\uDE22", label: "Cry" },
    { type: "fire", emoji: "\\uD83D\\uDD25", label: "Fire" },
    { type: "clap", emoji: "\\uD83D\\uDC4F", label: "Clap" }
  ];
})();
`;

// ----------------------------------------------------------------------------
// CSS
// ----------------------------------------------------------------------------

const CSS = `
.standalone-comments-section {
  margin-top: 3rem;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: var(--dark, #1f1f1f);
}
:root[data-theme="dark"] .standalone-comments-section,
.dark .standalone-comments-section {
  color: var(--light, #fafafa);
}

.ck-comments-root {
  max-width: 760px;
}

.ck-title {
  font-size: 1.4rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--lightgray, #e5e5e5);
}

.ck-post-reactions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0 0 1.5rem 0;
  padding: 0.75rem;
  background: var(--lightgray, #f5f5f5);
  border-radius: 6px;
}
:root[data-theme="dark"] .ck-post-reactions,
.dark .ck-post-reactions {
  background: var(--lightgray, #2a2a2a);
}
.ck-post-reactions-label {
  font-size: 0.85rem;
  font-weight: 500;
  margin-right: 0.25rem;
  opacity: 0.7;
}

.ck-list { margin-bottom: 1.5rem; }

.ck-empty, .ck-error, .ck-recent-empty, .ck-recent-error {
  color: var(--gray, #888);
  font-style: italic;
  padding: 1rem 0;
}
.ck-error, .ck-recent-error { color: #c0392b; }

.ck-comment {
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--lightgray, #eee);
}
.ck-comment:last-child { border-bottom: none; }

.ck-comment-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}
.ck-author { font-weight: 600; }
.ck-author a { color: inherit; text-decoration: underline; }
.ck-time {
  font-size: 0.75rem;
  color: var(--gray, #888);
}

.ck-comment-body {
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: anywhere;
}

.ck-comment-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
}

.ck-reactions {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.ck-reaction, .ck-post-reaction {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--lightgray, #ddd);
  background: transparent;
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.9rem;
  line-height: 1;
  color: inherit;
  transition: background 0.15s, border-color 0.15s, transform 0.05s;
}
.ck-reaction:hover, .ck-post-reaction:hover {
  background: var(--lightgray, #f0f0f0);
}
.ck-reaction:active, .ck-post-reaction:active { transform: scale(0.95); }
.ck-reaction.ck-voted, .ck-post-reaction.ck-voted {
  background: #fff0f0;
  border-color: #ff8080;
}
:root[data-theme="dark"] .ck-reaction.ck-voted,
:root[data-theme="dark"] .ck-post-reaction.ck-voted,
.dark .ck-reaction.ck-voted,
.dark .ck-post-reaction.ck-voted {
  background: rgba(255,80,80,0.18);
  border-color: #ff8080;
}
.ck-reaction-emoji { font-size: 1rem; }
.ck-reaction-count { font-size: 0.8rem; font-weight: 500; }

.ck-reply-btn {
  background: none;
  border: none;
  color: var(--secondary, #4a90d9);
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
  text-decoration: underline;
}
.ck-reply-btn:hover { text-decoration: none; }

.ck-replies {
  margin-left: 1.25rem;
  padding-left: 1rem;
  border-left: 2px solid var(--lightgray, #eee);
  margin-top: 0.5rem;
}
:root[data-theme="dark"] .ck-replies,
.dark .ck-replies { border-left-color: var(--lightgray, #333); }

.ck-form {
  margin-top: 1.5rem;
  padding: 1rem;
  background: var(--lightgray, #f8f8f8);
  border-radius: 6px;
}
:root[data-theme="dark"] .ck-form,
.dark .ck-form { background: var(--lightgray, #222); }

.ck-reply-indicator {
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
  color: var(--gray, #666);
}

.ck-input {
  display: block;
  width: 100%;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  border: 1px solid var(--lightgray, #ccc);
  border-radius: 4px;
  background: var(--light, #fff);
  color: inherit;
  font-size: 0.95rem;
  box-sizing: border-box;
}
:root[data-theme="dark"] .ck-input,
.dark .ck-input { background: var(--light, #1a1a1a); border-color: var(--lightgray, #444); }
.ck-input:focus { outline: none; border-color: var(--secondary, #4a90d9); }
.ck-content { resize: vertical; min-height: 80px; font-family: inherit; }

.ck-submit {
  padding: 0.5rem 1.25rem;
  background: var(--secondary, #4a90d9);
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
}
.ck-submit:hover:not(:disabled) { opacity: 0.9; }
.ck-submit:disabled { opacity: 0.5; cursor: not-allowed; }

.ck-subscribe {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: var(--gray, #666);
  cursor: pointer;
}

.ck-form-error {
  background: #fde8e8;
  color: #c0392b;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
}
:root[data-theme="dark"] .ck-form-error,
.dark .ck-form-error { background: rgba(192,57,43,0.2); }

/* Recent comments widget */
.recent-comments-widget { margin: 1rem 0; }
.ck-recent-list { list-style: none; padding: 0; margin: 0; }
.ck-recent-item {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--lightgray, #eee);
}
.ck-recent-item:last-child { border-bottom: none; }
.ck-recent-meta { font-size: 0.85rem; margin-bottom: 0.15rem; }
.ck-recent-time { color: var(--gray, #888); }
.ck-recent-content {
  font-size: 0.9rem;
  line-height: 1.4;
  margin-bottom: 0.25rem;
}
.ck-recent-link {
  font-size: 0.8rem;
  color: var(--secondary, #4a90d9);
  text-decoration: none;
}
.ck-recent-link:hover { text-decoration: underline; }
`;

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export default ((opts?: StandaloneCommentsOptions) => {
  const backendUrl = trimTrailingSlash(opts?.backendUrl ?? "/comments");
  const type = opts?.type ?? "full";
  const title = opts?.title ?? "";
  const limit = opts?.limit ?? 5;
  const recentPagesUrl = opts?.recentPagesUrl ?? [];

  const Component: QuartzComponent = ({ displayClass, fileData }: QuartzComponentProps) => {
    // ------------------------------------------------------------------
    // Recent comments widget
    // ------------------------------------------------------------------
    if (type === "recent") {
      return (
        <div class={classNames(displayClass, "recent-comments-widget")}>
          <h3>{title || "Recent Comments"}</h3>
          <div
            id="ck-recent-root"
            data-backend-url={backendUrl}
            data-limit={String(limit)}
            data-pages={JSON.stringify(recentPagesUrl)}
          >
            <p>Loading...</p>
          </div>
        </div>
      );
    }

    // ------------------------------------------------------------------
    // Full comments section
    // ------------------------------------------------------------------
    const disableComment =
      typeof fileData.frontmatter?.comments !== "undefined" &&
      (fileData.frontmatter?.comments === false || fileData.frontmatter?.comments === "false");

    if (disableComment) {
      return null;
    }

    // We emit a slug for backwards-compat/debugging, but the client
    // computes the canonical page_url from window.location.href. See
    // getPageUrl() in the client script for the rationale.
    const pageSlug = fileData.slug === "index" ? "/" : `/${fileData.slug}`;

    return (
      <div class={classNames(displayClass, "standalone-comments-section")}>
        <div
          id="ck-comments-root"
          class="ck-comments-root"
          data-backend-url={backendUrl}
          data-page-slug={pageSlug}
        >
          <h2 class="ck-title">Comments</h2>
          <div class="ck-post-reactions" aria-label="Post reactions"></div>
          <div class="ck-list">
            <p>Loading comments...</p>
          </div>
          <form class="ck-form" autocomplete="off"></form>
        </div>
      </div>
    );
  };

  // The CSS is attached to the component so Quartz can inline it into
  // the page <style> block.
  Component.css = CSS;

  // The client script is attached via afterDOMLoaded so Quartz injects
  // it into a <script> tag at the end of the page.
  Component.afterDOMLoaded = CLIENT_SCRIPT;

  return Component;
}) satisfies QuartzComponentConstructor<StandaloneCommentsOptions>;
