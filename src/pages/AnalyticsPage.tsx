import { getQuestion } from "../domain/content";
import { masteryForTopic } from "../domain/mastery";
import { levelInfo, topicAccuracy } from "../domain/progress";
import { TOPICS } from "../domain/rules";
import { useProgress } from "../state/store";
import { Badge, ButtonLink, Callout, EmptyState, PageHeader, ProgressBar, Stat, formatDateTime } from "../components/ui";

export function AnalyticsPage() {
  const { state } = useProgress();
  const answered = state.attempts.length;
  const correct = state.attempts.filter((attempt) => attempt.correct).length;
  const ratio = answered === 0 ? 0 : correct / answered;
  const quizAttempts = state.attempts.filter((attempt) => attempt.mode === "quiz").length;
  const assessmentAttempts = state.attempts.filter((attempt) => attempt.mode === "assessment").length;
  const topicRows = topicAccuracy(state);
  const topicMap = new Map<string, (typeof TOPICS)[number]>(TOPICS.map((topic) => [topic.id, topic]));
  const recent = [...state.attempts].reverse().slice(0, 25);
  const assessments = [...state.assessments].reverse();
  const scenarioRows = state.scenarioAttempts.reduce<Record<string, { attempts: number; correct: number }>>((acc, attempt) => {
    const row = acc[attempt.scenarioId] ?? { attempts: 0, correct: 0 };
    row.attempts += 1;
    if (attempt.correct) row.correct += 1;
    acc[attempt.scenarioId] = row;
    return acc;
  }, {});
  const level = levelInfo(state.xp);

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Analytics"
        title="Your own practice record"
        description="Every figure below is computed from actions you took on this device. There are no benchmarks, no market data, and no inferred skill score."
        actions={<ButtonLink to="/settings">Export data</ButtonLink>}
      />

      <section className="stat-grid" aria-label="Overall statistics">
        <Stat label="Question attempts" value={answered} hint={`${quizAttempts} in quizzes, ${assessmentAttempts} in assessments.`} />
        <Stat label="Accuracy" value={answered === 0 ? "—" : `${Math.round(ratio * 100)}%`} hint={answered === 0 ? "No attempts yet." : `${correct} correct of ${answered}.`} />
        <Stat label="XP" value={state.xp} hint={`Level ${level.level} · ${level.title}. Practice counter only.`} />
        <Stat label="Streak" value={`${state.streak.current} / ${state.streak.best}`} hint="Current / best consecutive activity days (UTC)." />
      </section>

      <div className="two-col">
        <section className="card">
          <div className="card-head">
            <h2>Topic accuracy</h2>
            <Badge tone="info">{topicRows.length} topics attempted</Badge>
          </div>
          {topicRows.length === 0 ? (
            <EmptyState title="No topic data yet" action={<ButtonLink to="/quiz" variant="primary">Open the quiz arena</ButtonLink>}>
              Answer at least one question and its topic will appear here.
            </EmptyState>
          ) : (
            <div className="table-wrap">
              <table className="data-table analytics-table">
                <caption>Accuracy counts every attempt, including repeats and assessment answers.</caption>
                <thead>
                  <tr>
                    <th scope="col">Topic</th>
                    <th scope="col">Attempts</th>
                    <th scope="col">Correct</th>
                    <th scope="col">Accuracy</th>
                    <th scope="col">Mastery</th>
                  </tr>
                </thead>
                <tbody>
                  {topicRows.map((row) => {
                    const mastery = masteryForTopic(state, row.topicId);
                    return (
                      <tr key={row.topicId}>
                        <th scope="row">{topicMap.get(row.topicId)?.name ?? row.topicId}</th>
                        <td>{row.attempts}</td>
                        <td>{row.correct}</td>
                        <td>
                          <div className="table-progress">
                            <ProgressBar value={row.ratio} label={`${row.topicId} accuracy`} tone={row.ratio >= 0.8 ? "good" : "accent"} />
                            <span className="mono">{Math.round(row.ratio * 100)}%</span>
                          </div>
                        </td>
                        <td>
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="muted tiny">
            Mastery requires at least three answers on a topic and an 80% practice mark. It is a description of this
            sample, not a durable rating.
          </p>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Assessment history</h2>
            <Badge tone="info">{state.assessments.length} attempts</Badge>
          </div>
          {assessments.length === 0 ? (
            <EmptyState title="No assessment attempts" action={<ButtonLink to="/assessment">Take the assessment</ButtonLink>}>
              The fixed 16-question assessment records its score and pass/fail result here.
            </EmptyState>
          ) : (
            <ul className="activity-list">
              {assessments.map((record) => (
                <li key={record.id} className="activity-item">
                  <span className={`activity-dot ${record.passed ? "dot-good" : "dot-bad"}`} aria-hidden="true" />
                  <div>
                    <p className="activity-title">
                      {record.correct}/{record.total} · {Math.round(record.ratio * 100)}%
                    </p>
                    <p className="muted tiny">{formatDateTime(record.at)}</p>
                  </div>
                  <Badge tone={record.passed ? "good" : "bad"}>{record.passed ? "Pass" : "Not passed"}</Badge>
                </li>
              ))}
            </ul>
          )}
          <div className="divider" />
          <p className="muted small">
            Pass mark: 80% (at least 13 of 16). The one-time pass bonus is awarded once per device, not once per attempt.
          </p>
        </section>
      </div>

      <div className="two-col">
        <section className="card">
          <div className="card-head">
            <h2>Scenario record</h2>
            <Badge tone="info">{state.scenarioAttempts.length} submissions</Badge>
          </div>
          {Object.keys(scenarioRows).length === 0 ? (
            <EmptyState title="No scenario attempts" action={<ButtonLink to="/scenarios">Open scenarios</ButtonLink>}>
              Scenario results appear here after you submit a replay.
            </EmptyState>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Scenario</th>
                    <th scope="col">Attempts</th>
                    <th scope="col">Correct</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(scenarioRows).map(([id, row]) => (
                    <tr key={id}>
                      <th scope="row" className="mono">{id}</th>
                      <td>{row.attempts}</td>
                      <td>{row.correct}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Recently answered</h2>
            <Badge tone="info">{recent.length} shown</Badge>
          </div>
          {recent.length === 0 ? (
            <EmptyState title="Nothing logged yet" action={<ButtonLink to="/quiz">Answer a question</ButtonLink>}>
              Your attempt log is empty. The app will not fill it with sample activity.
            </EmptyState>
          ) : (
            <ul className="activity-list">
              {recent.map((attempt, index) => {
                const question = getQuestion(attempt.questionId);
                return (
                  <li key={`${attempt.at}-${attempt.questionId}-${index}`} className="activity-item">
                    <span className={`activity-dot ${attempt.correct ? "dot-good" : "dot-bad"}`} aria-hidden="true" />
                    <div>
                      <p className="activity-title">{question?.prompt ?? attempt.questionId}</p>
                      <p className="muted tiny">
                        {attempt.topicId} · {attempt.mode} · {formatDateTime(attempt.at)}
                      </p>
                    </div>
                    <Badge tone={attempt.correct ? "good" : "bad"}>{attempt.correct ? "Correct" : "Missed"}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <Callout title="Deliberately absent metrics" tone="info">
        There is no profit factor, win rate on trades, expectancy, drawdown, Sharpe ratio, or “edge” estimate. This app
        never executed or simulated a trading account, so those numbers would be fabricated.
      </Callout>
    </div>
  );
}
