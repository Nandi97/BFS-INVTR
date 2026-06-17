export type ZenotiOrg = "bfs" | "bl";

export interface ZenotiCenter {
  id: string;
  name: string;
  code?: string;
}

export interface ZenotiPOItem {
  id?: string;
  product_code: string;
  product_name: string;
  retail_raised_qty: number;
  consumable_raised_qty: number;
  unit_price?: number;
}

export interface ZenotiPO {
  id: string;
  order_no: string;
  center_id: string;
  center_name: string;
  status: string; // "Raised" | "Updated" | "Delivered" | "Cancelled"
  raised_date?: string;
  deliver_by?: string;
  notes?: string;
  items: ZenotiPOItem[];
}

const ORG_CONFIG: Record<ZenotiOrg, { label: string; subdomain: string; envKey: string }> = {
  bfs: { label: "Beauty First Spa",   subdomain: "beautyfirstspa", envKey: "ZENOTI_BFS_API_KEY" },
  bl:  { label: "Beauty Logix",       subdomain: "beautylogix",    envKey: "ZENOTI_BL_API_KEY"  },
};

export function getZenotiApiKey(org: ZenotiOrg): string | undefined {
  return process.env[ORG_CONFIG[org].envKey];
}

export function getZenotiLabel(org: ZenotiOrg): string {
  return ORG_CONFIG[org].label;
}

async function zenotiGet<T>(org: ZenotiOrg, path: string): Promise<T> {
  const apiKey = getZenotiApiKey(org);
  if (!apiKey) throw new Error(`Missing ${ORG_CONFIG[org].envKey} env var`);

  const url = `https://api.zenoti.com${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `apikey ${apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Zenoti ${org} ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchZenotiCenters(org: ZenotiOrg): Promise<ZenotiCenter[]> {
  const data = await zenotiGet<{ centers?: ZenotiCenter[] }>(org, "/v1/centers");
  return data.centers ?? [];
}

export async function fetchZenotiPOs(
  org: ZenotiOrg,
  centerId: string,
  statuses: string[] = ["Raised", "Updated"],
): Promise<ZenotiPO[]> {
  const statusParam = statuses.join(",");
  const data = await zenotiGet<{ purchase_orders?: ZenotiPO[] }>(
    org,
    `/v1/procurement/purchase_orders?center_id=${centerId}&statuses=${encodeURIComponent(statusParam)}&size=100`,
  );
  return data.purchase_orders ?? [];
}

// Map Zenoti status string → our enum value
export function mapZenotiStatus(status: string): "RAISED" | "UPDATED" | "DELIVERED" | "CANCELLED" {
  const s = status.toUpperCase();
  if (s === "RAISED")    return "RAISED";
  if (s === "UPDATED")   return "UPDATED";
  if (s === "DELIVERED") return "DELIVERED";
  return "CANCELLED";
}
