import { describe, expect, it } from "vitest";
import { createReplaySession, findSnapshotLeak } from "./replay";
import { SCENARIOS, SEALED_ANSWERS, getScenario, scenarioLevel } from "./scenarios";

describe("scenario catalogue", () => {
  it("has a sealed key for every scenario", () => {
    for (const scenario of SCENARIOS) {
      const key = SEALED_ANSWERS[scenario.id];
      expect(key, scenario.id).toBeDefined();
      expect(scenario.task.options.some((option) => option.id === key!.answerId), scenario.id).toBe(true);
      expect(key!.explanation.length, scenario.id).toBeGreaterThan(20);
      expect(scenario.revealAt).toBeGreaterThanOrEqual(2);
      expect(scenario.revealAt).toBeLessThan(scenario.candles.length);
      expect(scenario.candles.length).toBeGreaterThan(scenario.revealAt);
      expect(scenario.synthetic).toBe(true);
    }
  });

  it("keeps scenario ids, prompts and option labels unique", () => {
    expect(new Set(SCENARIOS.map((scenario) => scenario.id)).size).toBe(SCENARIOS.length);
    expect(new Set(SCENARIOS.map((scenario) => scenario.title)).size).toBe(SCENARIOS.length);
    for (const scenario of SCENARIOS) {
      expect(new Set(scenario.task.options.map((option) => option.id)).size).toBe(scenario.task.options.length);
      expect(new Set(scenario.task.options.map((option) => option.label)).size).toBe(scenario.task.options.length);
    }
  });

  it("exposes only the optional reference level, never answers", () => {
    const serialised = JSON.stringify(SCENARIOS);
    expect(serialised).not.toContain("answerId");
    expect(serialised).not.toContain("explanation");
    expect(scenarioLevel(SCENARIOS[0]!)).toBeNull();
    expect(scenarioLevel(getScenario("SCN-TOUCH-01")!)).not.toBeNull();
  });
});

describe("ReplaySession no-leak boundary", () => {
  it("never shows past the task bar, even after the question unlocks", () => {
    for (const scenario of SCENARIOS) {
      const session = createReplaySession(scenario);
      let snapshot = session.snapshot();
      expect(findSnapshotLeak(snapshot), scenario.id).toBeNull();
      expect(snapshot.question).toBeNull();

      while (session.advance()) {
        snapshot = session.snapshot();
        expect(findSnapshotLeak(snapshot), scenario.id).toBeNull();
      }

      expect(session.step, scenario.id).toBe(scenario.revealAt);
      expect(snapshot.revealedCount, scenario.id).toBe(scenario.revealAt + 1);
      expect(snapshot.visibleCandles.at(-1)?.index, scenario.id).toBe(scenario.revealAt);
      expect(snapshot.question, scenario.id).not.toBeNull();
      expect(snapshot.result, scenario.id).toBeNull();
      expect(snapshot.canAdvance, scenario.id).toBe(false);
      expect(JSON.stringify(snapshot), scenario.id).not.toContain("explanation");
    }
  });

  it("refuses to submit before unlock or twice", () => {
    const scenario = getScenario("SCN-BOS-01")!;
    const session = createReplaySession(scenario);
    expect(session.submitted).toBe(false);
    expect(() => session.submit(SEALED_ANSWERS[scenario.id]!.answerId)).toThrow(/not available/i);
    session.advanceToQuestion();
    const result = session.submit(SEALED_ANSWERS[scenario.id]!.answerId);
    expect(result.correct).toBe(true);
    expect(result.explanation.length).toBeGreaterThan(20);
    expect(session.snapshot().result).toEqual(result);
    expect(() => session.submit(SEALED_ANSWERS[scenario.id]!.answerId)).toThrow(/already/i);
    session.reset();
    expect(session.snapshot().result).toBeNull();
    expect(session.snapshot().submitted).toBe(false);
  });

  it("marks a wrong answer without exposing the key beforehand", () => {
    const scenario = getScenario("SCN-QML-01")!;
    const session = createReplaySession(scenario);
    session.advanceToQuestion();
    const wrong = scenario.task.options.find((option) => option.id !== SEALED_ANSWERS[scenario.id]!.answerId)!;
    const before = JSON.stringify(session.snapshot());
    expect(before).not.toContain(SEALED_ANSWERS[scenario.id]!.explanation);
    const result = session.submit(wrong.id);
    expect(result.correct).toBe(false);
    expect(result.answerId).toBe(SEALED_ANSWERS[scenario.id]!.answerId);
  });

  it("rejects unknown options and missing keys", () => {
    const scenario = SCENARIOS[0]!;
    const session = createReplaySession(scenario);
    session.advanceToQuestion();
    expect(() => session.submit("not-an-option")).toThrow(/unknown option/i);
    expect(() => createReplaySession(scenario, {})).toThrow(/missing sealed answer/i);
  });
});
