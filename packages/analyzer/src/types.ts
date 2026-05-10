export type Category = 'A' | 'B' | 'C' | 'D1' | 'D2' | 'E' | 'F';
export type CategoryGroup = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type Severity = 'high' | 'medium' | 'low';
export type Mode = 'full' | 'label';

export interface Span {
  start: number;
  end: number;
}

export interface RegexRule {
  id: string;
  category: Category;
  re: RegExp;
  severity: Severity;
  message: string;
  suggestion?: string;
}

export interface LexiconEntry {
  word: string;
  natural?: string;
  contextSafe: string[];
  severity: Severity;
}

export interface Violation {
  ruleId: string;
  category: Category;
  group: CategoryGroup;
  severity: Severity;
  message: string;
  suggestion?: string;
  span: Span;
  quote: string;
}

export interface CategoryCounts {
  A: number;
  B: number;
  C: number;
  D1: number;
  D2: number;
  E: number;
  F: number;
}

export interface Scores {
  ai: number;
  clarity: number;
  counts: CategoryCounts;
}

export interface AnalyzeResult {
  text: string;
  mode: Mode;
  violations: Violation[];
  scores: Scores;
  prescriptions: Prescription[];
}

export interface Prescription {
  title: string;
  body: string;
}
