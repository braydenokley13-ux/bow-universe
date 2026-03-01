import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value * 1_000_000);
}

export function formatCompactCurrency(value: number) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1
  }).format(value)}M`;
}

export function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function roundTo(value: number, decimals = 2) {
  const power = 10 ** decimals;
  return Math.round(value * power) / power;
}

export function parseStringList(value: FormDataEntryValue | null) {
  if (!value || typeof value !== "string") {
    return [];
  }

  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseJsonText<T>(value: FormDataEntryValue | null, fallback: T): T {
  if (!value || typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  return JSON.parse(value) as T;
}

export function safeNumber(value: number | null | undefined, fallback = 0) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

export function ensureArray<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value == null) {
    return [];
  }

  return [value];
}
