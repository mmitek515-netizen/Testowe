import test from 'node:test';
import assert from 'node:assert/strict';
import { validateVisionImagePayload, MAX_VISION_IMAGE_BYTES } from './visionImage';

const PNG_1PX = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==';

test('accepts a small actual PNG file for Ollama Vision', () => {
  const data = validateVisionImagePayload({ mime_type: 'image/png', base64: PNG_1PX });
  assert.equal(data.mime_type, 'image/png');
  assert.equal(data.base64, PNG_1PX);
});
test('rejects unsafe types and mislabelled images', () => {
  assert.throws(() => validateVisionImagePayload({ mime_type: 'image/svg+xml', base64: PNG_1PX }));
  assert.throws(() => validateVisionImagePayload({ mime_type: 'image/jpeg', base64: PNG_1PX }));
  assert.throws(() => validateVisionImagePayload({ mime_type: 'image/png', base64: 'AA!!' }));
  assert.throws(() => validateVisionImagePayload(null));
});
test('rejects oversize images before decoding', () => {
  assert.throws(() => validateVisionImagePayload({
    mime_type: 'image/png', base64: 'A'.repeat(MAX_VISION_IMAGE_BYTES * 2),
  }));
});
