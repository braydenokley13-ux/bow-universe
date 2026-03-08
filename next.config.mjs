import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.dirname(fileURLToPath(import.meta.url));

function normalizeOrigin(value) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`).host;
  } catch {
    return null;
  }
}

function collectServerActionOrigins() {
  const configuredOrigins = (process.env.NEXT_SERVER_ACTION_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(
    new Set(
      [
        "localhost:3000",
        "127.0.0.1:3000",
        process.env.NEXTAUTH_URL,
        process.env.VERCEL_URL,
        process.env.VERCEL_BRANCH_URL,
        process.env.VERCEL_PROJECT_PRODUCTION_URL,
        ...configuredOrigins
      ]
        .map(normalizeOrigin)
        .filter(Boolean)
    )
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: workspaceRoot
  },
  experimental: {
    serverActions: {
      allowedOrigins: collectServerActionOrigins()
    }
  }
};

export default nextConfig;
