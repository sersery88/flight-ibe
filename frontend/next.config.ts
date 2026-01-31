import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: 'export',
  distDir: 'dist',
  images: {
    unoptimized: true,
  },
  experimental: {
    // Turbopack persistent filesystem caching
    turbopackFileSystemCacheForDev: true,
    turbopackFileSystemCacheForBuild: true,
    // Enable View Transitions API for smooth page navigations
    viewTransition: true,
  },
};

export default nextConfig;
