import { SCENARIOS } from "../domain/scenarios";
import { TOPICS } from "../domain/rules";
import { useProgress } from "../state/store";
import { Badge, ButtonLink, Callout, PageHeader, ProgressBar, Stat } from "../components/ui";

export function ScenariosPage() {
  const { state } = useProgress();
  const solved = new Set(state.scenarioAttempts.filter((attempt) => attempt.correct).map((attempt) => attempt.scenarioId));
  const totalAttempts = state.scenarioAttempts.length;
  const correctAttempts = state.scenarioAttempts.filter((attempt) => attempt.correct).length;
  const topicMap = new Map(TOPICS.map((topic) => [topic.id, topic.name]));

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Scenario library"
        title="Decide with the right edge hidden"
        description="Each replay reveals one bar at a time up to the decision point. Future candles and the answer key stay out of the visible state until you submit."
        actions={<ButtonLink to="/lab">Open chart lab</ButtonLink>}
      />

      <section className="stat-grid" aria-label="Scenario progress">
        <Stat label="Scenarios solved" value={`${solved.size}/${SCENARIOS.length}`} hint="A scenario counts as solved after one correct submission." />
        <Stat label="Attempts" value={totalAttempts} hint="Every submission is recorded, including retries." />
        <Stat label="Correct attempts" value={correctAttempts} hint="Correct submissions across all scenarios." />
        <Stat label="Answer keys" value="Sealed" hint="Keys are held in private fields and only returned after submission." />
      </section>

      <div className="scenario-grid">
        {SCENARIOS.map((scenario) => {
          const attempts = state.scenarioAttempts.filter((attempt) => attempt.scenarioId === scenario.id);
          const isSolved = solved.has(scenario.id);
          const best = attempts.some((attempt) => attempt.correct);
          return (
            <article key={scenario.id} className="scenario-card">
              <div className="row-between">
                <Badge tone={scenario.difficulty === "intro" ? "good" : scenario.difficulty === "core" ? "info" : "warn"}>
                  {scenario.difficulty}
                </Badge>
                {best ? <Badge tone="good">Solved</Badge> : attempts.length > 0 ? <Badge tone="warn">Attempted</Badge> : <Badge tone="neutral">New</Badge>}
              </div>
              <h2>{scenario.title}</h2>
              <p>{scenario.objective}</p>
              <p className="muted small">
                {topicMap.get(scenario.topicId) ?? scenario.topicId} · decision at bar {scenario.revealAt} · {attempts.length} attempt
                {attempts.length === 1 ? "" : "s"}
              </p>
              <div className="scenario-card-footer">
                <span className="mono tiny">{scenario.id}</span>
                <ButtonLink to={`/scenarios/${scenario.id}`} variant={isSolved ? "secondary" : "primary"}>
                  {attempts.length === 0 ? "Start replay" : isSolved ? "Replay" : "Try again"}
                </ButtonLink>
              </div>
            </article>
          );
        })}
      </div>

      <section className="card">
        <div className="card-head">
          <h2>How the replay boundary works</h2>
          <Badge tone="info">No lookahead</Badge>
        </div>
        <p>
          The session exposes only a snapshot: revealed candles, the unlocked task, and (after submission) the result. It
          never allows the reveal to pass the decision bar before submission, even after the question unlocks.
        </p>
        <ProgressBar value={SCENARIOS.length === 0 ? 0 : solved.size / SCENARIOS.length} label="Scenarios solved" />
        <Callout title="Synthetic, not historical" tone="warn">
          All scenarios are seeded or hand-built synthetic sequences. They are designed to exercise specific source
          conditions and are not samples of market history. A correct answer here is not a trading result.
        </Callout>
      </section>
    </div>
  );
}
