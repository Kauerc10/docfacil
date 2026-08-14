import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pdfmake", "firebase-admin"],
  reactStrictMode: false,
};

export default nextConfig;
