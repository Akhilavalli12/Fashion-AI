// Client for the Python computer-vision service. Never throws: failures become {ok:false}.
import { config } from '../config.js';
export const FAIL_MESSAGE = "AI analysis couldn't confidently identify this item.";

export async function analyzeImage(file) {
  try {
    const fd = new FormData();
    fd.append('file', new Blob([file.buffer], { type: file.mimetype }), file.originalname || 'upload');
    const res = await fetch(`${config.aiServiceUrl}/analyze`, { method: 'POST', body: fd, signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`AI service ${res.status}`);
    const data = await res.json();
    if (!data.ok) return { ok: false, reason: data.reason || 'unrecognised', message: FAIL_MESSAGE };
    return data;
  } catch (e) {
    return { ok: false, reason: 'ai_service_unavailable', message: FAIL_MESSAGE, detail: String(e.message || e) };
  }
}
