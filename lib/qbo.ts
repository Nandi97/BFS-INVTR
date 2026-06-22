import { prisma } from "@/lib/prisma";

// ─── Constants ────────────────────────────────────────────────────────────────

export const QBO_AUTH_URL  = "https://appcenter.intuit.com/connect/oauth2";
export const QBO_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
export const QBO_REVOKE_URL = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";
export const QBO_SCOPE     = "com.intuit.quickbooks.accounting";

const IS_SANDBOX = process.env.QBO_ENVIRONMENT !== "production";
export const QBO_API_BASE = IS_SANDBOX
  ? "https://sandbox-quickbooks.api.intuit.com/v3/company"
  : "https://quickbooks.api.intuit.com/v3/company";

// ─── QB Item shape ────────────────────────────────────────────────────────────

export interface QboItem {
  Id:                 string;
  Name:               string;
  FullyQualifiedName: string;
  Sku?:               string;
  Active:             boolean;
  Type:               string;
  QtyOnHand?:         number;
  ReorderPoint?:      number;
  UnitPrice?:         number;
  PurchaseCost?:      number;
}

// ─── QB Invoice shapes ────────────────────────────────────────────────────────

export interface QboInvoiceLine {
  DetailType: string;
  SalesItemLineDetail?: {
    ItemRef: { value: string; name: string };
    Qty?:    number;
  };
  Amount?: number;
}

export interface QboInvoice {
  Id:          string;
  DocNumber:   string;
  TxnDate:     string; // "YYYY-MM-DD"
  CustomerRef?: { value: string; name: string };
  Line:        QboInvoiceLine[];
}

/** Fetch all QB Invoices on or after fromDate ("YYYY-MM-DD"), paging through all results. */
export async function fetchQboInvoices(fromDate: string): Promise<QboInvoice[]> {
  const invoices: QboInvoice[] = [];
  const PAGE = 1000;
  let start = 1;

  while (true) {
    const query = `SELECT * FROM Invoice WHERE TxnDate >= '${fromDate}' STARTPOSITION ${start} MAXRESULTS ${PAGE}`;
    const res = await qboFetch(`/query?query=${encodeURIComponent(query)}`);

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`QBO invoice query failed: ${res.status} ${txt.slice(0, 300)}`);
    }

    const data = await res.json();
    const page: QboInvoice[] = data?.QueryResponse?.Invoice ?? [];
    invoices.push(...page);

    if (page.length < PAGE) break;
    start += PAGE;
  }

  return invoices;
}

/** Fetch Inventory items from QB, paging through all results. Pass activeOnly=false to fetch inactive items instead. */
export async function fetchQboItems(activeOnly = true): Promise<QboItem[]> {
  const items: QboItem[] = [];
  const PAGE = 1000;
  let start = 1;

  while (true) {
    const activeClause = activeOnly ? "AND Active = true" : "AND Active = false";
    const query = `SELECT * FROM Item WHERE Type = 'Inventory' ${activeClause} STARTPOSITION ${start} MAXRESULTS ${PAGE}`;
    const res = await qboFetch(`/query?query=${encodeURIComponent(query)}`);

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`QBO items query failed: ${res.status} ${txt.slice(0, 300)}`);
    }

    const data = await res.json();
    const page: QboItem[] = data?.QueryResponse?.Item ?? [];
    items.push(...page);

    if (page.length < PAGE) break;
    start += PAGE;
  }

  return items;
}

// ─── Token shape (stored inside integrationConfig.config) ─────────────────────

