import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@chakra-ui/react"],
  },
  images: {
    remotePatterns: [
      new URL(`${process.env.APP_URL!}/composited/**`),
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/composited/**',
        search: '',
      },
    ],
  },
};

export default nextConfig;
