# Market Intelligence API: agent plugins

Plugins that give AI agents the [Market Intelligence API](https://api.marketintelligenceapi.com): trading decisions, token
due diligence, new-token discovery, swap quotes, "why is it moving", market regime, macro calendar, futures positioning,
stock fundamentals and insider trades. Calls are paid per call with [x402](https://x402.org) (USDC on Base) from the
agent's wallet, or from prepaid credits with an API key, so there is no account and no subscription.

| Package | For |
|---|---|
| [`elizaos-plugin-market-intelligence`](packages/elizaos) | [ElizaOS](https://github.com/elizaOS/eliza) agents (v1.7+) |
| [`agentkit-market-intelligence`](packages/agentkit) | [Coinbase AgentKit](https://github.com/coinbase/agentkit) agents: the agent's wallet pays |
| [`market-intelligence-core`](packages/core) | the shared client and tool catalog, usable on its own |

## Tools

| Tool | What it returns | Price |
|---|---|---|
| `get_trading_decision` | action STRONG_BUY..STRONG_SELL, conviction, GO/WAIT for a side, pillar stances, measured hit rate | $0.05 |
| `check_token_risk` | honeypot sell simulation, owner powers, liquidity, taxes, holders, v4 hooks, impersonation, verdict | $0.02 |
| `find_new_tokens` | tokens launched in the last hour on Base/Ethereum, already risk-checked | $0.02 |
| `get_swap_quote` | best on-chain route, price impact, minimum received, hook warnings | $0.002 |
| `explain_price_move` | why a symbol moves: ranked drivers from flow, smart money, perps, news, SEC, insiders | $0.02 |
| `get_market_regime` | BULLISH/BEARISH/MIXED with breadth, buy pressure, stablecoin flows, macro events | $0.005 |
| `get_macro_calendar` | CPI, jobs, PCE, GDP, FOMC, ECB in UTC | $0.002 |
| `get_futures_positioning` | CFTC Commitments of Traders for 24 markets with a 3-year COT index | $0.005 |
| `get_stock_fundamentals` | SEC fundamentals of up to 10 companies | $0.03 |
| `get_insider_trades` | SEC Form 4 buys and sales with a signal | $0.01 |
| `get_decision_track_record` | live hit rates of the decisions and of each pillar | free |

## Paying

- **x402 (default):** the agent's EVM key pays in USDC on Base. For AgentKit this is the agent's wallet provider; for
  ElizaOS set `MARKET_INTELLIGENCE_PRIVATE_KEY` (or `EVM_PRIVATE_KEY`). No ETH is needed, the facilitator pays gas.
- **Prepaid credits:** buy once with `POST https://api.marketintelligenceapi.com/api/v1/credits/buy/5` (or `/20` for $22, `/50` for $60)
  and use the returned key as `MARKET_INTELLIGENCE_API_KEY` / `apiKey`.
- A per-call guard (`maxPriceUsd`, default $0.10) refuses anything more expensive.

## Development

```bash
npm install
npm run build
MI_API_KEY=mi_... npm run smoke   # live test of every tool through the three packages
```

MIT license. The API: [OpenAPI](https://api.marketintelligenceapi.com/openapi.json) ·
[llms.txt](https://api.marketintelligenceapi.com/llms.txt) · MCP server `https://api.marketintelligenceapi.com/mcp`.
Not investment advice.
