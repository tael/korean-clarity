import { analyze, applyFixes, generatePrompt, mergeOverlappingSpans, type AnalyzeResult, type CategoryGroup, type Mode, type Violation } from '@korean-clarity/analyzer';
import type { FixResult, Metrics } from '@korean-clarity/analyzer';
import { useEffect, useMemo, useState } from 'react';

const SAMPLE = `이 솔루션의 핵심은 단순한 기능 개선이 아니라, 사용자 경험에 대한 근본적인 재정의에 있습니다. 다음과 같은 혁신적인 접근을 통해 효율성을 극대화할 수 있습니다:

- 데이터 기반의 의사결정 프로세스 구축
- 사용자 중심의 인터페이스 설계
- 지속 가능한 성장 모델의 정립

결론적으로, 본 솔루션은 시장의 변화에 능동적으로 대응할 수 있는 전략적 토대를 제공합니다.`;

const CATEGORIES: { key: 'ALL' | CategoryGroup; label: string; dot?: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: 'A', label: 'A 수사', dot: '#d97706' },
  { key: 'B', label: 'B 포맷', dot: '#6366f1' },
  { key: 'C', label: 'C 구조', dot: '#dc2626' },
  { key: 'D', label: 'D 직역', dot: '#2563eb' },
  { key: 'E', label: 'E 격', dot: '#71717a' },
  { key: 'F', label: 'F 명료성', dot: '#ca8a04' },
];

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}

function highlightedHtml(text: string, violations: Violation[], activeCat: 'ALL' | CategoryGroup): string {
  const merged = mergeOverlappingSpans(violations);
  let out = '';
  let cur = 0;
  for (const v of merged) {
    out += escapeHtml(text.slice(cur, v.span.start));
    const dim = activeCat !== 'ALL' && v.group !== activeCat ? ' dim' : '';
    out += `<span class="hl ${v.group.toLowerCase()}${dim}" title="${escapeHtml(`${v.ruleId}: ${v.message}`)}">${escapeHtml(text.slice(v.span.start, v.span.end))}</span>`;
    cur = v.span.end;
  }
  out += escapeHtml(text.slice(cur));
  return out;
}

function severityRank(s: string): number {
  return s === 'high' ? 0 : s === 'medium' ? 1 : 2;
}
function sevClass(s: string): string {
  return s === 'high' ? 'high' : s === 'medium' ? 'med' : 'low';
}
function sevLabel(s: string): string {
  return s === 'high' ? '높음' : s === 'medium' ? '중간' : '낮음';
}

const METRIC_CHIPS: { key: keyof Metrics; label: string; fmt: (n: number) => string }[] = [
  { key: 'sentenceCount', label: '문장 수', fmt: (n) => String(n) },
  { key: 'sentenceLengthStdev', label: '길이 편차', fmt: (n) => n.toFixed(1) },
  { key: 'endingDiversity', label: '종결 다양성', fmt: (n) => n.toFixed(2) },
  { key: 'daStreakMax', label: "'-다' 최대 연속", fmt: (n) => String(n) },
  { key: 'commaInclusionRate', label: '쉼표 포함률', fmt: (n) => Math.round(n * 100) + '%' },
  { key: 'connectiveOpenerRate', label: '접속사 문두율', fmt: (n) => Math.round(n * 100) + '%' },
];

