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
};

export default nextConfig;
