import {
  type Action,
  type ActionResult,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type Plugin,
  type State,
  ModelType,
  parseJSONObjectFromText,
} from "@elizaos/core";
import { MarketIntelligenceClient, TOOLS, type Tool } from "market-intelligence-core";
import { zodToJsonHint } from "./schemaHint.js";

/**
 * ElizaOS plugin for the Market Intelligence API: trading decisions, token risk, new tokens, swap quotes, "why is it
 * moving", market regime, macro calendar, futures positioning, stock fundamentals and insider trades.
 *
 * Settings (character secrets or env):
 *   MARKET_INTELLIGENCE_API_KEY      prepaid-credit key (mi_...) - no wallet needed; buy at /api/v1/credits
 *   MARKET_INTELLIGENCE_PRIVATE_KEY  or EVM_PRIVATE_KEY: pays each call with x402 in USDC on Base
 *   MARKET_INTELLIGENCE_MAX_PRICE_USD  largest price one call may cost (default 0.10)
 */
let client: MarketIntelligenceClient | undefined;

function getClient(runtime: IAgentRuntime): MarketIntelligenceClient {
  if (client) return client;
  const setting = (k: string) => {
    const v = runtime.getSetting(k);
    return v === null || v === undefined || v === "" ? undefined : String(v);
  };
  const privateKey = setting("MARKET_INTELLIGENCE_PRIVATE_KEY") ?? setting("EVM_PRIVATE_KEY");
  client = new MarketIntelligenceClient({
    baseUrl: setting("MARKET_INTELLIGENCE_BASE_URL"),
    apiKey: setting("MARKET_INTELLIGENCE_API_KEY"),
    privateKey: privateKey as `0x${string}` | undefined,
    maxPriceUsd: setting("MARKET_INTELLIGENCE_MAX_PRICE_USD") ? Number(setting("MARKET_INTELLIGENCE_MAX_PRICE_USD")) : undefined,
  });
  return client;
}

/** Asks the agent's small model for the tool arguments as JSON, from the conversation. */
async function extractArgs(runtime: IAgentRuntime, tool: Tool, message: Memory): Promise<Record<string, unknown>> {
  const prompt = `Extract the arguments for the tool "${tool.name}" from the user's message.
Tool: ${tool.description}
Arguments (JSON): ${zodToJsonHint(tool.schema)}
User message: ${message.content.text ?? ""}
Answer with one JSON object only, using only the listed argument names; leave out what the message does not say.`;
  const text = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
  return parseJSONObjectFromText(String(text)) ?? {};
}

function toAction(tool: Tool): Action {
  const words = tool.name.split("_");
  return {
    name: tool.name.toUpperCase(),
    similes: [words.join(" "), words.slice(1).join(" ")].map((s) => s.toUpperCase().replace(/ /g, "_")),
    description: tool.description,
    validate: async () => true,
    handler: async (runtime: IAgentRuntime, message: Memory, _state?: State, _options?: unknown, callback?: HandlerCallback): Promise<ActionResult> => {
      const args = await extractArgs(runtime, tool, message);
      const result = await getClient(runtime).run(tool.name, args);
      const text = result.ok
        ? `${tool.name}: ${JSON.stringify(result.data).slice(0, 3500)}`
        : `${tool.name} failed: ${result.error}`;
      if (callback) await callback({ text, actions: [tool.name.toUpperCase()] });
      return { success: result.ok, text, data: { result: result.data, transaction: result.transaction, args } };
    },
    examples: [],
  };
}

export const marketIntelligencePlugin: Plugin = {
  name: "market-intelligence",
  description: "Market Intelligence API for agents: trading decisions, token risk, new tokens, swap quotes, price-move explanations, regime, macro calendar, futures positioning, stock fundamentals and insider trades. Paid per call with x402 or prepaid credits.",
  actions: TOOLS.map((t) => toAction(t as Tool)),
};

export default marketIntelligencePlugin;
