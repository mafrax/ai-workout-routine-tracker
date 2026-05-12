import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://workout-marcs-projects-3a713b55.vercel.app/api';

export interface EquipmentAnalysisResult {
  equipment: string[];
  confidence: 'high' | 'medium' | 'low';
  notes?: string | null;
}

export type EquipmentAnalysisError =
  | { kind: 'cancelled' }
  | { kind: 'no-photo' }
  | { kind: 'unreadable'; message: string }
  | { kind: 'network'; message: string };

export interface CapturedPhoto {
  base64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  dataUrl: string;
}

/**
 * Capture or pick a photo using the native camera/gallery sheet on mobile,
 * or fall back to a file input on web (Vite dev / desktop browser test).
 *
 * Returns null when the user cancelled.
 */
export async function capturePhoto(): Promise<CapturedPhoto | null> {
  // On web/desktop the Capacitor camera plugin uses getUserMedia or a hidden
  // input behind the scenes. CameraSource.Prompt = "Camera or gallery?" sheet.
  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Base64,
      source: CameraSource.Prompt,
      quality: 80,
      // Down-rez photos before sending — vision models don't need 4K.
      width: 1280,
      correctOrientation: true,
    });
    if (!photo.base64String) return null;
    const fmt = (photo.format || 'jpeg').toLowerCase();
    const mimeType: CapturedPhoto['mimeType'] =
      fmt === 'png' ? 'image/png' : fmt === 'webp' ? 'image/webp' : 'image/jpeg';
    return {
      base64: photo.base64String,
      mimeType,
      dataUrl: `data:${mimeType};base64,${photo.base64String}`,
    };
  } catch (err: any) {
    // The plugin throws a string-coded error when the user cancels.
    if (err && typeof err === 'object' && /cancel/i.test(err.message || '')) {
      return null;
    }
    throw err;
  }
}

/**
 * Analyse a captured photo via the backend vision endpoint.
 */
export async function analyzePhoto(
  photo: CapturedPhoto
): Promise<{ ok: true; data: EquipmentAnalysisResult } | { ok: false; error: EquipmentAnalysisError }> {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/equipment/analyze`,
      { image: photo.base64, mimeType: photo.mimeType },
      { headers: { 'Content-Type': 'application/json' }, timeout: 45_000 }
    );
    const { equipment, confidence, notes } = response.data || {};
    if (!Array.isArray(equipment)) {
      return { ok: false, error: { kind: 'unreadable', message: 'Bad response shape' } };
    }
    return { ok: true, data: { equipment, confidence: confidence || 'low', notes: notes ?? null } };
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 422) {
      return {
        ok: false,
        error: { kind: 'unreadable', message: err?.response?.data?.error || "Couldn't read this photo" },
      };
    }
    return {
      ok: false,
      error: { kind: 'network', message: err?.message || 'Network error' },
    };
  }
}
