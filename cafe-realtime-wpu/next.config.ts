import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  devIndicators: false,
  images: {
    domains: [
      "https://ajozhknwturjevgopgll.storage.supabase.co",
      "https://ajozhknwturjevgopgll.supabase.co",
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ajozhknwturjevgopgll.storage.supabase.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ajozhknwturjevgopgll.supabase.co",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
