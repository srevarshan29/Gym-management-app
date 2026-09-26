/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 14.2 defaults dynamic Router Cache staleTime to 30s, so shared
  // layouts (e.g. sidebar role gates from requireGym) stay stale on client
  // navigation until a hard reload. 0 = refetch RSC payloads each navigation.
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 180,
    },
  },
  async headers() {
    const sharedSecurityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
    ];

    return [
      {
        source: "/payments/:paymentId/receipt",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          ...sharedSecurityHeaders,
        ],
      },
      {
        // Do not send X-Frame-Options: DENY for receipt PDFs (same-origin preview).
        source: "/((?!payments/[^/]+/receipt).*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          ...sharedSecurityHeaders,
        ],
      },
    ];
  },
};

export default nextConfig;
