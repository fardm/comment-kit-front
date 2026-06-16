import { QuartzComponent } from '@quartz-community/types';
export { PageGenerator, PageMatcher, QuartzComponent, QuartzComponentConstructor, QuartzComponentProps, QuartzPageTypePlugin, QuartzPageTypePluginInstance, StringResource, VirtualPage } from '@quartz-community/types';

interface StandaloneCommentsOptions {
    backendUrl?: string;
    type?: "full" | "recent";
    title?: string;
    limit?: number;
}
declare const _default: (opts?: StandaloneCommentsOptions) => QuartzComponent;

export { _default as StandaloneComments, type StandaloneCommentsOptions };
