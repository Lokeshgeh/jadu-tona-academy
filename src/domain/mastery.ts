import type { ProgressState } from "./progress";

export type MasteryLevel = "not-started" | "learning" | "practising" | "secure";

export interface TopicMastery {
  level: MasteryLevel;
  label: string;
  attempts: number;
  correct: number;
  ratio: number;
  /** Human-readable evidence description. Never a prediction. */
  evidence: string;
}

/**
 * Topic mastery is deliberately simple and transparent: it only reflects the
 * learner's own answered questions. It is not a skill rating and does not
 * claim predictive value.
 */
export function masteryForTopic(state: ProgressState, topicId: string): TopicMastery {
  const attempts = state.attempts.filter((attempt) => attempt.topicId === topicId);
  if (attempts.length === 0) {
    return {
      level: "not-started",
      label: "Not started",
      attempts: 0,
      correct: 0,
      ratio: 0,
      evidence: "No answered questions on this topic yet.",
    };
  }
  const correct = attempts.filter((attempt) => attempt.correct).length;
  const ratio = correct / attempts.length;
  if (attempts.length < 3) {
    return {
      level: "learning",
      label: "Learning",
      attempts: attempts.length,
      correct,
      ratio,
      evidence: `${correct}/${attempts.length} correct so far. Three answers are needed before mastery can be shown.`,
    };
  }
  if (ratio < 0.8) {
    return {
      level: "practising",
      label: "Practising",
      attempts: attempts.length,
      correct,
      ratio,
      evidence: `${correct}/${attempts.length} correct (${Math.round(ratio * 100)}%). Below the 80% practice mark.`,
    };
  }
  return {
    level: "secure",
    label: "Secure so far",
    attempts: attempts.length,
    correct,
    ratio,
    evidence: `${correct}/${attempts.length} correct (${Math.round(ratio * 100)}%) across at least three answers.`,
  };
}

export function overallMastery(state: ProgressState, topicIds: readonly string[]): number {
  const started = topicIds
    .map((topicId) => masteryForTopic(state, topicId))
    .filter((mastery) => mastery.level === "secure").length;
  return topicIds.length === 0 ? 0 : started / topicIds.length;
}
