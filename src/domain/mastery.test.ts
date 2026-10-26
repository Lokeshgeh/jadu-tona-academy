import { describe, expect, it } from "vitest";
import { getQuestion } from "./content";
import { emptyProgress, recordQuestionAttempt } from "./progress";
import { masteryForTopic, overallMastery } from "./mastery";

const day = new Date("2026-01-01T10:00:00.000Z");
const q = getQuestion("Q-STR-03")!;
const topic = q.topicId;

describe("mastery", () => {
  it("starts empty and requires three answers", () => {
    let state = emptyProgress(day);
    expect(masteryForTopic(state, topic).level).toBe("not-started");
    state = recordQuestionAttempt(state, q, q.answerId, "quiz", day).state;
    expect(masteryForTopic(state, topic).level).toBe("learning");
    state = recordQuestionAttempt(state, q, q.answerId, "quiz", day).state;
    expect(masteryForTopic(state, topic).level).toBe("learning");
    state = recordQuestionAttempt(state, q, q.answerId, "quiz", day).state;
    expect(masteryForTopic(state, topic).level).toBe("secure");
  });

  it("does not call a low-accuracy topic secure", () => {
    let state = emptyProgress(day);
    const wrong = q.options.find((option) => option.id !== q.answerId)!.id;
    state = recordQuestionAttempt(state, q, wrong, "quiz", day).state;
    state = recordQuestionAttempt(state, q, wrong, "quiz", day).state;
    state = recordQuestionAttempt(state, q, q.answerId, "quiz", day).state;
    const mastery = masteryForTopic(state, topic);
    expect(mastery.level).toBe("practising");
    expect(mastery.ratio).toBeCloseTo(1 / 3);
  });

  it("computes overall secure share over the supplied topic set", () => {
    expect(overallMastery(emptyProgress(day), [])).toBe(0);
    expect(overallMastery(emptyProgress(day), [topic])).toBe(0);
  });
});
