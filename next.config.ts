import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["oracledb"],

  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
