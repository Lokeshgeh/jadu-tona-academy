import { useState } from "react";
import { QUESTIONS_BY_TOPIC } from "../domain/content";
import { masteryForTopic } from "../domain/mastery";
import { TOPICS, getRules } from "../domain/rules";
import { useProgress } from "../state/store";
import type { QuestionAttemptResult } from "../domain/progress";
import { Badge, ButtonLink, Callout, EmptyState, PageHeader, ProgressBar, RuleChips } from "../components/ui";
import { CandleChart } from "../components/CandleChart";
import { Link } from "../lib/router";

export function QuizIndexPage() {
  const { state } = useProgress();
  return (
    <div className="stack">
      <PageHeader
        eyebrow="Quiz arena"
        title="Practise by topic"
        description="Immediate feedback, one source anchor per answer, and XP only the first time you answer a question correctly. Wrong answers still count toward your practice record."
        actions={<ButtonLink to="/assessment">Take the assessment</ButtonLink>}
      />

      <div className="topic-grid">
        {TOPICS.map((topic) => {
          const questions = QUESTIONS_BY_TOPIC[topic.id] ?? [];
          const mastery = masteryForTopic(state, topic.id);
          const attempts = state.attempts.filter((attempt) => attempt.topicId === topic.id);
          const correct = attempts.filter((attempt) => attempt.correct).length;
          return (
            <article key={topic.id} className="topic-card">
              <div className="row-between">
                <Badge tone={topic.group === "strategy" ? "info" : "neutral"}>{topic.group}</Badge>
                <Badge
                  tone={
                    mastery.level === "secure"
                      ? "good"
                      : mastery.level === "practising"
                        ? "warn"
                        : mastery.level === "learning"
                          ? "info"
                          : "neutral"
                  }
                >
                  {mastery.label}
                </Badge>
              </div>
              <h2>{topic.name}</h2>
              <p>{topic.description}</p>
              <p className="muted small">
                {questions.length} question{questions.length === 1 ? "" : "s"} · {attempts.length} attempt
                {attempts.length === 1 ? "" : "s"}
                {attempts.length > 0 ? ` · ${correct} correct` : ""}
              </p>
              <div className="topic-card-footer">
                <ProgressBar value={mastery.ratio} label={`${topic.name} accuracy`} tone={mastery.ratio >= 0.8 ? "good" : "accent"} />
                <ButtonLink to={`/quiz/${topic.id}`} variant="secondary">
                  Practise
                </ButtonLink>
              </div>
            </article>
          );
        })}
      </div>

      <Callout title="What the numbers mean" tone="info">
        Accuracy is simply your correct answers divided by your attempts on this device. Mastery needs at least three
        answers and only describes the current sample. It is not a prediction or a qualification.
      </Callout>
    </div>
  );
}

