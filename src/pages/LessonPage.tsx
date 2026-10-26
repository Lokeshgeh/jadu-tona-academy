import { useState } from "react";
import { LESSONS, getLesson } from "../domain/content";
import { getRules, TOPICS } from "../domain/rules";
import { useProgress } from "../state/store";
import { Badge, ButtonLink, Callout, RuleChips } from "../components/ui";
import { LessonDemo } from "../components/LessonDemo";
import { Link } from "../lib/router";

export function LessonPage({ lessonId }: { lessonId: string }) {
  const lesson = getLesson(lessonId);
  const { state, markLessonComplete } = useProgress();
  const [notice, setNotice] = useState<string | null>(null);
  if (!lesson) {
    return (
      <div className="stack">
        <section className="card">
          <h1>Lesson not found</h1>
          <p>No lesson has the id “{lessonId}”.</p>
          <ButtonLink to="/academy" variant="primary">
            Back to the academy
          </ButtonLink>
        </section>
      </div>
    );
  }
  const topic = TOPICS.find((item) => item.id === lesson.topicId);
  const rules = getRules(lesson.ruleIds);
  const complete = state.completedLessons.includes(lesson.id);
  const index = LESSONS.findIndex((item) => item.id === lesson.id);
  const previous = index > 0 ? LESSONS[index - 1] : null;
  const next = index >= 0 && index < LESSONS.length - 1 ? LESSONS[index + 1] : null;

  const onComplete = () => {
    const result = markLessonComplete(lesson.id);
    setNotice(
      result.alreadyComplete
        ? "This lesson was already marked complete; no additional XP was awarded."
        : `Lesson marked complete. +${result.award.xp} XP awarded once.`,
    );
  };

  return (
    <div className="stack">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/academy">Academy</Link>
        <span aria-hidden="true">/</span>
        <span>{lesson.title}</span>
      </nav>

      <header className="lesson-header">
        <div>
          <p className="eyebrow">
            {topic?.group === "strategy" ? "Source-verified strategy" : "Chart mechanics"} · {lesson.minutes} min
          </p>
          <h1>{lesson.title}</h1>
          <p className="page-description">{lesson.summary}</p>
          <div className="row wrap gap-sm">
            <Badge tone="info">{topic?.name}</Badge>
            {complete ? <Badge tone="good">Complete</Badge> : <Badge tone="neutral">Not marked complete</Badge>}
            <RuleChips ids={lesson.ruleIds} />
          </div>
        </div>
      </header>

      <div className="lesson-layout">
        <article className="lesson-body">
          {lesson.sections.map((section) => (
            <section key={section.heading} className="lesson-section">
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
              {section.bullets && (
                <ul>
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <section className="lesson-section">
            <h2>Key points</h2>
            <ul className="check-list">
              {lesson.keyPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>

          <LessonDemo topicId={lesson.topicId} />

          <section className="card lesson-complete-card">
            <div>
              <h2>{complete ? "Lesson already complete" : "Finished reading?"}</h2>
              <p className="muted">
                Marking complete is a bookmark and awards 5 XP once. It does not change topic mastery, which depends on
                answered questions.
              </p>
              {notice && <p className="notice" role="status">{notice}</p>}
            </div>
            <div className="row wrap gap-sm">
              <button type="button" className="button button-primary" onClick={onComplete} disabled={complete}>
                {complete ? "Complete" : "Mark lesson complete"}
              </button>
              <ButtonLink to={`/quiz/${lesson.topicId}`}>Practise this topic</ButtonLink>
            </div>
          </section>

          <nav className="lesson-nav" aria-label="Lesson navigation">
            {previous ? (
              <Link to={`/academy/${previous.id}`} className="lesson-nav-link">
                <span className="muted tiny">Previous</span>
                <span>{previous.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link to={`/academy/${next.id}`} className="lesson-nav-link lesson-nav-next">
                <span className="muted tiny">Next</span>
                <span>{next.title}</span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </article>

        <aside className="lesson-aside" aria-label="Rule references">
          <div className="card">
            <div className="card-head">
              <h2>Rule references</h2>
              <Badge tone={topic?.group === "strategy" ? "good" : "neutral"}>{rules.length}</Badge>
            </div>
            {rules.map((rule) => (
              <div key={rule.id} className="rule-ref">
                <div className="row-between">
                  <Link to={`/register?focus=${rule.id}`} className="mono text-link">
                    {rule.id}
                  </Link>
                  <Badge tone={rule.status === "source-verified" ? "good" : "neutral"}>{rule.status}</Badge>
                </div>
                <p className="rule-ref-label">{rule.label}</p>
                <p className="muted small">{rule.summary}</p>
                {rule.sourceRef && <p className="source-ref mono tiny">{rule.sourceRef}</p>}
              </div>
            ))}
            {rules.length === 0 && <p className="muted">No rules are attached to this lesson.</p>}
          </div>

          <Callout title="Scoring boundary" tone="info">
            Strategy questions are scored only when the answer is fixed by the cited source behaviour and the visible
            data. Ambiguous interpretation is not turned into a point.
          </Callout>
        </aside>
      </div>
    </div>
  );
}
