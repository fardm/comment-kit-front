import { createRequire } from 'module';

createRequire(import.meta.url);
var l;
l = { __e: function(n2, l2, u3, t2) {
  for (var i2, o2, r2; l2 = l2.__; ) if ((i2 = l2.__c) && !i2.__) try {
    if ((o2 = i2.constructor) && null != o2.getDerivedStateFromError && (i2.setState(o2.getDerivedStateFromError(n2)), r2 = i2.__d), null != i2.componentDidCatch && (i2.componentDidCatch(n2, t2 || {}), r2 = i2.__d), r2) return i2.__E = i2;
  } catch (l3) {
    n2 = l3;
  }
  throw n2;
} }, "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout;

// node_modules/preact/jsx-runtime/dist/jsxRuntime.mjs
var f2 = 0;
function u2(e2, t2, n2, o2, i2, u3) {
  t2 || (t2 = {});
  var a2, c2, p2 = t2;
  if ("ref" in p2) for (c2 in p2 = {}, t2) "ref" == c2 ? a2 = t2[c2] : p2[c2] = t2[c2];
  var l2 = { type: e2, props: p2, key: n2, ref: a2, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --f2, __i: -1, __u: 0, __source: i2, __self: u3 };
  if ("function" == typeof e2 && (a2 = e2.defaultProps)) for (c2 in a2) void 0 === p2[c2] && (p2[c2] = a2[c2]);
  return l.vnode && l.vnode(l2), l2;
}

// src/components/StandaloneComments.tsx
function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}
var StandaloneComments_default = ((opts) => {
  const backendUrl = opts?.backendUrl ?? "/comments";
  const type = opts?.type ?? "full";
  const title = opts?.title ?? "";
  const limit = opts?.limit ?? 5;
  const Component = ({ displayClass, fileData }) => {
    if (type === "recent") {
      return /* @__PURE__ */ u2("div", { class: classNames(displayClass, "recent-comments-widget"), children: [
        /* @__PURE__ */ u2("h3", { id: "recent-comments-title", children: title || "Recent Comments" }),
        /* @__PURE__ */ u2(
          "div",
          {
            id: "recent-comments-container",
            "data-backend-url": backendUrl,
            "data-limit": limit,
            "data-custom-title": opts?.title ? "true" : "false",
            children: /* @__PURE__ */ u2("p", { class: "rc-widget-loading", children: "Loading..." })
          }
        )
      ] });
    }
    const disableComment = typeof fileData.frontmatter?.comments !== "undefined" && (fileData.frontmatter?.comments === false || fileData.frontmatter?.comments === "false");
    if (disableComment) {
      return null;
    }
    const pageId = fileData.slug === "index" ? "/" : `/${fileData.slug}`;
    return /* @__PURE__ */ u2(
      "div",
      {
        class: classNames(displayClass, "standalone-comments-section"),
        style: { marginTop: "3rem" },
        children: /* @__PURE__ */ u2(
          "div",
          {
            id: "comments-container",
            "data-api-url": `${backendUrl}/api/comments`,
            "data-page-url": pageId
          }
        )
      }
    );
  };
  Component.afterDOMLoaded = `
    document.addEventListener("nav", () => {
      // Full comments section initialization
      const mainContainer = document.getElementById('comments-container');
      if (mainContainer) {
        const apiUrl = mainContainer.getAttribute('data-api-url');
        const pageUrl = mainContainer.getAttribute('data-page-url');

        // Load comments using the new RESTful API
        const loadComments = async () => {
          try {
            const response = await fetch(apiUrl + '?page_url=' + encodeURIComponent(pageUrl) + '&status=approved&sort=asc');
            if (!response.ok) throw new Error('Failed to load comments');
            const data = await response.json();

            // Initialize the comments UI
            // Note: The new backend doesn't provide a client-side script, so you'll need to
            // implement the comment form and display logic yourself or use a separate library
            console.log('Comments loaded:', data.comments);
            // TODO: Implement comment rendering and form submission logic
          } catch (error) {
            console.error('Error loading comments:', error);
          }
        };

        loadComments();
      }

      // Recent comments widget initialization
      const recentContainer = document.getElementById('recent-comments-container');
      if (recentContainer) {
        const backendUrl = recentContainer.getAttribute('data-backend-url');
        const limit = recentContainer.getAttribute('data-limit') || '5';
        const hasCustomTitle = recentContainer.getAttribute('data-custom-title') === 'true';

        const loadRecentComments = async () => {
          try {
            // Note: The new comment-kit backend doesn't have a public "recent comments" endpoint.
            // This implementation fetches all approved comments and filters client-side, which is
            // inefficient. Consider adding a /api/comments/recent endpoint to the backend.
            // For now, we pass the current page URL to satisfy the backend requirement.
            const currentPageUrl = window.location.href;
            const response = await fetch(backendUrl + '/api/comments?page_url=' + encodeURIComponent(currentPageUrl) + '&status=approved&sort=desc&limit=' + limit);
            if (!response.ok) throw new Error('Network error');
            const data = await response.json();

            if (!data.comments || data.comments.length === 0) {
              recentContainer.innerHTML = '<span class="rc-widget-empty">No comments yet.</span>';
              return;
            }

            let html = '<div class="rc-widget-list">';
            data.comments.forEach(comment => {
              const pageUrlParts = comment.page_url.replace(/\\/$/, '').split('/');
              const pageSlug = pageUrlParts[pageUrlParts.length - 1] || 'Home';
              const decodedSlug = decodeURIComponent(pageSlug).replace(/-/g, ' ');

              html += '<div class="rc-widget-item">';
              html += '  <div class="rc-widget-header">';
              html += '    <strong>' + comment.author_name + '</strong>';
              html += '  </div>';
              html += '  <div class="rc-widget-content">' + comment.content.substring(0, 100) + '...</div>';
              html += '  <div class="rc-widget-meta">';
              html += '    on page: <a href="' + comment.page_url + '#comment-' + comment.id + '" class="rc-widget-link">' + decodedSlug + '</a>';
              html += '  </div>';
              html += '</div>';
            });
            html += '</div>';
            recentContainer.innerHTML = html;

          } catch (error) {
            console.error('Error loading recent comments:', error);
            recentContainer.innerHTML = '<span class="rc-widget-error">Error loading comments.</span>';
          }
        };

        loadRecentComments();
      }
    });
  `;
  return Component;
});

export { StandaloneComments_default as StandaloneComments };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map