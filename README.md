# Quartz Standalone Comments

A Quartz plugin for integrating with [comment-kit](https://github.com/fardm/comment-kit), a modern comment system built on Cloudflare Workers + D1.

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
    StandaloneComments: StandaloneComments({
      backendUrl: "https://your-comment-kit-worker.workers.dev",
      type: "full", // or "recent" for sidebar widget
      title: "Recent Comments", // only for recent widget
      limit: 5, // only for recent widget
    }),
  },
};
```

## Backend Setup

This plugin requires the [comment-kit](https://github.com/fardm/comment-kit) backend to be deployed. Follow the installation instructions in the comment-kit repository to set up your Cloudflare Worker with D1 database.

## Features

- **Full Comments Section**: Display and manage comments on individual pages
- **Recent Comments Widget**: Show recent comments in your sidebar
- **SPA Navigation Support**: Works seamlessly with Quartz's client-side navigation
- **Frontmatter Control**: Disable comments on specific pages with `comments: false`

## Configuration Options

- `backendUrl`: URL of your comment-kit backend (default: `/comments`)
- `type`: `"full"` for full comments section or `"recent"` for widget (default: `"full"`)
- `title`: Widget title (only for recent widget mode)
- `limit`: Number of recent comments to display (default: `5`)

## Migration from PHP Backend

If you're migrating from the old PHP backend:

1. Export your data using the PHP admin panel
2. Import the JSON file using the new comment-kit admin panel
3. Update your Quartz configuration to use the new backend URL
4. Deploy the Cloudflare Worker
5. Update DNS to point to the Worker
