// فقط کامپوننت کامنت صادر می‌شود تا هیچ تداخلی با پلاگین‌های دیگر ایجاد نشود
export { default as ExampleComponent } from "./components/ExampleComponent";

// صادر کردن تایپ آپشن‌های کامپوننت شما
export type { ExampleComponentOptions } from "./components/ExampleComponent";

// Re-export shared types from @quartz-community/types
export type {
  QuartzComponent,
  QuartzComponentProps,
  QuartzComponentConstructor,
  StringResource,
  QuartzPageTypePlugin,
  QuartzPageTypePluginInstance,
  PageMatcher,
  PageGenerator,
  VirtualPage,
} from "@quartz-community/types";
