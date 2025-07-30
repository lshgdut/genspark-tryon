import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';
const buildWithDocker = process.env.DOCKER === 'true';
const isDesktop = process.env.NEXT_PUBLIC_IS_DESKTOP_APP === '1';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH;
const isStandaloneMode = buildWithDocker || isDesktop;

const standaloneConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingIncludes: { '*': ['public/**/*', '.next/static/**/*'] },
};

const nextConfig: NextConfig = {
  ...(isStandaloneMode ? standaloneConfig : {}),
  basePath,
  compress: isProd,
  experimental: {
    // optimizePackageImports: ["@chakra-ui/react"],
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
  reactStrictMode: true,
};

// const noWrapper = (config: NextConfig) => config;

export default nextConfig;
