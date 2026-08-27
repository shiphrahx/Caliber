import type { NextConfig } from "next";

const csp = [
  "default-src 'self'",
  // Next.js inline scripts + Supabase auth redirects
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // Supabase API + Edge Functions + Google Fonts + self
  "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co",
  // Google Fonts stylesheet
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Google Fonts font files
  "font-src 'self' https://fonts.gstatic.com",
  // Images: self, data URIs (avatars), Google user photos
  "img-src 'self' data: https://lh3.googleusercontent.com https://*.googleusercontent.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

/**
 * The GitHub Pages build.
 *
 * Pages serves files, not a server, so this mode exports the marketing pages
 * on their own. The workflow strips everything that needs a server first, and
 * headers() goes with it: a static host sets its own, and Next refuses to
 * export at all while it is declared.
 *
 * basePath is the repo name because this is a project site, served from
 * /Caliber rather than the root of the domain.
 */
const isPagesExport = process.env["PAGES_EXPORT"] === "1";

const nextConfig: NextConfig = isPagesExport
  ? {
      output: "export",
      basePath: "/Caliber",
      assetPrefix: "/Caliber",
      images: { unoptimized: true },
      trailingSlash: true,
      // Read by app/page.tsx, which has to prefix its own <img> tags.
      env: { NEXT_PUBLIC_BASE_PATH: "/Caliber" },
    }
  : {
      async headers() {
        return [
          {
            source: "/(.*)",
            headers: securityHeaders,
          },
        ];
      },
    };

export default nextConfig;
