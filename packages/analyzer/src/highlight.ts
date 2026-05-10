import type { Violation } from './types.js';

export function mergeOverlappingSpans(violations: Violation[]): Violation[] {
  const sorted = [...violations].sort(
    (a, b) =>
      a.span.start - b.span.start ||
      b.span.end - b.span.start - (a.span.end - a.span.start),
  );
  const out: Violation[] = [];
  let lastEnd = -1;
  for (const v of sorted) {
    if (v.span.start >= lastEnd) {
      out.push(v);
      lastEnd = v.span.end;
    }
  }
  return out;
}
