import { z } from "zod";

/**
 * The Market Intelligence API routes an agent is most likely to need, as tool definitions shared by the ElizaOS
 * plugin and the Coinbase AgentKit action provider. Each tool maps its arguments to one HTTP call; prices are the
 * x402 prices of the routes (USD per call).
 */
export interface Tool<S extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  priceUsd: number;
  schema: S;
  /** Path and query of the call, built from validated arguments. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  path: (args: any) => string;
}

const q = (params: Record<string, unknown>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") s.set(k, String(v));
  const out = s.toString();
  return out ? `?${out}` : "";
};
const seg = (v: string) => encodeURIComponent(v.trim());

const symbol = z.string().min(1).describe("Crypto pair or US stock ticker, e.g. ETHUSD, BTCUSD, NVDA, TSLA");
const chainEvm = z.enum(["base", "ethereum", "arbitrum", "optimism", "polygon"]);

export const TOOLS = [
  {
    name: "get_trading_decision",
    description: "Live trading decision for a crypto pair or US stock ($0.05): action STRONG_BUY..STRONG_SELL, conviction, a GO/WAIT answer for a side, the stance of each pillar (order flow, technicals, smart money, fundamentals, insiders, perps, market risk, news) and the measured hit rate.",
    priceUsd: 0.05,
    schema: z.object({ symbol, side: z.enum(["buy", "sell"]).optional().describe("The side you intend to trade") }),
    path: (a: { symbol: string; side?: string }) => `/api/v1/decision/lite/${seg(a.symbol)}${q({ side: a.side })}`,
  },
  {
    name: "check_token_risk",
    description: "Due diligence on a token before buying it ($0.02): sell simulation (honeypot), owner and admin functions, liquidity, LP burn, taxes, holder concentration, Uniswap v4 hooks, impersonation of USDC/USDT/WETH, and a verdict LOW_RISK, CAUTION or HIGH_RISK. EVM chains or Solana (chain=solana with a mint).",
    priceUsd: 0.02,
    schema: z.object({
      address: z.string().min(32).describe("Token contract address (0x...) or Solana mint"),
      chain: z.enum(["base", "ethereum", "arbitrum", "optimism", "polygon", "solana"]).default("base"),
    }),
    path: (a: { address: string; chain: string }) => `/api/v1/intelligence/token-risk/${seg(a.address)}${q({ chain: a.chain })}`,
  },
  {
    name: "find_new_tokens",
    description: "Tokens launched in the last hour on Base or Ethereum, already risk-checked ($0.02): new Uniswap v2/v3/v4 and Aerodrome pools with liquidity, sell simulation, v4 hook powers, token age and a verdict. Filter to LOW_RISK to keep only the safest.",
    priceUsd: 0.02,
    schema: z.object({
      chain: z.enum(["base", "ethereum"]).default("base"),
      minutes: z.number().int().min(5).max(1440).default(60),
      verdict: z.enum(["LOW_RISK", "CAUTION", "HIGH_RISK"]).optional(),
      minLiquidityUsd: z.number().min(0).default(10000),
    }),
    path: (a: { chain: string; minutes: number; verdict?: string; minLiquidityUsd: number }) =>
      `/api/v1/intelligence/new-tokens${q({ chain: a.chain, minutes: a.minutes, verdict: a.verdict, minLiquidityUsd: a.minLiquidityUsd })}`,
  },
  {
    name: "get_swap_quote",
    description: "What a swap returns right now on the best on-chain route ($0.002): Uniswap v2/v3/v4 and Aerodrome, direct or via WETH, with price impact, minimum received and hook warnings. Simulated, nothing is executed.",
    priceUsd: 0.002,
    schema: z.object({
      chain: chainEvm.default("base"),
      sell: z.string().describe("ETH, WETH, USDC or a token address"),
      buy: z.string().describe("ETH, WETH, USDC or a token address"),
      amount: z.string().describe("Amount of the sell token, e.g. 100"),
    }),
    path: (a: { chain: string; sell: string; buy: string; amount: string }) =>
      `/api/v1/intelligence/quote${q({ chain: a.chain, sell: a.sell, buy: a.buy, amount: a.amount })}`,
  },
  {
    name: "explain_price_move",
    description: "Why is a symbol moving ($0.02)? The 15-minute move and its likely drivers from on-chain order flow, unusual activity, smart money, perp crowding, news of 48h, SEC filings and insiders, with direction and weight and a one-sentence summary.",
    priceUsd: 0.02,
    schema: z.object({ symbol }),
    path: (a: { symbol: string }) => `/api/v1/explain/${seg(a.symbol)}`,
  },
  {
    name: "get_market_regime",
    description: "The current crypto market regime ($0.005): BULLISH, BEARISH or MIXED with breadth, buy pressure, momentum, stablecoin flows, upcoming macro events and the leading assets. Use to set risk before trading.",
    priceUsd: 0.005,
    schema: z.object({ window: z.enum(["1m", "5m", "15m"]).default("5m") }),
    path: (a: { window: string }) => `/api/v1/intelligence/regime${q({ window: a.window })}`,
  },
  {
    name: "get_macro_calendar",
    description: "Upcoming high-impact macro events in UTC ($0.002): CPI, jobs report, PCE, GDP, FOMC and ECB decisions. Avoid opening positions right before them.",
    priceUsd: 0.002,
    schema: z.object({ days: z.number().int().min(1).max(60).default(14), importance: z.enum(["high", "medium", "all"]).default("high") }),
    path: (a: { days: number; importance: string }) => `/api/v1/calendar${q({ days: a.days, importance: a.importance })}`,
  },
  {
    name: "get_futures_positioning",
    description: "CFTC Commitments of Traders ($0.005): how futures speculators are positioned in gold, oil, S&P 500, Nasdaq, Treasuries, dollar, euro, yen, bitcoin, ether and more, with a 3-year COT index flagging crowded longs and shorts. Omit market for all 24 markets.",
    priceUsd: 0.005,
    schema: z.object({ market: z.string().optional().describe("gold, wti, sp500, ust10y, eur, bitcoin (aliases GOLD, SPY, BTC work)") }),
    path: (a: { market?: string }) => (a.market ? `/api/v1/cot/${seg(a.market)}` : "/api/v1/cot"),
  },
  {
    name: "get_stock_fundamentals",
    description: "Fundamentals of up to 10 US-listed companies from SEC filings ($0.03 per call): revenue, earnings, margins, growth, balance sheet and a fundamental signal.",
    priceUsd: 0.03,
    schema: z.object({ symbols: z.array(z.string()).min(1).max(10).describe("US tickers, e.g. [\"AAPL\", \"MSFT\"]") }),
    path: (a: { symbols: string[] }) => `/api/v1/fundamentals/batch${q({ symbols: a.symbols.join(",") })}`,
  },
  {
    name: "get_insider_trades",
    description: "Are a company's insiders buying or selling ($0.01)? SEC Form 4 open-market buys and sales, 10b5-1 plans and a signal (CLUSTER_BUYING, NET_BUYING, PLANNED_SELLING, NET_SELLING).",
    priceUsd: 0.01,
    schema: z.object({ symbol: z.string().describe("US ticker, e.g. TSLA"), days: z.number().int().min(1).max(365).default(90) }),
    path: (a: { symbol: string; days: number }) => `/api/v1/insiders/${seg(a.symbol)}${q({ days: a.days })}`,
  },
  {
    name: "get_decision_track_record",
    description: "FREE: live hit rates of the trading decisions after 1h, 4h and 24h, and the measured accuracy of each pillar. Check before trusting a decision.",
    priceUsd: 0,
    schema: z.object({ days: z.number().int().min(1).max(30).default(30) }),
    path: (a: { days: number }) => `/api/v1/decision/track-record${q({ days: a.days })}`,
  },
] as const satisfies readonly Tool[];

export type ToolName = (typeof TOOLS)[number]["name"];
