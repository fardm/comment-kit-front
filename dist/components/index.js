import { createRequire } from 'module';

createRequire(import.meta.url);

// node_modules/@quartz-community/utils/dist/lang.js
function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}
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
var StandaloneComments_default = ((opts) => {
  const backendUrl = opts?.backendUrl ?? "/comments";
  const type = opts?.type ?? "full";
  const title = opts?.title ?? "";
  const limit = opts?.limit ?? 5;
  const Component = ({ displayClass, fileData }) => {
    if (type === "recent") {
      return /* @__PURE__ */ u2("div", { class: classNames(displayClass, "recent-comments-widget"), children: [
        /* @__PURE__ */ u2("h3", { id: "recent-comments-title", children: title }),
        /* @__PURE__ */ u2(
          "div",
          {
            id: "recent-comments-container",
            "data-backend-url": backendUrl,
            "data-limit": limit,
            "data-custom-title": opts?.title ? "true" : "false",
            children: /* @__PURE__ */ u2("p", { style: { fontSize: "0.9rem", color: "var(--gray)" }, children: "\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC..." })
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
        children: [
          /* @__PURE__ */ u2("link", { rel: "stylesheet", href: `${backendUrl}/comments.css` }),
          /* @__PURE__ */ u2(
            "div",
            {
              id: "comments-container",
              "data-api-url": `${backendUrl}/api.php`,
              "data-page-url": pageId
            }
          )
        ]
      }
    );
  };
  Component.afterDOMLoaded = `
    document.addEventListener("nav", () => {
      // \u06F1. \u0631\u0627\u0647\u200C\u0627\u0646\u062F\u0627\u0632\u06CC \u0628\u0627\u06A9\u0633 \u0627\u0635\u0644\u06CC \u06A9\u0627\u0645\u0646\u062A\u200C\u0647\u0627 \u062F\u0631 \u0628\u062E\u0634 \u0628\u0639\u062F \u0627\u0632 \u0628\u062F\u0646\u0647 \u0635\u0641\u062D\u0647 (afterBody)
      const mainContainer = document.getElementById('comments-container');
      if (mainContainer) {
        if (typeof window.initComments === 'function') {
          window.initComments();
        } else if (!document.getElementById('standalone-comments-script')) {
          const script = document.createElement('script');
          script.id = 'standalone-comments-script';
          script.src = '${backendUrl}/comments.js';
          script.defer = true;
          document.body.appendChild(script);
        }
      }

      // \u06F2. \u0631\u0627\u0647\u200C\u0627\u0646\u062F\u0627\u0632\u06CC \u0648 \u062A\u0632\u0631\u06CC\u0642 \u062F\u06CC\u062A\u0627\u06CC \u0622\u062E\u0631\u06CC\u0646 \u06A9\u0627\u0645\u0646\u062A\u200C\u0647\u0627 \u062F\u0631 \u0633\u0627\u06CC\u062F\u0628\u0627\u0631 (recent)
      const recentContainer = document.getElementById('recent-comments-container');
      if (recentContainer) {
        const backendUrl = recentContainer.getAttribute('data-backend-url');
        const limit = recentContainer.getAttribute('data-limit') || '5';
        const hasCustomTitle = recentContainer.getAttribute('data-custom-title') === 'true';
        
        const loadRecentComments = async () => {
          try {
            // \u062F\u0631\u06CC\u0627\u0641\u062A \u0632\u0628\u0627\u0646 \u062A\u0646\u0638\u06CC\u0645 \u0634\u062F\u0647 \u062F\u0631 \u0633\u0631\u0648\u0631 (\u0641\u0627\u06CC\u0644 config.php)
            let lang = 'en';
            try {
              const configRes = await fetch(backendUrl + '/api.php?action=widget_config');
              if (configRes.ok) {
                const config = await configRes.json();
                if (config.language) lang = config.language;
              }
            } catch(e) { 
              console.warn("\u0627\u0645\u06A9\u0627\u0646 \u062F\u0631\u06CC\u0627\u0641\u062A \u0632\u0628\u0627\u0646 \u0627\u0632 \u0633\u0631\u0648\u0631 \u0648\u062C\u0648\u062F \u0646\u062F\u0627\u0634\u062A\u060C \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u0627\u0632 \u067E\u06CC\u0634\u200C\u0641\u0631\u0636 \u0627\u0646\u06AF\u0644\u06CC\u0633\u06CC."); 
            }

            // \u0644\u0648\u062F \u062F\u0627\u06CC\u0646\u0627\u0645\u06CC\u06A9 \u0641\u0627\u06CC\u0644 \u0632\u0628\u0627\u0646 \u0645\u0631\u0628\u0648\u0637\u0647 \u062F\u0631 \u0635\u0648\u0631\u062A\u06CC \u06A9\u0647 \u0642\u0628\u0644\u0627\u064B \u0644\u0648\u062F \u0646\u0634\u062F\u0647 \u0628\u0627\u0634\u062F
            if (!window.COMMENTS_I18N) {
              await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = backendUrl + '/lang/' + lang + '.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
              });
            }

            // \u062E\u0648\u0627\u0646\u062F\u0646 \u0645\u062A\u063A\u06CC\u0631\u0647\u0627\u06CC \u0628\u0648\u0645\u06CC\u200C\u0633\u0627\u0632\u06CC \u0634\u062F\u0647 \u0627\u0632 \u0641\u0627\u06CC\u0644 \u0644\u0648\u062F \u0634\u062F\u0647
            const t = window.COMMENTS_I18N.recentWidget || {
              title: 'Recent Comments', loading: 'Loading...', empty: 'No comments yet.', onPage: 'on page:', error: 'Error loading comments.', home: 'Home'
            };

            // \u0627\u0639\u0645\u0627\u0644 \u0647\u0648\u0634\u0645\u0646\u062F \u0639\u0646\u0648\u0627\u0646 \u0628\u0631\u0627\u0633\u0627\u0633 \u0632\u0628\u0627\u0646 (\u0627\u06AF\u0631 \u06A9\u0627\u0631\u0628\u0631 \u0639\u0646\u0648\u0627\u0646 \u062F\u0633\u062A\u06CC \u062F\u0631 YAML \u0648\u0627\u0631\u062F \u0646\u06A9\u0631\u062F\u0647 \u0628\u0627\u0634\u062F)
            if (!hasCustomTitle) {
              const titleEl = document.getElementById('recent-comments-title');
              if (titleEl) titleEl.textContent = t.title;
            }

            // \u062F\u0631\u06CC\u0627\u0641\u062A \u0644\u06CC\u0633\u062A \u06A9\u0627\u0645\u0646\u062A\u200C\u0647\u0627 \u0628\u0631\u0627\u0633\u0627\u0633 \u0644\u06CC\u0645\u06CC\u062A \u0645\u0634\u062E\u0635 \u0634\u062F\u0647 \u062F\u0631 \u0622\u067E\u0634\u0646\u200C\u0647\u0627
            const response = await fetch(backendUrl + '/api.php?action=recent&limit=' + limit);
            if (!response.ok) throw new Error('Network error');
            const data = await response.json();
            
            if (data.error) throw new Error(data.error);
            
            if (!data.comments || data.comments.length === 0) {
              recentContainer.innerHTML = '<span style="color: var(--gray); font-size: 0.9em;">' + t.empty + '</span>';
              return;
            }

            // \u0633\u0627\u062E\u062A \u0648 \u0631\u0646\u062F\u0631 \u0633\u0627\u062E\u062A\u0627\u0631 \u062F\u0631\u062E\u062A\u06CC \u0627\u0628\u0632\u0627\u0631\u06A9 \u0645\u062A\u0646\u0627\u0633\u0628 \u0628\u0627 \u062A\u0645 \u06A9\u0648\u0627\u0631\u062A\u0632
            let html = '<div style="display: flex; flex-direction: column; gap: 15px;">';
            data.comments.forEach(comment => {
              const pageUrlParts = comment.page_url.replace(/\\/$/, '').split('/');
              const pageSlug = pageUrlParts[pageUrlParts.length - 1] || t.home;
              const decodedSlug = decodeURIComponent(pageSlug).replace(/-/g, ' ');

              html += '<div style="background: var(--lightgray); padding: 10px; border-radius: 5px; font-size: 0.9rem;">';
              html += '  <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.8rem;">';
              html += '    <strong>' + comment.author_name + '</strong>';
              html += '  </div>';
              html += '  <div style="color: var(--darkgray); margin-bottom: 5px; word-break: break-word;">' + comment.excerpt + '</div>';
              html += '  <div style="font-size: 0.75rem; color: var(--gray);">';
              html += '    ' + t.onPage + ' <a href="' + comment.page_url + '#comment-' + comment.id + '" style="text-decoration: none; color: var(--tertiary);">' + decodedSlug + '</a>';
              html += '  </div>';
              html += '</div>';
            });
            html += '</div>';
            recentContainer.innerHTML = html;

          } catch (error) {
            console.error('Error loading recent comments:', error);
            const t = window.COMMENTS_I18N?.recentWidget || {};
            recentContainer.innerHTML = '<span style="color: var(--red); font-size: 0.9em;">' + (t.error || 'Error loading comments.') + '</span>';
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