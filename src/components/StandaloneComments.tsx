import type {
  QuartzComponent,
  QuartzComponentProps,
  QuartzComponentConstructor,
} from "@quartz-community/types";

export interface StandaloneCommentsOptions {
  backendUrl?: string;
  type?: "full" | "recent";
  title?: string;
  limit?: number;
}

// Helper function to join CSS class names
function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export default ((opts?: StandaloneCommentsOptions) => {
  const backendUrl = opts?.backendUrl ?? "/comments";
  const type = opts?.type ?? "full";
  const title = opts?.title ?? "";
  const limit = opts?.limit ?? 5;

  const Component: QuartzComponent = ({ displayClass, fileData }: QuartzComponentProps) => {
    // Recent comments widget mode
    if (type === "recent") {
      return (
        <div class={classNames(displayClass, "recent-comments-widget")}>
          <h3 id="recent-comments-title">{title || "Recent Comments"}</h3>
          <div
            id="recent-comments-container"
            data-backend-url={backendUrl}
            data-limit={limit}
            data-custom-title={opts?.title ? "true" : "false"}
          >
            <p class="rc-widget-loading">Loading...</p>
          </div>
        </div>
      );
    }

    // Full comments section mode
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
        <div
          id="comments-container"
          data-api-url={`${backendUrl}/api/comments`}
          data-page-url={pageId}
        ></div>
      </div>
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
            const response = await fetch(backendUrl + '/api/comments?status=approved&sort=desc&limit=' + limit);
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
}) satisfies QuartzComponentConstructor<StandaloneCommentsOptions>;
