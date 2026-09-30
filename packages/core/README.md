# market-intelligence-core

Client and tool catalog for the [Market Intelligence API](https://api.marketintelligenceapi.com), shared by the ElizaOS
plugin and the AgentKit action provider, usable on its own.

```ts
import { MarketIntelligenceClient, TOOLS } from "market-intelligence-core";

const mi = new MarketIntelligenceClient({ privateKey: process.env.EVM_PRIVATE_KEY as `0x${string}` }); // or { apiKey: "mi_..." }
const r = await mi.run("check_token_risk", { address: "0x940181a94a35a4569e4529a3cdfb74e38fd98631", chain: "base" });
console.log(r.ok, r.data, r.transaction);
```

`TOOLS` lists each tool's name, description, price and zod schema; `run(name, args)` validates the arguments, refuses
tools above `maxPriceUsd` (default $0.10) and pays with x402 or the API key.
