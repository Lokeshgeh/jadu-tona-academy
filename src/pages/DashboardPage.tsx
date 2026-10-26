import { LESSONS, getQuestion } from "../domain/content";
import { levelInfo, topicAccuracy } from "../domain/progress";
import { ALL_RULES, TOPICS } from "../domain/rules";
import { SCENARIOS } from "../domain/scenarios";
import { useProgress } from "../state/store";
import { Badge, ButtonLink, Callout, EmptyState, ProgressBar, RuleChips, Stat, formatDateTime } from "../components/ui";
import { Link } from "../lib/router";

export function DashboardPage() {
  const { state } = useProgress();
  const level = levelInfo(state.xp);
  const answered = state.attempts.length;
  const correct = state.attempts.filter((attempt) => attempt.correct).length;
  const accuracy = answered === 0 ? null : correct / answered;
  const completed = state.completedLessons.length;
  const nextLesson = LESSONS.find((lesson) => !state.completedLessons.includes(lesson.id)) ?? LESSONS[0]!;
  const solvedScenarios = new Set(
    state.scenarioAttempts.filter((attempt) => attempt.correct).map((attempt) => attempt.scenarioId),
  );
  const nextScenario = SCENARIOS.find((scenario) => !solvedScenarios.has(scenario.id)) ?? SCENARIOS[0]!;
  const strategyRules = ALL_RULES.filter((rule) => rule.group === "strategy");
  const verified = strategyRules.filter((rule) => rule.status === "source-verified").length;
  const recent = [...state.attempts].reverse().slice(0, 6);
  const topicNames = new Map<string, string>(TOPICS.map((topic) => [topic.id, topic.name]));
  const weakest = topicAccuracy(state)
    .filter((row) => row.attempts >= 2)
    .sort((a, b) => a.ratio - b.ratio)[0];

  return (
    <div className="stack">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Source-traceable chart practice</p>
          <h1>Read the chart. Cite the rule.</h1>
          <p className="hero-lead">
            A local-first training game built from the supplied JADU TONA Pine Script v6 indicator. Every scored
            strategy answer is tied to a rule with a source line anchor — and every chart is synthetic.
          </p>
          <div className="hero-actions">
            <ButtonLink to={`/academy/${nextLesson.id}`} variant="primary">
              {completed === 0 ? "Start the first lesson" : "Continue learning"}
            </ButtonLink>
            <ButtonLink to={`/scenarios/${nextScenario.id}`}>Try a scenario</ButtonLink>
            <ButtonLink to="/assessment">Take the assessment</ButtonLink>
          </div>
          <div className="hero-badges">
            <Badge tone="info">No accounts</Badge>
            <Badge tone="info">No network calls</Badge>
            <Badge tone="good">{verified} verified strategy rules</Badge>
            <Badge tone="warn">Synthetic data only</Badge>
          </div>
        </div>
        <div className="hero-panel">
          <div className="hero-panel-head">
            <span>Your local record</span>
            <span className="mono">v1</span>
          </div>
          <p className="hero-level">
            Level {level.level} <span>·</span> {level.title}
          </p>
          <ProgressBar value={level.progress} label="Level progress" />
          <p className="muted small">
            {level.nextMin === null
              ? "Top level reached. XP only measures practice completed."
              : `${state.xp} XP earned · ${Math.max(0, level.nextMin - state.xp)} to level ${level.level + 1}`}
          </p>
          <dl className="hero-facts">
            <div>
              <dt>Lessons complete</dt>
              <dd>
                {completed}/{LESSONS.length}
              </dd>
            </div>
            <div>
              <dt>Scenarios solved</dt>
              <dd>
                {solvedScenarios.size}/{SCENARIOS.length}
              </dd>
            </div>
            <div>
              <dt>Answers logged</dt>
              <dd>{answered}</dd>
            </div>
            <div>
              <dt>Daily streak</dt>
              <dd>{state.streak.current}</dd>
            </div>
          </dl>
          <p className="muted tiny">XP is a practice counter, not a skill rating or performance forecast.</p>
        </div>
      </section>

      <section className="stat-grid" aria-label="Practice summary">
        <Stat
          label="Question accuracy"
          value={accuracy === null ? "—" : `${Math.round(accuracy * 100)}%`}
          hint={accuracy === null ? "No answers yet. Accuracy appears after your first question." : `${correct} correct of ${answered} attempts.`}
        />
        <Stat
          label="Lessons"
          value={`${completed}/${LESSONS.length}`}
          hint={completed === LESSONS.length ? "All lessons marked complete." : "Marking a lesson complete awards 5 XP once."}
        />
        <Stat
          label="Daily streak"
          value={`${state.streak.current} day${state.streak.current === 1 ? "" : "s"}`}
          hint={`Best: ${state.streak.best}. Any saved practice activity (including a note) per UTC day extends it.`}
        />
        <Stat
          label="Scenario attempts"
          value={state.scenarioAttempts.length}
          hint={`${solvedScenarios.size} distinct scenario${solvedScenarios.size === 1 ? "" : "s"} solved.`}
        />
      </section>

      <div className="two-col">
        <section className="card">
          <div className="card-head">
            <h2>Continue</h2>
            <Link className="text-link" to="/academy">
              All lessons
            </Link>
          </div>
          <div className="continue-block">
            <p className="eyebrow">Next lesson · {nextLesson.minutes} min</p>
            <h3>{nextLesson.title}</h3>
            <p>{nextLesson.summary}</p>
            <div className="row-between">
              <RuleChips ids={nextLesson.ruleIds.slice(0, 4)} />
              <ButtonLink to={`/academy/${nextLesson.id}`} variant="primary">
                Open lesson
              </ButtonLink>
            </div>
          </div>
          <div className="divider" />
          <div className="continue-block">
            <p className="eyebrow">Next scenario · {nextScenario.difficulty}</p>
            <h3>{nextScenario.title}</h3>
            <p>{nextScenario.objective}</p>
            <ButtonLink to={`/scenarios/${nextScenario.id}`}>Open replay</ButtonLink>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Recent practice</h2>
            <Link className="text-link" to="/analytics">
              Analytics
            </Link>
          </div>
          {recent.length === 0 ? (
            <EmptyState title="No answers logged" action={<ButtonLink to="/quiz">Open the quiz arena</ButtonLink>}>
              Every answer you submit is stored locally with its topic and result. Nothing is pre-filled or estimated.
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
                        {topicNames.get(attempt.topicId) ?? attempt.topicId} · {attempt.mode} · {formatDateTime(attempt.at)}
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

      <div className="two-col">
        <section className="card">
          <div className="card-head">
            <h2>Source status</h2>
            <Link className="text-link" to="/register">
              Rule register
            </Link>
          </div>
          <p>
            The authoritative strategy file is <code>script.txt</code> (2,339 lines, Pine Script v6). The game ports the
            in-scope structure, level, ISS, EMA and analyzer logic and marks every scored strategy rule as
            source-verified with exact line anchors.
          </p>
          <ul className="check-list">
            <li>{verified} strategy rules marked source-verified.</li>
            <li>Engine behaviour is pinned by regression tests and deterministic fixtures.</li>
            <li>Out-of-scope modules are not modelled, taught, quizzed, or scored.</li>
            <li>No invented strategy rule is available for scoring.</li>
          </ul>
          <Callout title="What “verified” means here" tone="info">
            The TypeScript engine reproduces the cited Pine behaviour on fixed fixtures. It does not prove the strategy
            is profitable, nor that the source is free of errors. Documented quirks are preserved and labelled.
          </Callout>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Where to focus</h2>
            <Link className="text-link" to="/analytics">
              Full breakdown
            </Link>
          </div>
          {weakest ? (
            <>
              <p className="eyebrow">Lowest accuracy with at least two attempts</p>
              <h3>{topicNames.get(weakest.topicId) ?? weakest.topicId}</h3>
              <p>
                {weakest.correct}/{weakest.attempts} correct ({Math.round(weakest.ratio * 100)}%). This is a description
                of your own answers on this device, not a prediction.
              </p>
              <ButtonLink to={`/quiz/${weakest.topicId}`}>Practise this topic</ButtonLink>
            </>
          ) : (
            <EmptyState
              title="Not enough data yet"
              action={
                <ButtonLink to="/quiz" variant="primary">
                  Answer a few questions
                </ButtonLink>
              }
            >
              A focus suggestion appears only after at least two attempts on a topic. Until then, the app shows no
              invented weakness.
            </EmptyState>
          )}
          <div className="divider" />
          <p className="muted small">
            Question accuracy counts every logged attempt, including repeats. XP is awarded once per question when you
            first answer it correctly.
          </p>
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>What this game will not do</h2>
          <Badge tone="warn">No fabricated edge</Badge>
        </div>
        <p className="muted">
          It will not call a live market, place trades, promise an edge, or fill your progress with fabricated activity.
          Charts are generated from fixed seeds and labelled synthetic throughout.
        </p>
      </section>
    </div>
  );
}
