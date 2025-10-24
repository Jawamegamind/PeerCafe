import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // ESLint configuration for builds
  eslint: {
    // Only run ESLint on specific directories during builds
    dirs: ['app', 'utils'],
    // Don't fail builds on ESLint errors in development/CI
    ignoreDuringBuilds: true,
  },
  
  // TypeScript configuration
  typescript: {
    // Don't fail builds on TypeScript errors in development/CI
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
