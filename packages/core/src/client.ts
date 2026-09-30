import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";
import { TOOLS, type Tool } from "./catalog.js";

export const DEFAULT_BASE_URL = "https://api.marketintelligenceapi.com";

export interface ClientOptions {
  /** API base URL (default https://api.marketintelligenceapi.com). */
  baseUrl?: string;
  /** A prepaid-credit key (mi_...): calls are paid from its balance, no wallet needed. */
  apiKey?: string;
  /** An EVM private key paying each call with x402 in USDC (Base by default). */
  privateKey?: `0x${string}`;
  /** A ready x402 client (e.g. built from an AgentKit wallet) instead of a private key. */
  x402?: x402Client;
  /** Largest price one call may cost, in USD (default 0.10): a guard against surprises. */
  maxPriceUsd?: number;
}

export interface CallResult {
  ok: boolean;
  status: number;
  data: unknown;
  /** Settlement transaction when the call was paid with x402. */
  transaction?: string;
  error?: string;
}

/** Calls the Market Intelligence API, paying with an API key (credits) or x402. */
export class MarketIntelligenceClient {
  readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly paidFetch: typeof fetch;
  private readonly maxPriceUsd: number;

  constructor(options: ClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.maxPriceUsd = options.maxPriceUsd ?? 0.1;
    let client = options.x402;
    if (!client && options.privateKey) {
      client = new x402Client();
      registerExactEvmScheme(client, { signer: privateKeyToAccount(options.privateKey) });
    }
    this.paidFetch = client ? wrapFetchWithPayment(fetch, client) : fetch;
  }

  /** Runs one catalog tool with raw arguments (validated against its schema). */
  async run(name: string, rawArgs: unknown): Promise<CallResult> {
    const tool = TOOLS.find((t) => t.name === name) as Tool | undefined;
    if (!tool) return { ok: false, status: 0, data: null, error: `Unknown tool ${name}` };
    if (tool.priceUsd > this.maxPriceUsd)
      return { ok: false, status: 0, data: null, error: `${name} costs $${tool.priceUsd}, above maxPriceUsd $${this.maxPriceUsd}` };
    const parsed = tool.schema.safeParse(rawArgs ?? {});
    if (!parsed.success) return { ok: false, status: 400, data: null, error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
    return this.get(tool.path(parsed.data));
  }

  /** GET a path of the API (paying if needed). */
  async get(path: string): Promise<CallResult> {
    const headers: Record<string, string> = { Accept: "application/json", "User-Agent": "market-intelligence-agent-plugins/0.1" };
    if (this.apiKey) headers["X-API-Key"] = this.apiKey;
    const res = await (this.apiKey ? fetch : this.paidFetch)(this.baseUrl + path, { headers });
    const text = await res.text();
    let data: unknown = text;
    try {
      data = JSON.parse(text);
    } catch {
      // not JSON
    }
    const settlement = res.headers.get("payment-response");
    let transaction: string | undefined;
    if (settlement) {
      try {
        transaction = JSON.parse(Buffer.from(settlement, "base64").toString("utf8")).transaction;
      } catch {
        // header unreadable
      }
    }
    if (res.status === 402) {
      const reason = (data as { reason?: string; error?: string })?.reason ?? (data as { error?: string })?.error;
      return { ok: false, status: 402, data, error: this.apiKey || this.paidFetch !== fetch
        ? `Payment not accepted: ${reason}` : "Payment required: configure an API key (prepaid credits) or an EVM private key with USDC on Base" };
    }
    return { ok: res.ok, status: res.status, data, transaction, error: res.ok ? undefined : `HTTP ${res.status}` };
  }
}
