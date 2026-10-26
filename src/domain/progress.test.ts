import { beforeEach, describe, expect, it } from "vitest";
import { createAnnotation, makeAnnotationId, removeAnnotation } from "./annotations";
import { ASSESSMENT_QUESTION_IDS, getQuestion, getQuestions } from "./content";
import {
  CORRUPT_BACKUP_KEY,
  LIMITS,
  STORAGE_KEY,
  XP_VALUES,
  addAnnotationToState,
  completeLesson,
  emptyProgress,
  exportProgress,
  importProgress,
  levelInfo,
  migrateProgress,
  progressSchema,
  recordAssessment,
  recordQuestionAttempt,
  recordScenarioAttempt,
  removeAnnotationFromState,
  topicAccuracy,
} from "./progress";
import { loadProgress, saveProgress } from "../lib/storage";

const q = getQuestion("Q-MEC-01")!; // answer "a"
const q2 = getQuestion("Q-MEC-02")!; // answer "true"

describe("question scoring", () => {
  it("awards XP once per question, no matter how often it is answered", () => {
    const day1 = new Date("2026-01-01T10:00:00.000Z");
    const first = recordQuestionAttempt(emptyProgress(day1), q, "a", "quiz", day1);
    expect(first.correct).toBe(true);
    expect(first.award.xp).toBe(XP_VALUES.question);
    expect(first.state.xp).toBe(10);

    const second = recordQuestionAttempt(first.state, q, "a", "quiz", day1);
    expect(second.award.xp).toBe(0);
    expect(second.firstCorrect).toBe(false);
    expect(second.state.xp).toBe(10);
    expect(second.state.attempts).toHaveLength(2);
  });

  it("awards only when the learner eventually gets it right", () => {
    const day = new Date("2026-01-01T10:00:00.000Z");
    const wrong = recordQuestionAttempt(emptyProgress(day), q, "b", "quiz", day);
    expect(wrong.correct).toBe(false);
    expect(wrong.award.xp).toBe(0);
    expect(wrong.state.xp).toBe(0);
    const right = recordQuestionAttempt(wrong.state, q, "a", "quiz", day);
    expect(right.award.xp).toBe(10);
    expect(right.state.xp).toBe(10);
    expect(topicAccuracy(right.state)).toEqual([
      { topicId: "chart-basics", attempts: 2, correct: 1, ratio: 0.5 },
    ]);
  });

  it("rejects option ids that are not part of the question", () => {
    expect(() => recordQuestionAttempt(emptyProgress(), q, "zzz", "quiz")).toThrow(/unknown answer option/i);
  });
});

describe("streaks and levels", () => {
  it("counts one activity day, resets after a gap, and keeps the best", () => {
    const day1 = new Date("2026-01-01T08:00:00.000Z");
    const day2 = new Date("2026-01-02T08:00:00.000Z");
    const day4 = new Date("2026-01-04T08:00:00.000Z");
    const a = recordQuestionAttempt(emptyProgress(day1), q, "a", "quiz", day1).state;
    const b = recordQuestionAttempt(a, q2, "true", "quiz", day1).state;
    expect(b.streak).toEqual({ current: 1, best: 1, lastDay: "2026-01-01" });
    const c = recordQuestionAttempt(b, q, "a", "quiz", day2).state;
    expect(c.streak).toEqual({ current: 2, best: 2, lastDay: "2026-01-02" });
    const d = recordQuestionAttempt(c, q, "a", "quiz", day4).state;
    expect(d.streak).toEqual({ current: 1, best: 2, lastDay: "2026-01-04" });
  });

  it("exposes a bounded level ladder", () => {
    expect(levelInfo(0).level).toBe(1);
    expect(levelInfo(0).progress).toBe(0);
    expect(levelInfo(100).level).toBe(2);
    expect(levelInfo(1_000_000).level).toBe(6);
    expect(levelInfo(1_000_000).nextMin).toBeNull();
    expect(levelInfo(175).progress).toBeGreaterThan(0);
    expect(levelInfo(175).progress).toBeLessThan(1);
  });
});

describe("lessons, scenarios and assessments", () => {
  it("awards a lesson once", () => {
    const day = new Date("2026-02-01T10:00:00.000Z");
    const first = completeLesson(emptyProgress(day), "LSN-CANDLE", day);
    expect(first.alreadyComplete).toBe(false);
    expect(first.state.xp).toBe(XP_VALUES.lesson);
    const second = completeLesson(first.state, "LSN-CANDLE", day);
    expect(second.alreadyComplete).toBe(true);
    expect(second.award.xp).toBe(0);
    expect(second.state.xp).toBe(XP_VALUES.lesson);
  });

  it("awards a scenario once and records every attempt", () => {
    const day = new Date("2026-02-02T10:00:00.000Z");
    const first = recordScenarioAttempt(emptyProgress(day), "SCN-BOS-01", "bull-bos", true, day);
    expect(first.award.xp).toBe(XP_VALUES.scenario);
    const second = recordScenarioAttempt(first.state, "SCN-BOS-01", "bull-bos", true, day);
    expect(second.award.xp).toBe(0);
    expect(second.state.scenarioAttempts).toHaveLength(2);
  });

  it("awards assessment question XP plus a single pass bonus", () => {
    const day = new Date("2026-03-01T10:00:00.000Z");
    const questions = getQuestions(ASSESSMENT_QUESTION_IDS);
    const inputs = questions.map((question) => ({ question, selectedId: question.answerId }));
    const first = recordAssessment(emptyProgress(day), inputs, day);
    expect(first.correct).toBe(questions.length);
    expect(first.passed).toBe(true);
    expect(first.award.xp).toBe(questions.length * 10 + XP_VALUES.assessmentPass);
    expect(first.state.assessments).toHaveLength(1);
    const second = recordAssessment(first.state, inputs, day);
    expect(second.award.xp).toBe(0);
    expect(second.state.xp).toBe(first.state.xp);
    expect(second.state.assessments).toHaveLength(2);
  });

  it("does not award the pass bonus on a failed attempt", () => {
    const day = new Date("2026-03-02T10:00:00.000Z");
    const questions = getQuestions(ASSESSMENT_QUESTION_IDS);
    const inputs = questions.map((question) => {
      const wrong = question.options.find((option) => option.id !== question.answerId)!;
      return { question, selectedId: wrong.id };
    });
    const result = recordAssessment(emptyProgress(day), inputs, day);
    expect(result.passed).toBe(false);
    expect(result.award.xp).toBe(0);
    expect(result.state.xp).toBe(0);
  });

  it("rejects an empty assessment", () => {
    expect(() => recordAssessment(emptyProgress(), [])).toThrow(/no answers/i);
  });
});

