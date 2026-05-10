import { runLexiconChecks, runRegexChecks } from './checkers.js';
import { mergeOverlappingSpans } from './highlight.js';
import { computeScores, pickPrescriptions } from './score.js';
import type { AnalyzeResult, Mode, Violation } from './types.js';

export interface AnalyzeOptions {
  mode?: Mode;
}

export function analyze(text: string, options: AnalyzeOptions = {}): AnalyzeResult {
  const mode: Mode = options.mode ?? 'full';
  const violations: Violation[] = [
    ...runRegexChecks(text, mode),
    ...runLexiconChecks(text, mode),
  ].sort((a, b) => a.span.start - b.span.start);

  const scores = computeScores(text, violations);
  const prescriptions = pickPrescriptions(violations, scores);

  return { text, mode, violations, scores, prescriptions };
}

export { D2_LEXICON, REGEX_RULES } from './rules.js';
export { mergeOverlappingSpans };
export * from './types.js';
