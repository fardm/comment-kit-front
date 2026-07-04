import { QuartzComponent } from '@quartz-community/types';
export { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from '@quartz-community/types';

interface StandaloneCommentsOptions {
    backendUrl?: string;
    type?: "full" | "recent";
    title?: string;
    limit?: number;
}
declare const _default: (opts?: StandaloneCommentsOptions) => QuartzComponent;

export { _default as StandaloneComments, type StandaloneCommentsOptions };
