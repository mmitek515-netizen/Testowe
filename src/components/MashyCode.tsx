import React from 'react';
import { encodeMashy, mashyStrokeForDigit, MASHY_DIGIT_STROKES, type MashyStroke } from '../core/mashyCode';

export { encodeMashy } from '../core/mashyCode';
export type MashyGlyphProps = { digit: string; size?: number; className?: string };

function strokePath(stroke: MashyStroke, row: number): string {
  const dy = row * 16;
  if (stroke === 'bar') return `M6 ${9+dy} L28 ${9+dy}`;
  if (stroke === 'arc') return `M6 ${9+dy} Q12 ${2+dy} 19 ${10+dy} Q23 ${14+dy} 28 ${10+dy}`;
  return `M6 ${14+dy} L28 ${4+dy}`;
}
// Build 10 stable glyph paths just once, not on every React render.
const PATHS = MASHY_DIGIT_STROKES.map(strokes => strokes.map(strokePath).join(' '));
const FRAME_PATH = 'M4 3 Q3 2 7 2 H28 Q32 2 32 7 V49 Q32 52 29 52 H7 Q3 52 3 48 Z';

/**
 * Reusable SVG glyph: two paths, not four, and memoized for parent refreshes.
 * Same geometry as initial Mashy renderer; only presentation internals change.
 */
export const MashyGlyph = React.memo(function MashyGlyph({ digit, size = 20, className = '' }: MashyGlyphProps) {
  mashyStrokeForDigit(digit); // asserts one decimal digit
  return (
    <svg className={'inline-block shrink-0 align-middle ' + className}
      width={size} height={Math.round(size * 1.45)} viewBox="0 0 34 54"
      fill="none" aria-hidden="true" focusable="false">
      <path d={FRAME_PATH} stroke="currentColor" strokeWidth="1.6"
        strokeLinejoin="round" opacity=".65" />
      <path d={PATHS[Number(digit)]} stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
});

/** Rendering boundary. The UI shows Mashy; machine values/ports stay native. */
export const MashyValue = React.memo(function MashyValue({
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
});
export const MASHY_KEYBOARD = MASHY_DIGIT_STROKES.map((_, i) => String(i));
