import { useState } from "react";
import { createReplaySession, type ReplaySnapshot } from "../domain/replay";
import { getScenario, scenarioLevel } from "../domain/scenarios";
import { getRules, TOPICS } from "../domain/rules";
import { useProgress } from "../state/store";
import { Badge, ButtonLink, Callout, PageHeader, ProgressBar, RuleChips } from "../components/ui";
import { CandleChart } from "../components/CandleChart";
import { Link } from "../lib/router";

export function ScenarioReplayPage({ scenarioId }: { scenarioId: string }) {
  const scenario = getScenario(scenarioId);
  const { recordScenario } = useProgress();
  const [session] = useState(() => (scenario ? createReplaySession(scenario) : null));
  const [snapshot, setSnapshot] = useState<ReplaySnapshot | null>(() => (session ? session.snapshot() : null));
  const [selected, setSelected] = useState<string | null>(null);
  const [awarded, setAwarded] = useState(0);

  if (!scenario || !session || !snapshot) {
    return (
      <div className="stack">
        <section className="card">
          <h1>Scenario not found</h1>
          <p>No replay exists for “{scenarioId}”.</p>
          <ButtonLink to="/scenarios" variant="primary">
            Back to scenarios
          </ButtonLink>
        </section>
      </div>
    );
  }

  const topic = TOPICS.find((item) => item.id === scenario.topicId);
  const level = scenarioLevel(scenario);
  const rules = getRules(scenario.ruleIds);
  const decisionBars = scenario.revealAt + 1;
  const revealed = snapshot.revealedCount;
  const canSubmit = snapshot.questionUnlocked && !snapshot.submitted && selected !== null;

  const refresh = () => setSnapshot(session.snapshot());

  const advance = () => {
    session.advance();
    refresh();
  };

  const jump = () => {
    session.advanceToQuestion();
    refresh();
  };

  const submit = () => {
    if (!canSubmit || !selected) return;
    const result = session.submit(selected);
    const storeResult = recordScenario(scenario.id, selected, result.correct);
    setAwarded(storeResult.award.xp);
    refresh();
  };

  const reset = () => {
    session.reset();
    setSelected(null);
    setAwarded(0);
    refresh();
  };

  const correctLabel = snapshot.result
    ? scenario.task.options.find((option) => option.id === snapshot.result?.answerId)?.label ?? snapshot.result.answerId
    : null;

  return (
    <div className="stack">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/scenarios">Scenarios</Link>
        <span aria-hidden="true">/</span>
        <span>{scenario.title}</span>
      </nav>

      <PageHeader
        eyebrow={`${scenario.id} · ${scenario.difficulty}`}
        title={scenario.title}
        description={scenario.objective}
        actions={<Badge tone="warn">Synthetic replay</Badge>}
      />

      <div className="replay-layout">
        <section className="card replay-chart-card">
          <div className="card-head">
            <div>
              <h2>Price replay</h2>
              <p className="muted small">
                {topic?.name} · task unlocks at bar {scenario.revealAt} · {revealed} of {decisionBars} bars revealed
              </p>
            </div>
            <Badge tone={snapshot.questionUnlocked ? "good" : "info"}>
              {snapshot.questionUnlocked ? "Task unlocked" : "Revealing"}
            </Badge>
          </div>
          <ProgressBar value={revealed / decisionBars} label="Replay reveal progress" />
          <CandleChart
            candles={snapshot.visibleCandles}
            lines={level ? [{ value: level.value, label: level.label, color: "#f4c95d" }] : []}
            caption={`Synthetic replay, bars 0–${snapshot.step}. Future bars are not loaded into the chart before submission.`}
            ariaLabel={`Synthetic price replay through bar ${snapshot.step}.`}
          />
          <div className="row wrap gap-sm">
            <button type="button" className="button button-secondary" onClick={advance} disabled={!snapshot.canAdvance}>
              Reveal next bar
            </button>
            <button type="button" className="button button-ghost" onClick={jump} disabled={snapshot.questionUnlocked}>
              Jump to task
            </button>
            <button type="button" className="button button-ghost" onClick={reset}>
              Reset replay
            </button>
          </div>
          <p className="muted tiny">
            The chart cannot advance past bar {scenario.revealAt} until you submit. After submission the answer key is
            revealed in the panel; the candles stay at the decision point.
          </p>
        </section>

        <aside className="replay-panel">
          <section className="card">
            <div className="card-head">
              <h2>Task</h2>
              <Badge tone="info">{scenario.task.options.length} options</Badge>
            </div>
            {!snapshot.questionUnlocked ? (
              <div className="locked-task">
                <p>Reveal {scenario.revealAt + 1 - revealed} more bar{scenario.revealAt + 1 - revealed === 1 ? "" : "s"} to unlock the task.</p>
                <button type="button" className="button button-primary" onClick={jump}>
                  Jump to the decision bar
                </button>
                <p className="muted tiny">No future candle beyond the decision bar is shown, even after unlock.</p>
              </div>
            ) : (
              <>
                <p className="task-prompt">{scenario.task.prompt}</p>
                <div className="option-list" role="group" aria-label="Scenario options">
                  {scenario.task.options.map((option) => {
                    const isSelected = selected === option.id;
                    const isCorrect = snapshot.submitted && option.id === snapshot.result?.answerId;
                    const isWrong = snapshot.submitted && isSelected && snapshot.result?.correct === false;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={`option-button${isSelected ? " option-selected" : ""}${isCorrect ? " option-correct" : ""}${isWrong ? " option-wrong" : ""}`}
                        aria-pressed={isSelected}
                        disabled={snapshot.submitted}
                        onClick={() => setSelected(option.id)}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                {!snapshot.submitted ? (
                  <div className="stack-tight">
                    <button type="button" className="button button-primary" onClick={submit} disabled={!canSubmit}>
                      Submit answer
                    </button>
                    <p className="muted tiny">The answer key and explanation stay sealed until you submit.</p>
                  </div>
                ) : (
                  <div className={`feedback ${snapshot.result?.correct ? "feedback-good" : "feedback-bad"}`} role="status">
                    <p className="feedback-title">{snapshot.result?.correct ? "Correct" : "Not this time"}</p>
                    {correctLabel && <p><strong>Answer:</strong> {correctLabel}</p>}
                    <p>{snapshot.result?.explanation}</p>
                    <p className="muted small">
                      {snapshot.result?.correct
                        ? awarded > 0
                          ? `+${awarded} XP awarded for the first correct submission on this scenario.`
                          : "Correct. XP was already awarded for this scenario on an earlier attempt."
                        : "No XP for a miss. The attempt is recorded and you can reset to try again."}
                    </p>
                    <div className="row wrap gap-sm">
                      <button type="button" className="button button-primary" onClick={reset}>
                        Reset and retry
                      </button>
                      <ButtonLink to="/scenarios">All scenarios</ButtonLink>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          <section className="card">
            <h2>Source basis</h2>
            <p className="muted small">{scenario.sourceNote}</p>
            <div className="row wrap gap-sm">
              <RuleChips ids={scenario.ruleIds} />
            </div>
            {rules.map((rule) => (
              <p key={rule.id} className="source-ref mono tiny">
                {rule.id} · {rule.sourceRef ?? "definition"}
              </p>
            ))}
          </section>

          <Callout title="One decision, no hindsight" tone="info">
            The replay stops at the task bar. If the answer depends on a later bar, it is not a valid scored question.
          </Callout>
        </aside>
      </div>
    </div>
  );
}
