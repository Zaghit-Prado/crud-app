import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/crud-app',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;