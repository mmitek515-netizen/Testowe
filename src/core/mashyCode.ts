/** MASHY-V1 — one canonical, reversible visual numeral alphabet.
 *
 * Every decimal digit is a three-stroke lookup symbol, never an arithmetic
 * calculation. Digits are only retained internally for platform interoperability.
 * The screenshot defines one sample: 6 = curved top, horizontal middle, rising
 * bottom. The other mappings are V1 conventions, not claimed as user-authored.
 *
 * IMPORTANT: Not encryption, authentication, a numeric primitive or a password.
 */
export type MashyStroke = 'bar' | 'arc' | 'rise';
export const MASHY_VERSION = 'MASHY-V1';
export const MASHY_DIGIT_STROKES: readonly (readonly [MashyStroke, MashyStroke, MashyStroke])[] = [
  ['bar',  'bar',  'bar'],   // 0
  ['rise', 'bar',  'bar'],   // 1
  ['bar',  'rise', 'bar'],   // 2
  ['bar',  'bar',  'rise'],  // 3
  ['arc',  'bar',  'bar'],   // 4
  ['bar',  'arc',  'bar'],   // 5
  ['arc',  'bar',  'rise'],  // 6: the hand-drawn Mashy example
  ['rise', 'arc',  'bar'],   // 7
  ['arc',  'arc',  'rise'],  // 8
  ['rise', 'arc',  'rise'],  // 9
];
export const MASHY_STROKE_SYMBOLS: Readonly<Record<MashyStroke, string>> = {
  bar: '━', arc: '∿', rise: '╱',
};
const CHARS = MASHY_DIGIT_STROKES.map(strokes =>
  strokes.map(stroke => MASHY_STROKE_SYMBOLS[stroke]).join(''));
const REVERSE = new Map(CHARS.map((token, index) => [token, String(index)]));
if (REVERSE.size !== 10) {
  throw new Error('Mashy V1 glyph dictionary contains duplicate symbols');
}
/** Transport-safe textual transcription of the visual glyphs; digits become ⟦...⟧. */
export function encodeMashy(value: string | number): string {
  return String(value).replace(/[0-9]/g, digit => '⟦' + CHARS[Number(digit)] + '⟧');
}
/** Decode only exact Mashy V1 glyph tokens. Everything else remains intact. */
export function decodeMashy(value: string): string {
  return value.replace(/⟦([━∿╱]{3})⟧/g, (token, glyph: string) =>
    REVERSE.get(glyph) ?? token);
}
export function mashyStrokeForDigit(digit: string): readonly [MashyStroke, MashyStroke, MashyStroke] {
  if (!/^[0-9]$/.test(digit)) throw new Error('Mashy requires one digit');
  return MASHY_DIGIT_STROKES[Number(digit)];
}
