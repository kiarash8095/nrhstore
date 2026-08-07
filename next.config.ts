import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images:{
    remotePatterns:[
      {
        protocol: 'https',
        hostname: 'nrhstore.ir',
        port: '',
        pathname: '/wp-content/uploads/**',
      },
    ]
  }
  /* config options here */
};

export default nextConfig;
