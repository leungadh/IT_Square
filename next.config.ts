import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.pixabay.com',
      },
      {
        protocol: 'https',
        hostname: 'itsquareupdatedcontent.s3.ap-east-1.amazonaws.com',
      },
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    
    // Image optimization for CloudFront
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 86400, // 24 hours
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  env: {
    APPSYNC_URL: 'https://l3l5x22umzg4zmhpikypjx2mce.appsync-api.ap-east-1.amazonaws.com/graphql',
    APPSYNC_KEY: 'da2-gbimuwow5jbffe4azr45txexou',
    AWS_REGION: 'ap-east-1',
    S3_BUCKET: 'itsquareupdatedcontent',
    AWS_PROFILE: 'default',
    AWS_CONFIG_FILE: '/Users/singwaijong/itsquare_react/aws/config',
    AWS_SHARED_CREDENTIALS_FILE: '/Users/singwaijong/itsquare_react/aws/credentials',
    USE_DYNAMODB_IN_DEV: 'true',
    DEBUG_AWS_CONFIG: 'true',
    BUILD_TIME: new Date().toISOString(),
  },
  
  serverExternalPackages: ['@aws-sdk/client-dynamodb', '@aws-sdk/lib-dynamodb'],
  output: 'standalone',
  outputFileTracingRoot: process.cwd(),
  trailingSlash: false,
  
  // Headers for caching optimization
  async headers() {
    return [
      // Static assets - long cache
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Vary',
            value: 'Accept-Encoding',
          },
        ],
      },
      // Images - medium cache
      {
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=86400',
          },
          {
            key: 'Vary',
            value: 'Accept-Encoding',
          },
        ],
      },
      // API routes - short cache with stale-while-revalidate
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
          },
          {
            key: 'Vary',
            value: 'Accept-Encoding, Accept',
          },
        ],
      },
      // JSON files - short cache
      {
        source: '/(.*).json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=180, s-maxage=180',
          },
          {
            key: 'Vary',
            value: 'Accept-Encoding',
          },
        ],
      },
      // HTML pages - short cache to prevent stale content
      {
        source: '/((?!_next|api|static).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
          },
          {
            key: 'Vary',
            value: 'Accept-Encoding, Accept-Language',
          },
        ],
      },
      // Security headers for all pages
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  
  // Redirects for SEO
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      {
        source: '/index',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;