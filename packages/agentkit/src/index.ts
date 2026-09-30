import { customActionProvider, EvmWalletProvider, type WalletProvider } from "@coinbase/agentkit";
import { x402Client } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { MarketIntelligenceClient, TOOLS, type Tool } from "market-intelligence-core";

export interface MarketIntelligenceProviderOptions {
  /** Prepaid-credit key (mi_...): calls are paid from its balance instead of the agent's wallet. */
  apiKey?: string;
  baseUrl?: string;
  /** Largest price one call may cost, in USD (default 0.10). */
  maxPriceUsd?: number;
}

/**
 * Coinbase AgentKit action provider for the Market Intelligence API. Each call is paid by the agent's own wallet with
 * x402 (USDC on Base) unless an API key with prepaid credits is given.
 *
 *   const agentkit = await AgentKit.from({ walletProvider, actionProviders: [marketIntelligenceActionProvider()] });
 */
export function marketIntelligenceActionProvider(options: MarketIntelligenceProviderOptions = {}) {
  const clients = new WeakMap<object, MarketIntelligenceClient>();
  const clientFor = (walletProvider: WalletProvider) => {
    let c = clients.get(walletProvider);
    if (c) return c;
    let x402: x402Client | undefined;
    if (!options.apiKey && walletProvider instanceof EvmWalletProvider) {
      x402 = new x402Client();
      registerExactEvmScheme(x402, { signer: walletProvider.toSigner() as never });
    }
    c = new MarketIntelligenceClient({ apiKey: options.apiKey, baseUrl: options.baseUrl, maxPriceUsd: options.maxPriceUsd, x402 });
    clients.set(walletProvider, c);
    return c;
  };
  return customActionProvider<WalletProvider>(
    (TOOLS as readonly Tool[]).map((tool) => ({
      name: `market_intelligence_${tool.name}`,
      description: tool.description,
      schema: tool.schema,
      invoke: async (walletProvider: WalletProvider, args: unknown) => {
        const r = await clientFor(walletProvider).run(tool.name, args);
        return JSON.stringify(r.ok ? { data: r.data, transaction: r.transaction } : { error: r.error, status: r.status });
      },
    })),
  );
}

export default marketIntelligenceActionProvider;
