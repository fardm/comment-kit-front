# Quartz Standalone Comments

A Quartz plugin for integrating with [comment-kit](https://github.com/fardm/comment-kit), a modern comment system built on Cloudflare Workers + D1.

This is the **frontend** half of the system. It injects a comments section (or a recent-comments sidebar widget) into Quartz pages and wires it up to the comment-kit REST API exposed by your Cloudflare Worker.

## Installation

1. Install the plugin in your Quartz site:

```bash
npm install quartz-standalone-comments
```

2. Configure the plugin in your `quartz.config.ts`:

```typescript
import { StandaloneComments } from "quartz-standalone-comments/components";

const plugins: Plugins = {
  components: {
    // Full comments section, rendered on every content page.
    StandaloneComments: StandaloneComments({
      backendUrl: "https://comments.example.com", // your Worker URL
      type: "full",
    }),

    // Optional sidebar widget showing recent comments across the site.
    // Place this in the `right` or `left` component slot.
    RecentComments: StandaloneComments({
      backendUrl: "https://comments.example.com",
      type: "recent",
      title: "Recent Comments",
      limit: 5,
      // The backend has no global "recent comments" endpoint, so the
      // widget polls an explicit allow-list of pages. Without this,
      // the widget renders an empty state with a console warning.
      recentPagesUrl: [
        "https://example.com/posts/welcome",
        "https://example.com/posts/getting-started",
        "https://example.com/posts/announcing-v2",
      ],
    }),
  },
};
```

## Backend Setup

This plugin requires the [comment-kit](https://github.com/fardm/comment-kit) backend to be deployed. Follow the installation instructions in the comment-kit repository to set up your Cloudflare Worker with D1 database.

You must also configure the Worker's `ALLOWED_ORIGINS` to include the origin of your Quartz site, otherwise the browser will block all cross-origin requests from the plugin to the Worker:

```toml
# wrangler.toml on the Worker
[vars]
ALLOWED_ORIGINS = "https://example.com,https://www.example.com"
```

## Features

- **Full Comments Section**: Display threaded comments with an inline reply form on individual pages.
- **Comment Form**: Name + email + optional website + content, with client-side validation. Email is never shown publicly (the backend strips it on read).
- **Emoji Reactions**: Per-comment emoji reactions (heart, thumbs up/down, laugh, cry, fire, clap). Toggle on/off. Persists per-browser in `localStorage` for instant UI feedback.
- **Post-Level Reactions**: React to the page itself without leaving a comment.
- **Email Subscriptions**: A "email me when new comments are posted" checkbox on the form creates a subscription tied to the current page.
- **Recent Comments Widget**: Show recent comments in your sidebar.
- **SPA Navigation Support**: Re-initializes on Quartz client-side navigation without leaking listeners.
- **Frontmatter Control**: Disable comments on specific pages with `comments: false` in the page's YAML frontmatter.
- **Dark Mode**: Inherits Quartz's `data-theme="dark"` and dark-mode CSS variables.

## Configuration Options

| Option           | Type                 | Default       | Description                                                                                    |
| ---------------- | -------------------- | ------------- | ---------------------------------------------------------------------------------------------- |
| `backendUrl`     | `string`             | `"/comments"` | Origin of your comment-kit Worker (no trailing slash).                                         |
| `type`           | `"full" \| "recent"` | `"full"`      | `full` renders the comment section on the page; `recent` renders the sidebar widget.           |
| `title`          | `string`             | `""`          | Title for the recent-comments widget. Ignored in `full` mode.                                  |
| `limit`          | `number`             | `5`           | Max comments for the recent widget. Ignored in `full` mode.                                    |
| `recentPagesUrl` | `string[]`           | `[]`          | Pages to poll for the recent widget (absolute URLs). Required for the widget to show anything. |

## How `page_url` works

The backend uses `page_url` as the partition key for comments — every comment is tied to the exact string the frontend sends at submission time. This plugin uses `window.location.href` (with the URL hash stripped) as the canonical `page_url` so that:

- the same article under two anchors shares one comment thread,
- the URL the backend stores is a real, clickable absolute URL (which is what the recent-comments widget needs to deep-link back to the comment),
- the plugin works regardless of whether Quartz is served from the root of a domain or from a subpath.

If you previously had comments stored under a different `page_url` scheme (e.g. relative slugs from an earlier version of this plugin), you'll need to migrate them in the admin panel — either by editing each comment's `page_url` or by exporting → transforming → re-importing.

## API endpoints used by this plugin

All of these are documented in the [comment-kit README](https://github.com/fardm/comment-kit#api-endpoints):

| Method | Endpoint                            | Purpose                                                      |
| ------ | ----------------------------------- | ------------------------------------------------------------ |
| GET    | `/api/comments?page_url=…&sort=asc` | Fetch the comment tree for a page.                           |
| POST   | `/api/comments`                     | Submit a new comment (or reply).                             |
| POST   | `/api/vote`                         | Toggle an emoji reaction on a comment.                       |
| GET    | `/api/post-reaction?page_url=…`     | Fetch aggregate post-level reactions.                        |
| POST   | `/api/post-reaction`                | Toggle a post-level reaction.                                |
| POST   | `/api/subscribe`                    | Subscribe the submitted email to notifications for the page. |

## Migration from PHP Backend

If you're migrating from the old PHP backend:

1. Export your data using the PHP admin panel.
2. Import the JSON file using the new comment-kit admin panel.
3. Update your Quartz configuration to use the new Worker URL.
4. Deploy the Cloudflare Worker.
5. Update DNS to point to the Worker.
6. If your old comments were stored under relative `page_url` values, run a one-time migration in the admin panel to rewrite them to absolute URLs.

## License

MIT
