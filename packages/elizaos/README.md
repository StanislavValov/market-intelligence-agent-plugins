# elizaos-plugin-market-intelligence

ElizaOS (v1.7+) plugin for the [Market Intelligence API](https://api.marketintelligenceapi.com): 11 actions for trading
decisions, token risk, new tokens, swap quotes, price-move explanations, market regime, macro calendar, futures
positioning, stock fundamentals, insider trades and the decisions' track record. Paid per call with x402 or prepaid credits.

```bash
npm install elizaos-plugin-market-intelligence
```

```ts
import { marketIntelligencePlugin } from "elizaos-plugin-market-intelligence";

export const character = {
  name: "Trader",
  plugins: ["@elizaos/plugin-bootstrap", marketIntelligencePlugin],
  settings: {
    secrets: {
      // one of the two:
      MARKET_INTELLIGENCE_PRIVATE_KEY: process.env.EVM_PRIVATE_KEY, // pays each call in USDC on Base (x402)
      // MARKET_INTELLIGENCE_API_KEY: "mi_...",                     // prepaid credits, no wallet
    },
  },
};
```

Actions: `GET_TRADING_DECISION`, `CHECK_TOKEN_RISK`, `FIND_NEW_TOKENS`, `GET_SWAP_QUOTE`, `EXPLAIN_PRICE_MOVE`,
`GET_MARKET_REGIME`, `GET_MACRO_CALENDAR`, `GET_FUTURES_POSITIONING`, `GET_STOCK_FUNDAMENTALS`, `GET_INSIDER_TRADES`,
`GET_DECISION_TRACK_RECORD`. Each action asks the agent's small model for its arguments ("is 0x94…31 safe on base?" →
`{"address": "0x94…31", "chain": "base"}`), validates them, calls the API and returns the JSON as the action result.

| Setting | |
|---|---|
| `MARKET_INTELLIGENCE_PRIVATE_KEY` or `EVM_PRIVATE_KEY` | EVM key that pays per call with x402 |
| `MARKET_INTELLIGENCE_API_KEY` | prepaid-credit key instead of a wallet |
| `MARKET_INTELLIGENCE_MAX_PRICE_USD` | refuse calls above this price (default 0.10) |
| `MARKET_INTELLIGENCE_BASE_URL` | override the API URL |