export interface QboTokens {
  accessToken:              string;
  refreshToken:             string;
  realmId:                  string;
  accessTokenExpiresAt:     string; // ISO
  refreshTokenExpiresAt:    string; // ISO
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

export async function getQboTokens(): Promise<QboTokens | null> {
  const row = await prisma.integrationConfig.findUnique({
    where: { provider: "QUICKBOOKS" },
  });
  if (!row) return null;
  const cfg = row.config as Record<string, unknown>;
  const oauth = cfg.oauth as QboTokens | undefined;
  return oauth ?? null;
}

async function saveQboTokens(tokens: QboTokens) {
  const row = await prisma.integrationConfig.findUnique({
    where: { provider: "QUICKBOOKS" },
  });
  const existing = (row?.config as Record<string, unknown>) ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const next = { ...existing, oauth: tokens } as any;
  await prisma.integrationConfig.upsert({
    where:  { provider: "QUICKBOOKS" },
    update: { config: next, isActive: true, lastSyncAt: new Date() },
    create: { provider: "QUICKBOOKS", config: next, isActive: true },
  });
}

export async function clearQboTokens() {
  const row = await prisma.integrationConfig.findUnique({
    where: { provider: "QUICKBOOKS" },
  });
  if (!row) return;
  const { oauth: _, ...rest } = (row.config as Record<string, unknown> & { oauth?: unknown });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.integrationConfig.update({
    where: { provider: "QUICKBOOKS" },
    data:  { config: rest as any, isActive: false },
  });
}

// ─── OAuth helpers ────────────────────────────────────────────────────────────

function basicAuth() {
  const id     = process.env.QBO_CLIENT_ID!;
  const secret = process.env.QBO_CLIENT_SECRET!;
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

export async function exchangeCodeForTokens(code: string, realmId: string): Promise<QboTokens> {
  const res = await fetch(QBO_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization:  basicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept:         "application/json",
    },
    body: new URLSearchParams({
      grant_type:   "authorization_code",
      code,
      redirect_uri: process.env.QBO_REDIRECT_URI!,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`QBO token exchange failed: ${res.status} ${txt}`);
  }

  const data = await res.json();
  const now  = Date.now();

  const tokens: QboTokens = {
    accessToken:           data.access_token,
    refreshToken:          data.refresh_token,
    realmId,
    accessTokenExpiresAt:  new Date(now + data.expires_in * 1000).toISOString(),
    refreshTokenExpiresAt: new Date(now + data.x_refresh_token_expires_in * 1000).toISOString(),
  };

  await saveQboTokens(tokens);
  return tokens;
}

async function refreshTokens(current: QboTokens): Promise<QboTokens> {
  const res = await fetch(QBO_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization:  basicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept:         "application/json",
    },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      refresh_token: current.refreshToken,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`QBO token refresh failed: ${res.status} ${txt}`);
  }

  const data = await res.json();
  const now  = Date.now();

  const tokens: QboTokens = {
    accessToken:           data.access_token,
    refreshToken:          data.refresh_token ?? current.refreshToken,
    realmId:               current.realmId,
    accessTokenExpiresAt:  new Date(now + data.expires_in * 1000).toISOString(),
    refreshTokenExpiresAt: data.x_refresh_token_expires_in
      ? new Date(now + data.x_refresh_token_expires_in * 1000).toISOString()
      : current.refreshTokenExpiresAt,
  };

  await saveQboTokens(tokens);
  return tokens;
}

export async function revokeTokens(tokens: QboTokens) {
  // Revoke the refresh token (revokes both)
  await fetch(QBO_REVOKE_URL, {
    method: "POST",
    headers: {
      Authorization:  basicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept:         "application/json",
    },
    body: new URLSearchParams({ token: tokens.refreshToken }),
  });
}

// ─── Authenticated fetch with auto-refresh ────────────────────────────────────

export async function qboFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  let tokens = await getQboTokens();
  if (!tokens) throw new Error("QBO not connected");

  // Refresh if access token expires within 2 minutes
  if (new Date(tokens.accessTokenExpiresAt).getTime() - Date.now() < 120_000) {
    tokens = await refreshTokens(tokens);
  }

  const url = `${QBO_API_BASE}/${tokens.realmId}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
      Accept:        "application/json",
      ...(options.headers ?? {}),
    },
  });

  // One retry on 401 — token may have just expired
  if (res.status === 401) {
    tokens = await refreshTokens(tokens);
    return fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        Accept:        "application/json",
        ...(options.headers ?? {}),
      },
    });
  }

  return res;
}
