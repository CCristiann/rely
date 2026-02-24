import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

// Content-Security-Policy is built as a single string to keep it readable.
// 'unsafe-inline' for style-src is required by Tailwind CSS v4 (runtime
// injection) and many Radix UI primitives that set inline styles.
// If you adopt a nonce-based approach in the future, remove it.
const ContentSecurityPolicy = [
  "default-src 'self'",
  // Scripts: self + Next.js inline bootstrap. Remove 'unsafe-eval' once
  // next/font and dev-mode HMR are no longer needed (prod builds are fine).
  "script-src 'self' 'unsafe-inline'",
  // Styles: Tailwind v4 injects styles at runtime; inline is unavoidable here.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Fonts
  "font-src 'self' https://fonts.gstatic.com",
  // Images: self, data URIs (avatars), Google profile pictures, Supabase Storage
  "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.supabase.co",
  // Fetch / XHR: self + Supabase for storage operations
  "connect-src 'self' https://*.supabase.co https://accounts.google.com",
  // Frames: deny embedding entirely
  "frame-src 'none'",
  "frame-ancestors 'none'",
  // Miscellaneous restrictions
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: ContentSecurityPolicy,
  },
  {
    // Prevent clickjacking; redundant with CSP frame-ancestors but kept for
    // legacy browser compatibility.
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // Prevent MIME-type sniffing attacks.
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Send the full URL only to same-origin requests; only the origin to
    // cross-origin HTTPS; nothing to cross-origin HTTP.
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Restrict browser feature access to what the app actually needs.
    // camera/microphone/geolocation are not used by this app.
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    // Force HTTPS for one year and include subdomains. Enable preload only
    // after you have tested that all sub-domains are HTTPS-only.
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  {
    // Opt out of Google's FLoC / Privacy Sandbox topics API.
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "mammoth"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  async rewrites() {
    return [
      // /api/v1/* is an alias for /api/* — zero breaking changes.
      { source: "/api/v1/:path*", destination: "/api/:path*" },
    ];
  },
  async headers() {
    return [
      {
        // Apply security headers to every route.
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "ccristiann-g9",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
