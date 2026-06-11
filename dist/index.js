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

// src/components/ExampleComponent.tsx
var ExampleComponent_default = ((opts) => {
  const backendUrl = opts?.backendUrl ?? "/comments";
  const Component = ({ displayClass, fileData }) => {
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
      const container = document.getElementById('comments-container');
      if (!container) return;
      
      if (typeof window.initComments === 'function') {
        window.initComments();
      } else if (!document.getElementById('standalone-comments-script')) {
        const script = document.createElement('script');
        script.id = 'standalone-comments-script';
        script.src = '${backendUrl}/comments.js';
        script.defer = true;
        document.body.appendChild(script);
      }
    });
  `;
  return Component;
});

export { ExampleComponent_default as ExampleComponent };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map