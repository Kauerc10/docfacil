import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // pdfmake relies on Node filesystem/font resolution and must stay external.
  // firebase-admin is intentionally bundled by Next: externalizing it made the
  // Vercel runtime load jwks-rsa through native require(), which crashed on its
  // ESM-only jose dependency before our API handlers could run.
  serverExternalPackages: ["pdfmake"],
  reactStrictMode: false,
  async headers() {
    return [
      {
        source: "/d/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0",
          },
          {
            key: "Referrer-Policy",
            value: "no-referrer",
          },
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
