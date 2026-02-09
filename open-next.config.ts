import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const config = defineCloudflareConfig({});

// Override buildCommand to avoid infinite recursion:
// Cloudflare runs `npm run build` → `opennextjs-cloudflare build` → buildNextjsApp()
// buildNextjsApp() defaults to `npm run build` again. Use `npx next build` directly.
config.buildCommand = "npx next build";

export default config;
