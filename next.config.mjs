import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: workspaceRoot
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"]
    }
  }
};

export default nextConfig;