function aiLabel(score: number): string {
  if (score >= 70) return '높음: AI가 쓴 글의 전형적 패턴이 짙음';
  if (score >= 40) return '중간: 부분적으로 AI 클리셰 감지';
  return '낮음: 표면 클리셰가 적음';
}
function clarityLabel(score: number): string {
  if (score >= 70) return '높음: 의미 전달이 또렷함';
  if (score >= 40) return '중간: 추상도와 메타 발화가 적당히 섞임';
  return '낮음: 추상명사·메타 발화·완충 표현이 의미를 가림';
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export default function Analyzer() {
  const [text, setText] = useState<string>(SAMPLE);
  const [mode, setMode] = useState<Mode>('full');
  const [activeCat, setActiveCat] = useState<'ALL' | CategoryGroup>('ALL');

  const debouncedText = useDebounced(text, 250);
  const result = useMemo<AnalyzeResult>(() => analyze(debouncedText, { mode }), [debouncedText, mode]);
  const fix = useMemo<FixResult>(
    () => (mode === 'full' ? applyFixes(debouncedText) : { fixed: debouncedText, applied: [], needsJudgment: [] }),
    [debouncedText, mode],
  );
  const llmPrompt = useMemo<string>(
    () => (mode === 'full' && debouncedText.trim().length > 0 ? generatePrompt(debouncedText, result) : ''),
    [debouncedText, mode, result],
  );
  const [copied, setCopied] = useState(false);

  function copyPrompt() {
    navigator.clipboard?.writeText(llmPrompt).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => setCopied(false),
    );
  }

  const filteredViolations = useMemo(() => {
    const base = activeCat === 'ALL' ? result.violations : result.violations.filter((v) => v.group === activeCat);
    return [...base].sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || a.span.start - b.span.start);
  }, [result.violations, activeCat]);

  const counts = result.scores.counts;
  const dCount = counts.D1 + counts.D2;

  return (
    <>
      <section className="input-card">
        <div className="mode-row">
          <button
            className={`mode${mode === 'full' ? ' active' : ''}`}
            onClick={() => setMode('full')}
          >
            본문 모드
          </button>
          <button
            className={`mode${mode === 'label' ? ' active' : ''}`}
            onClick={() => setMode('label')}
          >
            표제·라벨 모드
          </button>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="actions">
          <span className="hint">텍스트는 브라우저 안에서만 처리됩니다. 입력 즉시 분석됩니다.</span>
          <span className="hint" style={{ color: 'var(--ink-2)' }}>{text.length}자</span>
        </div>
      </section>

      <section className="scores">
        <div className="score-card ai-score">
          <h3>AI 냄새 지수</h3>
          <div className="num">
            {result.scores.ai}<small>/100</small>
          </div>
          <div className="bar"><div className="bar-fill" style={{ width: result.scores.ai + '%' }} /></div>
          <div className="label">{aiLabel(result.scores.ai)}</div>
        </div>
        <div className="score-card clarity-score">
          <h3>명료성 지수</h3>
          <div className="num">
            {result.scores.clarity}<small>/100</small>
          </div>
          <div className="bar"><div className="bar-fill" style={{ width: result.scores.clarity + '%' }} /></div>
          <div className="label">{clarityLabel(result.scores.clarity)}</div>
        </div>
      </section>

      <div className="result-grid">
        <section className="panel">
          <h2>원문 하이라이트</h2>
          <div
            className="source-text"
            dangerouslySetInnerHTML={{ __html: highlightedHtml(debouncedText, result.violations, activeCat) }}
          />
        </section>

        <section className="panel">
          <h2>카테고리별 위반</h2>
          <div className="tabs">
            {CATEGORIES.map((c) => {
              const cnt = c.key === 'ALL'
                ? Object.values(counts).reduce((a, b) => a + b, 0)
                : c.key === 'D'
                  ? dCount
                  : counts[c.key as keyof typeof counts];
              return (
                <button
                  key={c.key}
                  className={`tab${activeCat === c.key ? ' active' : ''}`}
                  onClick={() => setActiveCat(c.key)}
                >
                  {c.dot && <span className="dot" style={{ background: c.dot }} />}
                  {c.label}
                  <span className="count">{cnt}</span>
                </button>
              );
            })}
          </div>
          {filteredViolations.length === 0 ? (
            <div className="empty">위반 없음</div>
          ) : (
            <ul className="violations">
              {filteredViolations.map((v, idx) => (
                <li className="v" key={`${v.ruleId}-${v.span.start}-${idx}`}>
                  <div className="v-head">
                    <span className="v-id">{v.ruleId}</span>
                    <span className={`sev ${sevClass(v.severity)}`}>{sevLabel(v.severity)}</span>
                  </div>
                  <div className="quote">{v.quote}</div>
                  <div className="msg">{v.message}</div>
                  {v.suggestion && <div className="sug">{v.suggestion}</div>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {mode === 'full' && result.metrics.sentenceCount > 0 && (
        <section className="panel metrics-panel">
          <h2>리듬·다양성 지표</h2>
          <div className="metric-chips">
            {METRIC_CHIPS.map((m) => (
              <span className="metric-chip" key={m.key}>
                <span className="metric-label">{m.label}</span>
                <span className="metric-value">{m.fmt(result.metrics[m.key] as number)}</span>
              </span>
            ))}
          </div>
          {result.metrics.flags.length === 0 ? (
            <div className="empty">리듬·다양성 양호: 문장 길이·종결·접속사 분포가 자연스러움</div>
          ) : (
            <ul className="violations">
              {result.metrics.flags.map((f) => (
                <li className="v" key={f.key}>
                  <div className="v-head">
                    <span className="v-id">{f.key}</span>
                    <span className={`sev ${sevClass(f.severity)}`}>{sevLabel(f.severity)}</span>
                  </div>
                  <div className="msg">{f.message}</div>
                  <div className="sug">{f.suggestion}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {mode === 'full' && (fix.applied.length > 0 || fix.needsJudgment.length > 0) && (
        <section className="panel fix-panel">
          <h2>안전 자동 교정</h2>
          {fix.applied.length > 0 ? (
            <>
              <div className="fix-note">
                문맥 없이 고쳐도 의미가 안 바뀌는 {fix.applied.length}종을 자동 교정했습니다.
              </div>
              <div className="source-text fix-output">{fix.fixed}</div>
              <ul className="violations">
                {fix.applied.map((a) => (
                  <li className="v" key={a.ruleId}>
                    <div className="v-head">
                      <span className="v-id">{a.ruleId}</span>
                      <span className="count">{a.count}곳</span>
                    </div>
                    <div className="msg">
                      <span className="fix-before">{a.before}</span>
                      {' → '}
                      <span className="fix-after">{a.after}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="empty">자동으로 고칠 안전 패턴이 없습니다.</div>
          )}
          {fix.needsJudgment.length > 0 && (
            <div className="fix-note judgment">
              문맥 판단이 필요해 자동 교정하지 않은 규칙 {fix.needsJudgment.length}종: {fix.needsJudgment.join(', ')}.
              이건 의미를 읽고 직접 고쳐야 합니다. 룰이 기계적으로 치환하면 뜻이 깨집니다.
            </div>
          )}
        </section>
      )}

      <section className="prescription">
        <h2>이 글의 핵심 처방</h2>
        <ol>
          {result.prescriptions.map((p, idx) => (
            <li key={idx}>
              <b>{p.title}.</b> {p.body}
            </li>
          ))}
        </ol>
      </section>

      {mode === 'full' && llmPrompt && (
        <section className="panel prompt-panel">
          <div className="prompt-head">
            <h2>LLM 재작성 프롬프트</h2>
            <button className="copy-btn" onClick={copyPrompt}>
              {copied ? '복사됨' : '복사'}
            </button>
          </div>
          <p className="prompt-hint">
            문맥 판단이 필요한 교정은 룰로 못 합니다. 이 프롬프트를 ChatGPT·Claude 등에 붙여넣으면
            원문과 진단 개선점을 바탕으로 다시 써 줍니다. 의미 보존 제약도 함께 들어 있습니다.
          </p>
          <textarea className="prompt-output" readOnly value={llmPrompt} />
        </section>
      )}

      <section className="disclaimer">
        <b>이 도구가 잡지 못하는 것.</b> 룰 기반 분석기라 의미 부정합·맥락 어색·사실 오류는 잡지 못합니다. 표면 패턴과 정량 지표로 어색함의 윤곽을 보여드립니다. 맥락을 읽어 글을 다시 쓰는 건 LLM 몫이라, 위의 재작성 프롬프트로 넘겨받게 했습니다. 최종 판단은 사람이 해주세요.
      </section>
    </>
  );
}
