/** Shared server-side validation for Ollama Vision uploads. */
export const MAX_VISION_IMAGE_BYTES = 2 * 1024 * 1024;
export type VisionImage = { mime_type: 'image/png' | 'image/jpeg'; base64: string };

export function validateVisionImagePayload(input: unknown): VisionImage {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('image_missing');
  const obj = input as Record<string, unknown>;
  const mime = obj.mime_type;
  const b64 = obj.base64;
  if (mime !== 'image/png' && mime !== 'image/jpeg') throw new TypeError('invalid_image_type');
  if (typeof b64 !== 'string' || !b64 ||
      b64.length > Math.ceil(MAX_VISION_IMAGE_BYTES / 3) * 4 + 8 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(b64)) {
    throw new TypeError('invalid_image_encoding');
  }
  const buffer = Buffer.from(b64, 'base64');
  if (buffer.length < 12 || buffer.length > MAX_VISION_IMAGE_BYTES ||
      buffer.toString('base64') !== b64) throw new TypeError('image_size_or_encoding_invalid');
  const isPng = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isJpeg = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
  if ((mime === 'image/png' && !isPng) || (mime === 'image/jpeg' && !isJpeg)) {
    throw new TypeError('image_signature_mismatch');
  }
  return { mime_type: mime, base64: b64 };
}
