import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { env } from '../config/env';

const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});

const SUPPORTED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
type SupportedMime = typeof SUPPORTED_MIME[number];

export const equipmentVisionResultSchema = z.object({
  equipment: z.array(z.string().min(1).max(80)).max(50),
  confidence: z.enum(['high', 'medium', 'low']),
  notes: z.string().max(500).optional().nullable(),
});

export type EquipmentVisionResult = z.infer<typeof equipmentVisionResultSchema>;

const SYSTEM_PROMPT = `You identify workout equipment in photos. The user will send a single image of a gym or workout area.

Return STRICT JSON only, matching this shape (no markdown, no commentary):

{
  "equipment": ["..."],
  "confidence": "high" | "medium" | "low",
  "notes": "..."
}

Rules:
- Items in "equipment" must be short, concrete, English. Examples: "barbell", "pair of dumbbells", "squat rack", "bench", "kettlebell", "resistance bands", "pull-up bar", "treadmill", "cable machine".
- Each item appears at most once.
- If the image clearly contains no workout equipment, set "equipment": [] and "confidence": "low".
- If the image is ambiguous, blurry, or shows something unrelated (food, pets, landscapes), return "equipment": [] and explain in "notes".
- "notes" should be one short sentence (or omitted) — for example, mention quantities or weights you can read from labels.
- NEVER invent items that are not visible.`;

/**
 * Run Claude vision on a base64-encoded image and return the structured equipment list.
 * The image bytes are sent inline and never persisted server-side.
 */
export async function analyzeEquipmentImage(args: {
  imageBase64: string;
  mimeType: SupportedMime;
}): Promise<{ ok: true; data: EquipmentVisionResult } | { ok: false; error: string; rawText?: string }> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: args.mimeType,
              data: args.imageBase64,
            },
          },
          {
            type: 'text',
            text: 'Identify the workout equipment visible in this image. Respond with strict JSON only.',
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    return { ok: false, error: 'Vision model returned no text content' };
  }

  const raw = textBlock.text.trim();
  // Strip a possible ```json fence the model might emit even when told not to.
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { ok: false, error: 'Vision model did not return valid JSON', rawText: raw.slice(0, 500) };
  }

  const result = equipmentVisionResultSchema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, error: 'Vision model JSON did not match expected shape', rawText: raw.slice(0, 500) };
  }

  // Dedupe while preserving order — sometimes the model lists the same item twice.
  const seen = new Set<string>();
  const equipment = result.data.equipment
    .map((s) => s.trim().toLowerCase())
    .filter((s) => (seen.has(s) ? false : (seen.add(s), true)))
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));

  return {
    ok: true,
    data: {
      ...result.data,
      equipment,
    },
  };
}

export const SUPPORTED_IMAGE_MIME = SUPPORTED_MIME;
