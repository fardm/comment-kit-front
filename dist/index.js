import { createRequire } from 'module';

createRequire(import.meta.url);

// node_modules/preact/dist/preact.mjs
var n;
var l;
var u;
var v = [];
function _(l2, u2, t2) {
  var i2, o2, r2, e2 = {};
  for (r2 in u2) "key" == r2 ? i2 = u2[r2] : "ref" == r2 ? o2 = u2[r2] : e2[r2] = u2[r2];
  if (arguments.length > 2 && (e2.children = arguments.length > 3 ? n.call(arguments, 2) : t2), "function" == typeof l2 && null != l2.defaultProps) for (r2 in l2.defaultProps) void 0 === e2[r2] && (e2[r2] = l2.defaultProps[r2]);
  return m(l2, e2, i2, o2, null);
}
function m(n2, t2, i2, o2, r2) {
  var e2 = { type: n2, props: t2, key: i2, ref: o2, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: null == r2 ? ++u : r2, __i: -1, __u: 0 };
  return null != l.vnode && l.vnode(e2), e2;
}
n = v.slice, l = { __e: function(n2, l2, u2, t2) {
  for (var i2, o2, r2; l2 = l2.__; ) if ((i2 = l2.__c) && !i2.__) try {
    if ((o2 = i2.constructor) && null != o2.getDerivedStateFromError && (i2.setState(o2.getDerivedStateFromError(n2)), r2 = i2.__d), null != i2.componentDidCatch && (i2.componentDidCatch(n2, t2 || {}), r2 = i2.__d), r2) return i2.__E = i2;
  } catch (l3) {
    n2 = l3;
  }
  throw n2;
} }, u = 0, "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout;

// src/index.ts
var defaultOptions = {
  backendUrl: "/comments"
};
var StandaloneComments = (userOpts) => {
  const opts = { ...defaultOptions, ...userOpts };
  const backendUrl = opts.backendUrl;
  const Component = ({ displayClass, fileData }) => {
    const disableComment = typeof fileData.frontmatter?.comments !== "undefined" && (fileData.frontmatter?.comments === false || fileData.frontmatter?.comments === "false");
    if (disableComment) {
      return null;
    }
    const pageId = fileData.slug === "index" ? "/" : `/${fileData.slug}`;
    return _(
      "div",
      {
        class: `standalone-comments-section ${displayClass ?? ""}`,
        style: { marginTop: "3rem" }
      },
      [
        _("link", { rel: "stylesheet", href: `${backendUrl}/comments.css` }),
        _("div", {
          id: "comments-container",
          "data-api-url": `${backendUrl}/api.php`,
          "data-page-url": pageId
        })
      ]
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
};
var src_default = StandaloneComments;

export { src_default as default };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map