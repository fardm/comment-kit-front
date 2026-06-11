import { QuartzComponent } from '@quartz-community/types';

interface ExampleComponentOptions {
    backendUrl?: string;
}
declare const _default: (opts?: ExampleComponentOptions) => QuartzComponent;

export { _default as ExampleComponent, type ExampleComponentOptions };
