import type { Candle } from "./chart";
import type { QuestionOption } from "./content";
import { SEALED_ANSWERS, type PublicScenario, type SealedAnswer } from "./scenarios";

export interface ReplayQuestionView {
  prompt: string;
  options: QuestionOption[];
}

export interface ReplayResult {
  correct: boolean;
  answerId: string;
  explanation: string;
  selectedId: string;
}

/**
 * The only shape the UI is allowed to read. Before submission it never carries
 * the answer id, the explanation, or candles beyond `step`.
 */
export interface ReplaySnapshot {
  scenarioId: string;
  step: number;
  totalBars: number;
  revealedCount: number;
  canAdvance: boolean;
  questionUnlocked: boolean;
  submitted: boolean;
  question: ReplayQuestionView | null;
  result: ReplayResult | null;
  visibleCandles: Candle[];
}

export class ReplaySession {
  readonly #scenario: PublicScenario;
  readonly #answerKey: SealedAnswer;
  #step: number;
  #submitted = false;
  #result: ReplayResult | null = null;
  #selectedId: string | null = null;

  constructor(scenario: PublicScenario, answerKeys: Record<string, SealedAnswer> = SEALED_ANSWERS) {
    const key = answerKeys[scenario.id];
    if (!key) throw new Error(`Missing sealed answer key for scenario ${scenario.id}`);
    this.#scenario = scenario;
    this.#answerKey = key;
    this.#step = Math.max(1, Math.min(6, scenario.revealAt));
  }

  get step(): number {
    return this.#step;
  }

  get lastIndex(): number {
    return this.#scenario.candles.length - 1;
  }

  /** The newest bar the learner may see before submitting. */
  get maxRevealStep(): number {
    return Math.min(this.#scenario.revealAt, this.lastIndex);
  }

  get questionUnlocked(): boolean {
    return this.#step >= this.#scenario.revealAt;
  }

  get submitted(): boolean {
    return this.#submitted;
  }

  get selectedId(): string | null {
    return this.#selectedId;
  }

  /** Reveals the next candle. Never reveals beyond the task bar. */
  advance(): boolean {
    if (this.#step >= this.maxRevealStep) return false;
    this.#step += 1;
    return true;
  }

  /** Jumps to the bar where the task unlocks, without over-revealing. */
  advanceToQuestion(): void {
    this.#step = Math.max(this.#step, Math.min(this.#scenario.revealAt, this.lastIndex));
  }

  reset(): void {
    this.#step = Math.max(1, Math.min(6, this.#scenario.revealAt));
    this.#submitted = false;
    this.#result = null;
    this.#selectedId = null;
  }

  isOptionValid(optionId: string): boolean {
    return this.#scenario.task.options.some((option) => option.id === optionId);
  }

  submit(optionId: string): ReplayResult {
    if (!this.questionUnlocked) {
      throw new Error("The task is not available yet. Reveal more candles first.");
    }
    if (this.#submitted) {
      throw new Error("This scenario has already been submitted. Reset it to try again.");
    }
    if (!this.isOptionValid(optionId)) {
      throw new Error("Unknown option.");
    }

    const correct = optionId === this.#answerKey.answerId;
    this.#result = {
      correct,
      answerId: this.#answerKey.answerId,
      explanation: this.#answerKey.explanation,
      selectedId: optionId,
    };
    this.#selectedId = optionId;
    this.#submitted = true;
    return this.#result;
  }

  /** Post-submission reveal for the explanation panel (allowed by design). */
  revealAfterSubmit(): SealedAnswer | null {
    return this.#submitted ? this.#answerKey : null;
  }

  snapshot(): ReplaySnapshot {
    const visibleCandles = this.#scenario.candles.slice(0, this.#step + 1);
    const questionUnlocked = this.questionUnlocked;
    return {
      scenarioId: this.#scenario.id,
      step: this.#step,
      totalBars: this.#scenario.candles.length,
      revealedCount: visibleCandles.length,
      canAdvance: this.#step < this.maxRevealStep,
      questionUnlocked,
      submitted: this.#submitted,
      question: questionUnlocked
        ? { prompt: this.#scenario.task.prompt, options: this.#scenario.task.options }
        : null,
      result: this.#submitted ? this.#result : null,
      visibleCandles,
    };
  }
}

export function createReplaySession(
  scenario: PublicScenario,
  answerKeys: Record<string, SealedAnswer> = SEALED_ANSWERS,
): ReplaySession {
  return new ReplaySession(scenario, answerKeys);
}

/**
 * Guard used by tests and by the scenario list page: does a snapshot leak any
 * candle beyond the current step, or the answer before submission?
 */
export function findSnapshotLeak(snapshot: ReplaySnapshot): string | null {
  const leakedCandle = snapshot.visibleCandles.find((candle) => candle.index > snapshot.step);
  if (leakedCandle) return `Future candle leaked at index ${leakedCandle.index} (step ${snapshot.step}).`;
  if (!snapshot.submitted && snapshot.result !== null) return "Answer result leaked before submission.";
  return null;
}
