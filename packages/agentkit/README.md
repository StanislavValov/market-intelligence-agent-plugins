# agentkit-market-intelligence

Coinbase AgentKit action provider for the [Market Intelligence API](https://api.marketintelligenceapi.com). The agent's own
wallet pays each call with x402 (USDC on Base); no API key or account needed.

```bash
npm install agentkit-market-intelligence
```

```ts
import { AgentKit, CdpEvmWalletProvider } from "@coinbase/agentkit";
import { marketIntelligenceActionProvider } from "agentkit-market-intelligence";

const walletProvider = await CdpEvmWalletProvider.configureWithWallet({ /* ... */ networkId: "base-mainnet" });
const agentkit = await AgentKit.from({
  walletProvider,
  actionProviders: [marketIntelligenceActionProvider({ maxPriceUsd: 0.1 })],
});
```

Actions (prefixed `market_intelligence_`): `get_trading_decision`, `check_token_risk`, `find_new_tokens`,
`get_swap_quote`, `explain_price_move`, `get_market_regime`, `get_macro_calendar`, `get_futures_positioning`,
`get_stock_fundamentals`, `get_insider_trades`, `get_decision_track_record`. Each returns JSON with `data` and the
settlement `transaction`, or `error`.

Options: `apiKey` (prepaid credits instead of the wallet), `maxPriceUsd` (default 0.10), `baseUrl`.
