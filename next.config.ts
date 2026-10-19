import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/product/:slug', destination: '/products/:slug', permanent: true },
      { source: '/product-category/:slug', destination: '/products/category/:slug', permanent: true },
      { source: '/فروشگاه', destination: '/products', permanent: true },
    ];
  },
  images:{
    remotePatterns:[
      {
        protocol: 'https',
        hostname: 'nrhstore.ir',
        port: '',
        pathname: '/wp-content/uploads/**',
      },
      ...(process.env.WP_API_URL ? [{
        protocol: new URL(process.env.WP_API_URL).protocol.replace(':', '') as 'http' | 'https',
        hostname: new URL(process.env.WP_API_URL).hostname,
        port: new URL(process.env.WP_API_URL).port,
        pathname: '/wp-content/uploads/**',
      }] : []),
    ]
  }
  /* config options here */
};

export default nextConfig;
