import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "@quartz-community/types";
import { h } from "preact";

// تعریف نوع تنظیمات ورودی
interface Options {
  backendUrl?: string;
}

// تنظیمات پیش‌فرض
const defaultOptions: Options = {
  backendUrl: "/comments",
};

const StandaloneComments: QuartzComponentConstructor<Options> = (userOpts?: Options) => {
  const opts = { ...defaultOptions, ...userOpts };
  const backendUrl = opts.backendUrl;

  const Component: QuartzComponent = ({ displayClass, fileData }: QuartzComponentProps) => {
    // غیرفعال کردن کامنت‌ها در صورت وجود comments: false در فرانت‌متر
    const disableComment =
      typeof fileData.frontmatter?.comments !== "undefined" &&
      (fileData.frontmatter?.comments === false || fileData.frontmatter?.comments === "false");

    if (disableComment) {
      return null;
    }

    const pageId = fileData.slug === "index" ? "/" : `/${fileData.slug}`;

    // رندر کردن المان‌ها با متد h به جای تگ‌های HTML مستقیم
    return h(
      "div",
      {
        class: `standalone-comments-section ${displayClass ?? ""}`,
        style: { marginTop: "3rem" },
      },
      [
        h("link", { rel: "stylesheet", href: `${backendUrl}/comments.css` }),
        h("div", {
          id: "comments-container",
          "data-api-url": `${backendUrl}/api.php`,
          "data-page-url": pageId,
        }),
      ],
    );
  };

  // اجرای اسکریپت در کلاینت (بدون تغییر)
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

export default StandaloneComments;
