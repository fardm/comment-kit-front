import { QuartzComponent } from '@quartz-community/types';
export { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from '@quartz-community/types';

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
interface StandaloneCommentsOptions {
    backendUrl?: string;
    type?: "full" | "recent";
    title?: string;
    limit?: number;
    /** Pages to poll for the recent-comments widget (absolute URLs). */
    recentPagesUrl?: string[];
}
declare const _default: (opts?: StandaloneCommentsOptions) => QuartzComponent;

export { _default as StandaloneComments, type StandaloneCommentsOptions };
