import { vercelPreset } from "@vercel/react-router/vite";
import type { Config } from "@react-router/dev/config";

export default {
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
  presets: [vercelPreset()],
  prerender: ['/', '/register', "/login"],

  // Inline the full route manifest in the initial HTML instead of fetching
  // it lazily from /__manifest. Vercel was serving prerendered index.html
  // for /__manifest and caching that bad mapping at the CDN edge, breaking
  // all client-side navigation.
  routeDiscovery: { mode: "initial" },
} satisfies Config;