export function QuizSessionPage({ topicId }: { topicId: string }) {
  const topic = TOPICS.find((item) => item.id === topicId);
  const questions = QUESTIONS_BY_TOPIC[topicId] ?? [];
  const { state, recordQuestion } = useProgress();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<QuestionAttemptResult | null>(null);
  const [answered, setAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  if (!topic || questions.length === 0) {
    return (
      <div className="stack">
        <section className="card">
          <h1>Topic not found</h1>
          <p>No quiz topic has the id “{topicId}”.</p>
          <ButtonLink to="/quiz" variant="primary">
            Back to quiz topics
          </ButtonLink>
        </section>
      </div>
    );
  }

  const question = questions[index];
  const mastery = masteryForTopic(state, topic.id);
  const rules = question ? getRules(question.ruleIds) : [];

  const submit = () => {
    if (!question || !selected || result) return;
    const outcome = recordQuestion(question, selected, "quiz");
    setResult(outcome);
    setAnswered((value) => value + 1);
    if (outcome.correct) setCorrectCount((value) => value + 1);
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setIndex((value) => value + 1);
    setSelected(null);
    setResult(null);
  };

  const restart = () => {
    setIndex(0);
    setSelected(null);
    setResult(null);
    setAnswered(0);
    setCorrectCount(0);
    setFinished(false);
  };

  if (finished) {
    return (
      <div className="stack">
        <PageHeader
          eyebrow="Quiz complete"
          title={`${correctCount} of ${questions.length} correct`}
          description={`Session on ${topic.name}. Session score is separate from your stored accuracy, which counts every attempt over time.`}
        />
        <section className="card result-card">
          <ProgressBar value={questions.length === 0 ? 0 : correctCount / questions.length} label="Session score" tone="good" />
          <p>
            Stored topic record: {mastery.correct}/{mastery.attempts} correct ({Math.round(mastery.ratio * 100)}%).{" "}
            {mastery.evidence}
          </p>
          <div className="row wrap gap-sm">
            <button type="button" className="button button-primary" onClick={restart}>
              Run this topic again
            </button>
            <ButtonLink to="/quiz">Choose another topic</ButtonLink>
            <ButtonLink to="/analytics">See analytics</ButtonLink>
          </div>
        </section>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="stack">
        <EmptyState title="No questions in this topic" action={<ButtonLink to="/quiz">Back to topics</ButtonLink>}>
          This topic has no published questions.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="stack">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/quiz">Quiz arena</Link>
        <span aria-hidden="true">/</span>
        <span>{topic.name}</span>
      </nav>

      <div className="quiz-layout">
        <section className="card quiz-card">
          <div className="quiz-meta">
            <span className="mono">
              Question {index + 1} / {questions.length}
            </span>
            <span className="row gap-sm">
              <Badge tone="info">{question.type}</Badge>
              <Badge tone="neutral">{question.id}</Badge>
            </span>
          </div>
          <ProgressBar value={(index + (result ? 1 : 0)) / questions.length} label="Quiz progress" />

          <h1 className="quiz-prompt">{question.prompt}</h1>
          {question.chart && (
            <CandleChart
              candles={question.chart.candles}
              lines={question.chart.level !== undefined ? [{ value: question.chart.level, label: question.chart.levelLabel ?? "Level" }] : []}
              caption={question.chart.caption}
              ariaLabel={`Chart for question ${question.id}. ${question.chart.caption}`}
              height={320}
            />
          )}

          <div className="option-list" role="group" aria-label="Answer options">
            {question.options.map((option) => {
              const isSelected = selected === option.id;
              const isCorrect = result !== null && option.id === question.answerId;
              const isWrong = result !== null && isSelected && !result.correct;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`option-button${isSelected ? " option-selected" : ""}${isCorrect ? " option-correct" : ""}${isWrong ? " option-wrong" : ""}`}
                  aria-pressed={isSelected}
                  disabled={result !== null}
                  onClick={() => setSelected(option.id)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {result ? (
            <div className={`feedback ${result.correct ? "feedback-good" : "feedback-bad"}`} role="status">
              <p className="feedback-title">{result.correct ? "Correct" : "Not this time"}</p>
              <p>{question.explanation}</p>
              <p className="muted small">
                {result.award.xp > 0
                  ? `+${result.award.xp} XP awarded for the first correct answer on this question.`
                  : result.correct
                    ? "Correct, but this question's XP was already awarded earlier. Practice record updated."
                    : "No XP for a miss. The attempt is still counted in your analytics."}
              </p>
              <div className="row wrap gap-sm">
                <RuleChips ids={question.ruleIds} />
                {rules.map((rule) => rule.sourceRef && <span key={rule.id} className="source-ref mono tiny">{rule.sourceRef}</span>)}
              </div>
              <button type="button" className="button button-primary" onClick={next}>
                {index + 1 >= questions.length ? "Finish session" : "Next question"}
              </button>
            </div>
          ) : (
            <div className="row-between quiz-actions">
              <p className="muted small">Choose one option, then submit. The explanation appears only after submission.</p>
              <button type="button" className="button button-primary" disabled={!selected} onClick={submit}>
                Submit answer
              </button>
            </div>
          )}
        </section>

        <aside className="quiz-aside">
          <section className="card">
            <h2>Session</h2>
            <dl className="hero-facts">
              <div>
                <dt>Answered</dt>
                <dd>{answered}</dd>
              </div>
              <div>
                <dt>Correct</dt>
                <dd>{correctCount}</dd>
              </div>
              <div>
                <dt>Stored accuracy</dt>
                <dd>{mastery.attempts === 0 ? "—" : `${Math.round(mastery.ratio * 100)}%`}</dd>
              </div>
              <div>
                <dt>Topic</dt>
                <dd>{mastery.label}</dd>
              </div>
            </dl>
          </section>
          <Callout title="Answer discipline" tone="info">
            If two readings of the chart are defensible, the question should not be scored. Use the register to check the
            exact source behaviour behind each answer.
          </Callout>
        </aside>
      </div>
    </div>
  );
}
