import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // permite todos os domínios (atenção: use apenas em dev ou se realmente necessário)
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  /* config options here */
};

export default nextConfig;
