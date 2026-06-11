import type {
  QuartzComponent,
  QuartzComponentProps,
  QuartzComponentConstructor,
} from "@quartz-community/types";
import { classNames } from "../util/lang";

// تغییر نام اینترفیس برای جلوگیری از تداخل
export interface StandaloneCommentsOptions {
  backendUrl?: string;
}

export default ((opts?: StandaloneCommentsOptions) => {
  const backendUrl = opts?.backendUrl ?? "/comments";

  const Component: QuartzComponent = ({ displayClass, fileData }: QuartzComponentProps) => {
    const disableComment =
      typeof fileData.frontmatter?.comments !== "undefined" &&
      (fileData.frontmatter?.comments === false || fileData.frontmatter?.comments === "false");

    if (disableComment) {
      return null;
    }

    const pageId = fileData.slug === "index" ? "/" : `/${fileData.slug}`;

    return (
      <div
        class={classNames(displayClass, "standalone-comments-section")}
        style={{ marginTop: "3rem" }}
      >
        <link rel="stylesheet" href={`${backendUrl}/comments.css`} />
        <div
          id="comments-container"
          data-api-url={`${backendUrl}/api.php`}
          data-page-url={pageId}
        ></div>
      </div>
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
}) satisfies QuartzComponentConstructor<StandaloneCommentsOptions>;
