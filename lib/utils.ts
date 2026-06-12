import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number, decimals = 0) {
  return new Intl.NumberFormat("en-CA", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(n);
}

export function stockStatus(qty: number, min: number, reorderPoint: number) {
  if (qty <= 0) return "OUT_OF_STOCK" as const;
  if (qty <= min) return "URGENT" as const;
  if (qty <= reorderPoint) return "LOW_STOCK" as const;
  return "OK" as const;
}

export function monthsOfStock(qty: number, avgMonthly: number) {
  if (avgMonthly <= 0) return null;
  return qty / avgMonthly;
}

export function generatePoNumber() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `PO-${y}${m}-${rand}`;
}
