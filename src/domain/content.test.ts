import { describe, expect, it } from "vitest";
import { isValidCandle } from "./chart";
import {
  ASSESSMENT_QUESTION_IDS,
  LESSONS,
  QUESTIONS,
  QUESTIONS_BY_TOPIC,
  getQuestion,
  getQuestions,
} from "./content";
import { ASSESSMENT_PASS_RATIO } from "./progress";
import { ALL_RULES, TOPICS } from "./rules";

describe("content integrity", () => {
  it("has unique lesson and question ids", () => {
    expect(new Set(LESSONS.map((lesson) => lesson.id)).size).toBe(LESSONS.length);
    expect(new Set(QUESTIONS.map((question) => question.id)).size).toBe(QUESTIONS.length);
    expect(new Set(QUESTIONS.map((question) => question.prompt)).size).toBe(QUESTIONS.length);
  });

  it("references only registered topics and rules", () => {
    const topicIds = new Set(TOPICS.map((topic) => topic.id));
    const ruleIds = new Set(ALL_RULES.map((rule) => rule.id));
    for (const lesson of LESSONS) {
      expect(topicIds.has(lesson.topicId), lesson.id).toBe(true);
      for (const id of lesson.ruleIds) expect(ruleIds.has(id), `${lesson.id} -> ${id}`).toBe(true);
    }
    for (const question of QUESTIONS) {
      expect(topicIds.has(question.topicId), question.id).toBe(true);
      for (const id of question.ruleIds) expect(ruleIds.has(id), `${question.id} -> ${id}`).toBe(true);
    }
  });

  it("has a valid, unique answer option for every question", () => {
    for (const question of QUESTIONS) {
      expect(question.options.length, question.id).toBeGreaterThanOrEqual(2);
      expect(question.options.length, question.id).toBeLessThanOrEqual(4);
      const optionIds = question.options.map((option) => option.id);
      const labels = question.options.map((option) => option.label);
      expect(new Set(optionIds).size, `${question.id} option ids`).toBe(optionIds.length);
      expect(new Set(labels).size, `${question.id} option labels`).toBe(labels.length);
      expect(optionIds.filter((id) => id === question.answerId), `${question.id} answer`).toHaveLength(1);
      expect(question.explanation.trim().length, question.id).toBeGreaterThan(20);
    }
  });

  it("has valid sequential candles on every chart question", () => {
    for (const question of QUESTIONS) {
      if (!question.chart) continue;
      expect(question.chart.candles.length, question.id).toBeGreaterThan(5);
      question.chart.candles.forEach((candle, position) => {
        expect(candle.index, question.id).toBe(position);
        expect(isValidCandle(candle), `${question.id} bar ${position}`).toBe(true);
      });
      expect(question.chart.caption.toLowerCase(), question.id).toContain("not historical");
    }
  });

  it("does not teach excluded concepts", () => {
    const haystack = JSON.stringify({ LESSONS, QUESTIONS, QUESTIONS_BY_TOPIC });
    expect(haystack).not.toMatch(/order block|fair value gap|\bFVG\b|kill zone/i);
  });

  it("publishes a complete assessment pool", () => {
    expect(ASSESSMENT_QUESTION_IDS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(ASSESSMENT_QUESTION_IDS).size).toBe(ASSESSMENT_QUESTION_IDS.length);
    expect(getQuestions(ASSESSMENT_QUESTION_IDS)).toHaveLength(ASSESSMENT_QUESTION_IDS.length);
    expect(ASSESSMENT_PASS_RATIO).toBeGreaterThan(0.5);
    expect(ASSESSMENT_PASS_RATIO).toBeLessThanOrEqual(1);
  });

  it("references every registered rule from public learning content", () => {
    const referenced = new Set<string>();
    for (const lesson of LESSONS) for (const id of lesson.ruleIds) referenced.add(id);
    for (const question of QUESTIONS) for (const id of question.ruleIds) referenced.add(id);
    for (const id of referenced) expect(ALL_RULES.some((rule) => rule.id === id), id).toBe(true);
    for (const rule of ALL_RULES) expect(referenced.has(rule.id), rule.id).toBe(true);
  });

  it("covers every strategy topic with at least one question", () => {
    const strategyTopics = TOPICS.filter((topic) => topic.group === "strategy");
    for (const topic of strategyTopics) {
      const count = QUESTIONS.filter((question) => question.topicId === topic.id).length;
      expect(count, topic.id).toBeGreaterThan(0);
    }
  });

  it("keeps lookup helpers consistent", () => {
    expect(getQuestion("Q-MEC-01")?.answerId).toBe("a");
    expect(getQuestion("missing")).toBeUndefined();
  });
});
