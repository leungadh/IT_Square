import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
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
    // Merge from JS config
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  env: {
    // Existing
    APPSYNC_URL: 'https://l3l5x22umzg4zmhpikypjx2mce.appsync-api.ap-east-1.amazonaws.com/graphql',
    APPSYNC_KEY: 'da2-gbimuwow5jbffe4azr45txexou',
    AWS_REGION: 'ap-east-1',
    S3_BUCKET: 'itsquareupdatedcontent',
    // Merged from JS config
    AWS_PROFILE: 'default',
    AWS_CONFIG_FILE: '/Users/singwaijong/itsquare_react/aws/config',
    AWS_SHARED_CREDENTIALS_FILE: '/Users/singwaijong/itsquare_react/aws/credentials',
    USE_DYNAMODB_IN_DEV: 'true',
    DEBUG_AWS_CONFIG: 'true',
  },
  // Merged from JS config
  serverExternalPackages: ['@aws-sdk/client-dynamodb', '@aws-sdk/lib-dynamodb'],
  output: 'standalone',
  outputFileTracingRoot: process.cwd(),
  trailingSlash: false,
  generateEtags: false,
};

export default nextConfig;
