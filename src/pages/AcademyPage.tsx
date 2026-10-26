import { LESSONS } from "../domain/content";
import { masteryForTopic } from "../domain/mastery";
import { TOPICS } from "../domain/rules";
import { useProgress } from "../state/store";
import { Badge, ButtonLink, PageHeader, ProgressBar } from "../components/ui";
import { Link } from "../lib/router";
import { useState } from "react";

type Filter = "all" | "mechanics" | "strategy";

export function AcademyPage() {
  const { state } = useProgress();
  const [filter, setFilter] = useState<Filter>("all");
  const topicMap = new Map(TOPICS.map((topic) => [topic.id, topic]));
  const lessons = LESSONS.filter((lesson) => {
    if (filter === "all") return true;
    return topicMap.get(lesson.topicId)?.group === filter;
  });
  const completed = LESSONS.filter((lesson) => state.completedLessons.includes(lesson.id)).length;

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Academy"
        title="Build the reading habit first"
        description="Short lessons in chart mechanics and the source-verified strategy logic. Each lesson links its rules to the register, and every strategy claim has a line anchor."
        actions={<ButtonLink to="/register">Open strategy register</ButtonLink>}
      />

      <section className="card compact-card">
        <div className="row-between">
          <div>
            <p className="eyebrow">Course progress</p>
            <h2>
              {completed} of {LESSONS.length} lessons complete
            </h2>
          </div>
          <Badge tone={completed === LESSONS.length ? "good" : "info"}>{state.xp} XP total</Badge>
        </div>
        <ProgressBar value={completed / LESSONS.length} label="Lessons completed" />
        <p className="muted small">
          Completing a lesson awards 5 XP once. It does not mark the topic as mastered; mastery is based only on
          answered questions.
        </p>
      </section>

      <div className="filter-row" role="group" aria-label="Filter lessons by track">
        {(
          [
            ["all", "All lessons"],
            ["mechanics", "Chart mechanics"],
            ["strategy", "Source-verified strategy"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={filter === value ? "filter-button filter-active" : "filter-button"}
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="lesson-grid">
        {lessons.map((lesson, index) => {
          const topic = topicMap.get(lesson.topicId);
          const isComplete = state.completedLessons.includes(lesson.id);
          const mastery = masteryForTopic(state, lesson.topicId);
          return (
            <article key={lesson.id} className="lesson-card">
              <div className="lesson-card-top">
                <span className="lesson-number">{String(index + 1).padStart(2, "0")}</span>
                <div className="lesson-badges">
                  <Badge tone={topic?.group === "strategy" ? "info" : "neutral"}>{topic?.group ?? "lesson"}</Badge>
                  {isComplete && <Badge tone="good">Complete</Badge>}
                </div>
              </div>
              <h2>
                <Link to={`/academy/${lesson.id}`}>{lesson.title}</Link>
              </h2>
              <p>{lesson.summary}</p>
              <p className="muted small">
                {topic?.name} · {lesson.minutes} min · {lesson.ruleIds.length} rule references
              </p>
              <div className="lesson-card-footer">
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
                <Link className="text-link" to={`/academy/${lesson.id}`}>
                  Open lesson →
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      <section className="card">
        <div className="card-head">
          <h2>How lessons and mastery differ</h2>
          <Badge tone="info">No fake progress</Badge>
        </div>
        <p>
          A lesson completion is a bookmark: you read the page and marked it done. Topic mastery is computed from your
          own question attempts and requires at least three answers before it can show “secure so far”. Neither is a
          trading qualification.
        </p>
        <ButtonLink to="/quiz" variant="primary">
          Practise in the quiz arena
        </ButtonLink>
      </section>
    </div>
  );
}
