import type {
  QuartzComponent,
  QuartzComponentProps,
  QuartzComponentConstructor,
} from "@quartz-community/types";
import { classNames } from "../util/lang";

// تعریف اینترفیس آپشن‌ها با اضافه شدن فیلد limit
export interface StandaloneCommentsOptions {
  backendUrl?: string;
  type?: "full" | "recent";
  title?: string;
  limit?: number; // اضافه شدن آپشن تعداد کامنت‌ها برای ابزارک
}

export default ((opts?: StandaloneCommentsOptions) => {
  // تنظیم مقادیر پیش‌فرض طبق معماری استاندارد کوارتز
  const backendUrl = opts?.backendUrl ?? "/comments";
  const type = opts?.type ?? "full";
  const title = opts?.title ?? ""; // مقدار خالی یعنی عنوان به صورت خودکار از فایل زبان فچ می‌شود
  const limit = opts?.limit ?? 5; // تعداد پیش‌فرض نمایش کامنت‌ها روی ۵ عدد تنظیم شده است

  const Component: QuartzComponent = ({ displayClass, fileData }: QuartzComponentProps) => {
    // حالت اول: ابزارک آخرین نظرات برای سایدبار
    if (type === "recent") {
      return (
        <div class={classNames(displayClass, "recent-comments-widget")}>
          {/* شناسه منحصربه‌فرد برای تغییر پویا براساس زبان فرانت‌اند */}
          <h3 id="recent-comments-title">{title}</h3>
          <div
            id="recent-comments-container"
            data-backend-url={backendUrl}
            data-limit={limit}
            data-custom-title={opts?.title ? "true" : "false"}
          >
            <p style={{ fontSize: "0.9rem", color: "var(--gray)" }}>در حال بارگذاری...</p>
          </div>
        </div>
      );
    }

    // حالت دوم: باکس اصلی ثبت و نمایش کامنت‌ها (پیش‌فرض سیستم)
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
      // ۱. راه‌اندازی باکس اصلی کامنت‌ها در بخش بعد از بدنه صفحه (afterBody)
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

      // ۲. راه‌اندازی و تزریق دیتای آخرین کامنت‌ها در سایدبار (recent)
      const recentContainer = document.getElementById('recent-comments-container');
      if (recentContainer) {
        const backendUrl = recentContainer.getAttribute('data-backend-url');
        const limit = recentContainer.getAttribute('data-limit') || '5';
        const hasCustomTitle = recentContainer.getAttribute('data-custom-title') === 'true';
        
        const loadRecentComments = async () => {
          try {
            // دریافت زبان تنظیم شده در سرور (فایل config.php)
            let lang = 'en';
            try {
              const configRes = await fetch(backendUrl + '/api.php?action=widget_config');
              if (configRes.ok) {
                const config = await configRes.json();
                if (config.language) lang = config.language;
              }
            } catch(e) { 
              console.warn("امکان دریافت زبان از سرور وجود نداشت، استفاده از پیش‌فرض انگلیسی."); 
            }

            // لود داینامیک فایل زبان مربوطه در صورتی که قبلاً لود نشده باشد
            if (!window.COMMENTS_I18N) {
              await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = backendUrl + '/lang/' + lang + '.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
              });
            }

            // خواندن متغیرهای بومی‌سازی شده از فایل لود شده
            const t = window.COMMENTS_I18N.recentWidget || {
              title: 'Recent Comments', loading: 'Loading...', empty: 'No comments yet.', onPage: 'on page:', error: 'Error loading comments.', home: 'Home'
            };

            // اعمال هوشمند عنوان براساس زبان (اگر کاربر عنوان دستی در YAML وارد نکرده باشد)
            if (!hasCustomTitle) {
              const titleEl = document.getElementById('recent-comments-title');
              if (titleEl) titleEl.textContent = t.title;
            }

            // دریافت لیست کامنت‌ها براساس لیمیت مشخص شده در آپشن‌ها
            const response = await fetch(backendUrl + '/api.php?action=recent&limit=' + limit);
            if (!response.ok) throw new Error('Network error');
            const data = await response.json();
            
            if (data.error) throw new Error(data.error);
            
            if (!data.comments || data.comments.length === 0) {
              recentContainer.innerHTML = '<span style="color: var(--gray); font-size: 0.9em;">' + t.empty + '</span>';
              return;
            }

            // ساخت و رندر ساختار درختی ابزارک متناسب با تم کوارتز
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
}) satisfies QuartzComponentConstructor<StandaloneCommentsOptions>;
