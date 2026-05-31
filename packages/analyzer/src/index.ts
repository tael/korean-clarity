import { runHaeyoCheck, runLexiconChecks, runRegexChecks } from './checkers.js';
import { mergeOverlappingSpans } from './highlight.js';
import { computeMetrics } from './metrics.js';
import { computeScores, pickPrescriptions } from './score.js';
import type { AnalyzeResult, Metrics, Mode, Violation } from './types.js';

export interface AnalyzeOptions {
  mode?: Mode;
}

export function analyze(text: string, options: AnalyzeOptions = {}): AnalyzeResult {
  const mode: Mode = options.mode ?? 'full';
  const violations: Violation[] = [
    ...runRegexChecks(text, mode),
    ...runLexiconChecks(text, mode),
    ...runHaeyoCheck(text, mode),
  ].sort((a, b) => a.span.start - b.span.start);

  // label 모드(짧은 라벨)는 통계 신뢰도가 없어 지표를 비운다.
  const metrics: Metrics =
    mode === 'label'
      ? emptyMetrics()
      : computeMetrics(text);

  const scores = computeScores(text, violations);
  const prescriptions = pickPrescriptions(violations, scores, metrics);

  return { text, mode, violations, scores, metrics, prescriptions };
}

function emptyMetrics(): Metrics {
  return {
    sentenceCount: 0,
    sentenceLengthStdev: 0,
    endingDiversity: 1,
    daStreakMax: 0,
    commaInclusionRate: 0,
    connectiveOpenerRate: 0,
    flags: [],
  };
}

export { computeMetrics } from './metrics.js';
export { applyFixes } from './fix.js';
export { D2_LEXICON, REGEX_RULES } from './rules.js';
export { mergeOverlappingSpans };
export * from './types.js';