describe("annotations", () => {
  it("creates, validates and removes annotations", () => {
    const created = createAnnotation(
      { kind: "support", price: 99.5, barIndex: 12, text: "  demand shelf  " },
      new Date("2026-04-01T10:00:00.000Z"),
      "ann-stable-1",
    );
    expect(created.text).toBe("demand shelf");
    expect(created.barIndex).toBe(12);
    expect(() =>
      createAnnotation({ kind: "note", price: -1, text: "bad" }, new Date(), "ann-stable-2"),
    ).toThrow();
    expect(() =>
      createAnnotation({ kind: "note", price: 1, text: "x".repeat(161) }, new Date(), "ann-stable-3"),
    ).toThrow();
    const list = removeAnnotation([created], "ann-stable-1");
    expect(list).toHaveLength(0);
    expect(makeAnnotationId()).toMatch(/^ann-/);
  });

  it("stores annotations in progress and enforces the limit", () => {
    const state = emptyProgress(new Date("2026-04-01T10:00:00.000Z"));
    const one = createAnnotation({ kind: "note", price: 10, text: "note" }, new Date(), "ann-1");
    const next = addAnnotationToState(state, one);
    expect(next.annotations).toHaveLength(1);
    expect(removeAnnotationFromState(next, "ann-1").annotations).toHaveLength(0);

    const full = progressSchema.parse({
      ...state,
      annotations: Array.from({ length: LIMITS.annotations }, (_, index) =>
        createAnnotation({ kind: "note", price: 10 + index, text: `n${index}` }, new Date(), `ann-${index}`),
      ),
    });
    expect(() => addAnnotationToState(full, one)).toThrow(/limit/i);
  });
});

describe("export, import and migration", () => {
  it("round-trips a valid bundle", () => {
    const day = new Date("2026-05-01T10:00:00.000Z");
    const state = recordQuestionAttempt(emptyProgress(day), q, "a", "quiz", day).state;
    const text = exportProgress(state, day);
    expect(importProgress(text)).toEqual(state);
  });

  it("rejects malformed, oversized and foreign bundles", () => {
    expect(() => importProgress("not json")).toThrow(/not valid json/i);
    expect(() => importProgress(JSON.stringify({ app: "other", bundleVersion: 1, exportedAt: new Date().toISOString(), progress: {} }))).toThrow(
      /not a JADU TONA/i,
    );
    expect(() => importProgress("x".repeat(LIMITS.importBytes + 1))).toThrow(/larger than/i);
    const state = emptyProgress();
    const bundle = JSON.parse(exportProgress(state));
    bundle.progress.schemaVersion = 99;
    expect(() => importProgress(JSON.stringify(bundle))).toThrow(/unsupported progress schema/i);
  });

  it("migrates the pre-versioned preview shape", () => {
    const migrated = migrateProgress({
      xp: 40,
      attempts: [],
      completedLessons: ["LSN-CANDLE"],
      annotations: [],
      streak: { current: 2, best: 3, lastDay: "2026-01-02" },
    });
    expect(migrated.schemaVersion).toBe(1);
    expect(migrated.xp).toBe(40);
    expect(migrated.completedLessons).toEqual(["LSN-CANDLE"]);
    expect(migrated.streak.current).toBe(2);
  });

  it("rejects non-object data and invalid state", () => {
    expect(() => migrateProgress([])).toThrow(/json object/i);
    expect(() => migrateProgress(null)).toThrow(/json object/i);
    expect(() => progressSchema.parse({ ...emptyProgress(), xp: -10 })).toThrow();
  });
});

describe("local storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("saves and loads valid progress", () => {
    const state = emptyProgress(new Date("2026-06-01T10:00:00.000Z"));
    expect(saveProgress(state).ok).toBe(true);
    const loaded = loadProgress(new Date("2026-06-01T10:00:00.000Z"));
    expect(loaded.error).toBeNull();
    expect(loaded.state).toEqual(state);
  });

  it("backs up corrupt data instead of silently deleting it", () => {
    window.localStorage.setItem(STORAGE_KEY, "{broken");
    const loaded = loadProgress();
    expect(loaded.error).toMatch(/could not be read/i);
    expect(loaded.backedUp).toBe(true);
    expect(window.localStorage.getItem(CORRUPT_BACKUP_KEY)).toBe("{broken");
    expect(loaded.state.xp).toBe(0);
  });

  it("refuses to persist an invalid state", () => {
    const invalid = { ...emptyProgress(), xp: -5 } as unknown as ReturnType<typeof emptyProgress>;
    const result = saveProgress(invalid);
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
