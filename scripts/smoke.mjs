// Live smoke test of the three packages. MI_API_KEY=mi_... node scripts/smoke.mjs
process.on("unhandledRejection", (e) => { if (!String(e).includes("HTTP error")) throw e; }); // AgentKit analytics rejects the fake test wallet
import { MarketIntelligenceClient, TOOLS } from "market-intelligence-core";
import { marketIntelligenceActionProvider } from "agentkit-market-intelligence";
import plugin from "elizaos-plugin-market-intelligence";

const apiKey = process.env.MI_API_KEY;
const client = new MarketIntelligenceClient({ apiKey, baseUrl: process.env.MI_BASE_URL });
const cases = {
  get_trading_decision: { symbol: "ETHUSD", side: "buy" },
  check_token_risk: { address: "0x940181a94a35a4569e4529a3cdfb74e38fd98631", chain: "base" },
  find_new_tokens: { chain: "base", verdict: "LOW_RISK" },
  get_swap_quote: { chain: "base", sell: "USDC", buy: "WETH", amount: "100" },
  explain_price_move: { symbol: "ETHUSD" },
  get_market_regime: {},
  get_macro_calendar: {},
  get_futures_positioning: { market: "gold" },
  get_stock_fundamentals: { symbols: ["AAPL", "MSFT"] },
  get_insider_trades: { symbol: "TSLA" },
  get_decision_track_record: {},
};
let fails = 0;
for (const t of TOOLS) {
  const r = await client.run(t.name, cases[t.name]);
  if (!r.ok) fails++;
  console.log(`${r.ok ? "ok  " : "FAIL"} core ${t.name} ${r.status} ${r.ok ? JSON.stringify(r.data).slice(0, 80) : r.error}`);
}
// AgentKit: the provider's actions, invoked as AgentKit would (walletProvider, args)
const provider = marketIntelligenceActionProvider({ apiKey, baseUrl: process.env.MI_BASE_URL });
const fakeWallet = { getName: () => "smoke-test", getNetwork: () => ({ protocolFamily: "evm", networkId: "base-mainnet", chainId: "8453" }), getAddress: () => "0x0" };
const actions = provider.getActions(fakeWallet);
const a = actions.find((x) => x.name.endsWith("get_market_regime"));
console.log("agentkit actions", actions.length, "regime:", String(await a.invoke({ window: "5m" })).slice(0, 80));
// ElizaOS: a fake runtime whose small model answers with the arguments
const runtime = {
  getSetting: (k) => (k === "MARKET_INTELLIGENCE_API_KEY" ? apiKey : k === "MARKET_INTELLIGENCE_BASE_URL" ? process.env.MI_BASE_URL : null),
  useModel: async () => '```json\n{"symbol": "NVDA"}\n```',
};
const explain = plugin.actions.find((x) => x.name === "EXPLAIN_PRICE_MOVE");
const res = await explain.handler(runtime, { content: { text: "why is nvidia moving?" } }, undefined, undefined, async () => []);
console.log("eliza actions", plugin.actions.length, "EXPLAIN_PRICE_MOVE:", res.success, String(res.text).slice(0, 100));
process.exit(fails ? 1 : 0);
