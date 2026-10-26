import { useState } from "react";
import { ASSESSMENT_QUESTION_IDS, getQuestions } from "../domain/content";
import { getRules } from "../domain/rules";
import { ASSESSMENT_PASS_RATIO, type AssessmentResult } from "../domain/progress";
import { useProgress } from "../state/store";
import { Badge, ButtonLink, Callout, PageHeader, ProgressBar, RuleChips } from "../components/ui";
import { CandleChart } from "../components/CandleChart";

export function AssessmentPage() {
  const questions = getQuestions(ASSESSMENT_QUESTION_IDS);
  const { state, submitAssessment } = useProgress();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [showReview, setShowReview] = useState(false);

  const question = questions[index];
  const answeredCount = Object.keys(answers).length;
  const lastScore = state.assessments[state.assessments.length - 1] ?? null;

  if (questions.length === 0) {
    return (
      <div className="stack">
        <section className="card">
          <h1>Assessment unavailable</h1>
          <p>The assessment pool is empty. This is a content configuration error.</p>
          <ButtonLink to="/dashboard">Back to dashboard</ButtonLink>
        </section>
      </div>
    );
  }

  const choose = (optionId: string) => {
    if (!question || result) return;
    setAnswers((current) => ({ ...current, [question.id]: optionId }));
  };

  const submit = () => {
    if (result) return;
    if (answeredCount !== questions.length) return;
    const inputs = questions.map((item) => ({
      question: item,
      selectedId: answers[item.id] ?? "",
    }));
    const outcome = submitAssessment(inputs);
    setResult(outcome);
  };

  const restart = () => {
    setAnswers({});
    setIndex(0);
    setResult(null);
    setShowReview(false);
  };

  if (result) {
    const passMark = Math.ceil(questions.length * ASSESSMENT_PASS_RATIO);
    return (
      <div className="stack">
        <PageHeader
          eyebrow="Assessment result"
          title={`${result.correct} of ${result.total} correct`}
          description={
            result.passed
              ? `Passed. The pass mark is ${passMark}/${questions.length} (80%).`
              : `Not passed. The pass mark is ${passMark}/${questions.length} (80%). Review the explanations below and retake when ready.`
          }
          actions={<Badge tone={result.passed ? "good" : "bad"}>{result.passed ? "Pass" : "Not passed"}</Badge>}
        />
        <section className="card result-card">
          <ProgressBar value={result.ratio} label="Assessment score" tone={result.passed ? "good" : "accent"} />
          <div className="stat-grid">
            <div className="stat-card">
              <p className="stat-label">Score</p>
              <p className="stat-value">{Math.round(result.ratio * 100)}%</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Pass mark</p>
              <p className="stat-value">80%</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">XP from this attempt</p>
              <p className="stat-value">+{result.award.xp}</p>
              <p className="stat-hint">First-correct credit plus the once-only pass bonus if applicable.</p>
            </div>
          </div>
          <div className="row wrap gap-sm">
            <button type="button" className="button button-primary" onClick={() => setShowReview((value) => !value)}>
              {showReview ? "Hide answer review" : "Review all answers"}
            </button>
            <button type="button" className="button button-secondary" onClick={restart}>
              Retake assessment
            </button>
            <ButtonLink to="/analytics">See analytics</ButtonLink>
          </div>
        </section>

        {showReview && (
          <section className="card">
            <div className="card-head">
              <h2>Answer review</h2>
              <Badge tone="info">Shown only after submission</Badge>
            </div>
            <ol className="review-list">
              {questions.map((item) => {
                const selectedId = answers[item.id];
                const selected = item.options.find((option) => option.id === selectedId);
                const correct = item.options.find((option) => option.id === item.answerId);
                const wasCorrect = selectedId === item.answerId;
                return (
                  <li key={item.id} className={`review-item ${wasCorrect ? "review-good" : "review-bad"}`}>
                    <div className="row-between">
                      <p className="mono tiny">{item.id}</p>
                      <Badge tone={wasCorrect ? "good" : "bad"}>{wasCorrect ? "Correct" : "Missed"}</Badge>
                    </div>
                    <p className="review-prompt">{item.prompt}</p>
                    <p className="small">
                      Your answer: <strong>{selected?.label ?? "No answer"}</strong>
                    </p>
                    {!wasCorrect && (
                      <p className="small">
                        Correct answer: <strong>{correct?.label}</strong>
                      </p>
                    )}
                    <p className="muted small">{item.explanation}</p>
                    <div className="row wrap gap-sm">
                      <RuleChips ids={item.ruleIds} />
                      {getRules(item.ruleIds).map((rule) =>
                        rule.sourceRef ? (
                          <span key={rule.id} className="source-ref mono tiny">
                            {rule.sourceRef}
                          </span>
                        ) : null,
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        )}
      </div>
    );
  }

  if (!question) {
    return (
      <div className="stack">
        <section className="card">
          <h1>Question unavailable</h1>
          <ButtonLink to="/assessment">Restart</ButtonLink>
        </section>
      </div>
    );
  }

  const isLast = index === questions.length - 1;

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Fixed assessment"
        title="Show what you can verify"
        description={`${questions.length} questions across mechanics and source-verified strategy. Answers are revealed only after you submit the whole set. Pass mark: 80%.`}
        actions={<Badge tone="info">{answeredCount}/{questions.length} answered</Badge>}
      />

      <div className="assessment-layout">
        <section className="card">
          <div className="row-between">
            <span className="mono">
              Question {index + 1} / {questions.length}
            </span>
            <Badge tone="info">{question.topicId}</Badge>
          </div>
          <ProgressBar value={answeredCount / questions.length} label="Assessment answered" />
          <h2 className="quiz-prompt">{question.prompt}</h2>
          {question.chart && (
            <CandleChart
              candles={question.chart.candles}
              lines={question.chart.level !== undefined ? [{ value: question.chart.level, label: question.chart.levelLabel ?? "Level" }] : []}
              caption={question.chart.caption}
              ariaLabel={`Chart for assessment question ${question.id}.`}
              height={300}
            />
          )}
          <div className="option-list" role="group" aria-label="Assessment answer options">
            {question.options.map((option) => {
              const selected = answers[question.id] === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`option-button${selected ? " option-selected" : ""}`}
                  aria-pressed={selected}
                  onClick={() => choose(option.id)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <div className="row-between">
            <button
              type="button"
              className="button button-ghost"
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
              disabled={index === 0}
            >
              Previous
            </button>
            {isLast ? (
              <button type="button" className="button button-primary" onClick={submit} disabled={answeredCount !== questions.length}>
                Submit assessment
              </button>
            ) : (
              <button
                type="button"
                className="button button-primary"
                onClick={() => setIndex((value) => Math.min(questions.length - 1, value + 1))}
                disabled={!answers[question.id]}
              >
                Next question
              </button>
            )}
          </div>
          {isLast && answeredCount !== questions.length && (
            <p className="alert alert-warn" role="status">
              Answer every question before submitting. You can move back with Previous.
            </p>
          )}
        </section>

        <aside className="assessment-aside">
          <section className="card">
            <h2>Answer map</h2>
            <div className="answer-map" role="list" aria-label="Question answer status">
              {questions.map((item, position) => (
                <button
                  key={item.id}
                  type="button"
                  role="listitem"
                  className={`answer-dot${answers[item.id] ? " answer-dot-done" : ""}${position === index ? " answer-dot-current" : ""}`}
                  onClick={() => setIndex(position)}
                  aria-label={`Question ${position + 1}${answers[item.id] ? ", answered" : ", unanswered"}`}
                  aria-current={position === index ? "step" : undefined}
                >
                  {position + 1}
                </button>
              ))}
            </div>
            <p className="muted small">
              Answers can be changed until you submit. No feedback is shown during the assessment.
            </p>
          </section>

          <section className="card">
            <h2>Previous attempt</h2>
            {lastScore ? (
              <>
                <p>
                  {lastScore.correct}/{lastScore.total} ({Math.round(lastScore.ratio * 100)}%) ·{" "}
                  {lastScore.passed ? "passed" : "not passed"}
                </p>
                <p className="muted tiny">{new Date(lastScore.at).toLocaleString()}</p>
              </>
            ) : (
              <p className="muted small">No assessment has been submitted on this device yet.</p>
            )}
          </section>

          <Callout title="No partial credit guessing" tone="info">
            This is a fixed, deterministic set. Every question has one answer fixed by the cited rule or chart data.
            Retakes are allowed, but the pass bonus is awarded only once.
          </Callout>
        </aside>
      </div>
    </div>
  );
}
