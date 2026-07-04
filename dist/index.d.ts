import { QuartzComponent } from '@quartz-community/types';
export { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from '@quartz-community/types';

/**
 * StandaloneCommentsOptions — see README.md for full documentation.
 */
interface StandaloneCommentsOptions {
    backendUrl?: string;
    type?: "full" | "recent";
    title?: string;
    limit?: number;
    recentPagesUrl?: string[];
}
declare const _default: (opts?: StandaloneCommentsOptions) => QuartzComponent;

export { _default as StandaloneComments, type StandaloneCommentsOptions };
