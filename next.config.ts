import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["oracledb"],

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Type",
            value: "text/html; charset=utf-8",
          },
        ],
        has: [
          {
            type: "header",
            key: "accept",
            value: ".*text/html.*",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Content-Type",
            value: "text/javascript; charset=utf-8",
          },
        ],
        has: [
          {
            type: "header",
            key: "accept",
            value: ".*javascript.*",
          },
        ],
      },
    ];
  },

  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
