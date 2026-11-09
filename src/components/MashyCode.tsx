import React from 'react';
import { encodeMashy, mashyStrokeForDigit, MASHY_DIGIT_STROKES } from '../core/mashyCode';

export { encodeMashy } from '../core/mashyCode';
export type MashyGlyphProps = { digit: string; size?: number; className?: string };
const STROKE_PATHS = {
  bar: 'M6 9 L28 9',
  arc: 'M6 9 Q12 2 19 10 Q23 14 28 10',
  rise: 'M6 14 L28 4',
} as const;

/** Real SVG stroked symbol, drawn directly in the interactive React UI. */
export function MashyGlyph({ digit, size = 20, className = '' }: MashyGlyphProps) {
  const strokes = mashyStrokeForDigit(digit);
  return (
    <svg className={'inline-block shrink-0 align-middle ' + className}
      width={size} height={Math.round(size * 1.45)} viewBox="0 0 34 54"
      fill="none" aria-hidden="true" focusable="false">
      <path d="M4 3 Q3 2 7 2 H28 Q32 2 32 7 V49 Q32 52 29 52 H7 Q3 52 3 48 Z"
        stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" opacity=".65"/>
      {strokes.map((stroke, index) => (
        <path key={index} d={STROKE_PATHS[stroke]} transform={'translate(0 ' + index * 16 + ')'}
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

/** Presentation boundary: never transforms API keys, UUIDs, machine JSON or ports. */
export function MashyValue({
  value, size = 15, className = '',
}: {
  value: string | number; size?: number; className?: string;
}) {
  const raw = String(value);
  return (
    <span className={'inline-flex flex-wrap items-center align-middle gap-[1px] ' + className}
      role="img" aria-label={'Kod Mashy: ' + encodeMashy(raw)}
      title={encodeMashy(raw)}>
      {raw.split(/([0-9]+)/g).filter(Boolean).map((part, groupIndex) => (
        /^[0-9]+$/.test(part)
          ? <React.Fragment key={groupIndex}>
              {Array.from(part).map((digit, digitIndex) =>
                <MashyGlyph digit={digit} size={size} key={digitIndex} />
              )}
            </React.Fragment>
          : <React.Fragment key={groupIndex}>{part}</React.Fragment>
      ))}
    </span>
  );
}
export const MASHY_KEYBOARD = MASHY_DIGIT_STROKES.map((_, i) => String(i));
