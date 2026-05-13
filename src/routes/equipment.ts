import express, { Request, Response } from 'express';
import { z } from 'zod';
import { analyzeEquipmentImage, SUPPORTED_IMAGE_MIME } from '../services/EquipmentVisionService';
import { isDev } from '../config/env';

const router = express.Router();

const analyzeBodySchema = z.object({
  // Capacitor camera returns DataURLs sometimes; accept both raw base64 and DataURLs.
  image: z.string().min(100, 'image data is too short to be a real photo'),
  mimeType: z.enum(SUPPORTED_IMAGE_MIME),
});

/**
 * POST /api/equipment/analyze
 *
 * Body: { image: <base64 or data URL>, mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" }
 *
 * 200 -> { equipment: string[], confidence: "high"|"medium"|"low", notes?: string }
 * 400 -> { error, details } (validation)
 * 422 -> { error, details: { rawText? } } (model output unparseable)
 * 500 -> { error, details? }
 *
 * The image is forwarded to Claude vision inline and never persisted server-side.
 */
router.post('/analyze', async (req: Request, res: Response) => {
  const parsed = analyzeBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      details: parsed.error.flatten(),
    });
  }

  // Strip a possible `data:image/...;base64,` prefix.
  const { image, mimeType } = parsed.data;
  const base64 = image.includes('base64,') ? image.split('base64,')[1] ?? image : image;

  try {
    const result = await analyzeEquipmentImage({ imageBase64: base64, mimeType });
    if (!result.ok) {
      // 422: we understood the request but the model output was unusable.
      return res.status(422).json({
        error: result.error,
        details: result.rawText ? { rawText: result.rawText } : undefined,
      });
    }
    return res.json(result.data);
  } catch (err: any) {
    // Don't echo the base64 in error responses — keep them minimal.
    console.error('❌ Equipment vision failed:', err?.message || err);
    return res.status(500).json({
      error: 'Vision service unavailable',
      details: isDev ? err?.message : undefined,
    });
  }
});

export default router;
