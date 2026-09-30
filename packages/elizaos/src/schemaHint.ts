import type { z } from "zod";

/** A compact, model-readable description of an object schema: {"symbol": "string (e.g. ETHUSD)", ...}. */
export function zodToJsonHint(schema: z.ZodTypeAny): string {
  const shape = (schema as unknown as { shape?: Record<string, z.ZodTypeAny> }).shape ?? {};
  const out: Record<string, string> = {};
  for (const [key, field] of Object.entries(shape)) {
    const def = (field as unknown as { _def: { typeName?: string; innerType?: z.ZodTypeAny; values?: string[]; description?: string } })._def;
    let inner = field as z.ZodTypeAny;
    let optional = false;
    while (["ZodOptional", "ZodDefault"].includes((inner as unknown as { _def: { typeName: string } })._def.typeName)) {
      optional = true;
      inner = (inner as unknown as { _def: { innerType: z.ZodTypeAny } })._def.innerType;
    }
    const d = (inner as unknown as { _def: { typeName: string; values?: string[] } })._def;
    const type = d.typeName === "ZodEnum" ? `one of ${JSON.stringify(d.values)}` : d.typeName.replace("Zod", "").toLowerCase();
    out[key] = `${type}${optional ? " (optional)" : ""}${def.description ?? field.description ? ": " + (field.description ?? def.description) : ""}`;
  }
  return JSON.stringify(out);
}
