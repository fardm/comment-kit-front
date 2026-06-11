import type {
  QuartzComponent,
  QuartzComponentProps,
  QuartzComponentConstructor,
} from "@quartz-community/types";
import { classNames } from "../util/lang";

// تعریف متغیر گزینه‌های ورودی کامپوننت برای آدرس بک‌اند شما
export interface ExampleComponentOptions {
  backendUrl?: string;
}

export default ((opts?: ExampleComponentOptions) => {
  // مقدار پیش‌فرض در صورت ست نشدن در فایل کانفیگ کوارتز
  const backendUrl = opts?.backendUrl ?? "/comments";

  const Component: QuartzComponent = ({ displayClass, fileData }: QuartzComponentProps) => {
    // غیرفعال کردن کامنت‌ها در صورت وجود comments: false در فرانت‌متر هر صفحه
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
        {/* بارگذاری استایل‌های سیستم کامنت */}
        <link rel="stylesheet" href={`${backendUrl}/comments.css`} />
        <div
          id="comments-container"
          data-api-url={`${backendUrl}/api.php`}
          data-page-url={pageId}
        ></div>
      </div>
    );
  };

  // تزریق اسکریپت با روش استاندارد کوارتز برای SPA
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
}) satisfies QuartzComponentConstructor<ExampleComponentOptions>;
