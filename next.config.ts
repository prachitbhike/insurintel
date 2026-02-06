import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/sectors",
        destination: "/",
        permanent: true,
      },
      {
        source: "/sectors/:slug",
        destination: "/?sector=:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
