import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // External packages that should not be bundled
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth'],
  },
};

export default nextConfig;
