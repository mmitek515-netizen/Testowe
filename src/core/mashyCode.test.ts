import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeMashy, decodeMashy, mashyStrokeForDigit, MASHY_DIGIT_STROKES } from './mashyCode';

test('Mashy V1: sketch 6 has arc, bar, rising lower stroke', () => {
  assert.deepEqual(mashyStrokeForDigit('6'), ['arc', 'bar', 'rise']);
  assert.equal(encodeMashy('6'), '⟦∿━╱⟧');
  assert.equal(decodeMashy('⟦∿━╱⟧'), '6');
});

test('Mashy V1: all digit symbols uniquely and losslessly round-trip', () => {
  const sample = '0123456789';
  assert.equal(MASHY_DIGIT_STROKES.length, 10);
  const encoded = sample.split('').map(encodeMashy);
  assert.equal(new Set(encoded).size, 10);
  assert.equal(decodeMashy(encoded.join('')), sample);
  assert.equal(decodeMashy(encodeMashy(sample)), sample);
});

test('Mashy V1: preserves punctuation, letters, identifiers and leading zeros', () => {
  const source = 'SVL-v05.6: 009-42 / 127.0.0.1';
  assert.equal(decodeMashy(encodeMashy(source)), source);
  assert.equal(encodeMashy('0').includes('0'), false);
  assert.equal(decodeMashy('⟦xxx⟧'), '⟦xxx⟧');
  assert.equal(encodeMashy(''), '');
});

test('Mashy V1: rejects nondecimal glyph input to glyph renderer', () => {
  assert.throws(() => mashyStrokeForDigit('12'));
  assert.throws(() => mashyStrokeForDigit('A'));
});
