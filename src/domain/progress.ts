import { z } from "zod";
import { annotationSchema, MAX_ANNOTATIONS, type Annotation } from "./annotations";
import type { Question } from "./content";

/**
 * Local progress state. There is no account and no server, so every number in
 * this file comes from the learner's own actions on this device. XP measures
 * practice completed, never trading skill or profitability.
 */

export const PROGRESS_SCHEMA_VERSION = 1;
export const STORAGE_KEY = "jta.progress.v1";
export const CORRUPT_BACKUP_KEY = "jta.progress.corrupt.v1";

export const LIMITS = {
  attempts: 800,
  scenarioAttempts: 300,
  assessments: 50,
  xpAwarded: 1000,
  completedLessons: 100,
  annotations: MAX_ANNOTATIONS,
  importBytes: 256 * 1024,
} as const;

export const XP_VALUES = {
  question: 10,
  scenario: 25,
  lesson: 5,
  assessmentPass: 100,
} as const;

export type AttemptMode = "quiz" | "assessment";

const isoDate = z.string().datetime();

export const attemptSchema = z
  .object({
    questionId: z.string().min(1).max(80),
    topicId: z.string().min(1).max(80),
    selectedId: z.string().min(1).max(80),
    correct: z.boolean(),
    mode: z.enum(["quiz", "assessment"]),
    at: isoDate,
  })
  .strict();

export const scenarioAttemptSchema = z
  .object({
    scenarioId: z.string().min(1).max(80),
    selectedId: z.string().min(1).max(80),
    correct: z.boolean(),
    at: isoDate,
  })
  .strict();

export const assessmentRecordSchema = z
  .object({
    id: z.string().min(1).max(80),
    at: isoDate,
    correct: z.number().int().min(0),
    total: z.number().int().min(1).max(100),
    ratio: z.number().min(0).max(1),
    passed: z.boolean(),
  })
  .strict();

export const streakSchema = z
  .object({
    current: z.number().int().min(0).max(100_000),
    best: z.number().int().min(0).max(100_000),
    lastDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  })
  .strict();

export const progressSchema = z
  .object({
    schemaVersion: z.literal(PROGRESS_SCHEMA_VERSION),
    createdAt: isoDate,
    updatedAt: isoDate,
    xp: z.number().int().min(0).max(10_000_000),
    xpAwarded: z.array(z.string().min(1).max(120)).max(LIMITS.xpAwarded),
    completedLessons: z.array(z.string().min(1).max(80)).max(LIMITS.completedLessons),
    attempts: z.array(attemptSchema).max(LIMITS.attempts),
    scenarioAttempts: z.array(scenarioAttemptSchema).max(LIMITS.scenarioAttempts),
    assessments: z.array(assessmentRecordSchema).max(LIMITS.assessments),
    streak: streakSchema,
    annotations: z.array(annotationSchema).max(LIMITS.annotations),
  })
  .strict();

export type Attempt = z.infer<typeof attemptSchema>;
export type ScenarioAttempt = z.infer<typeof scenarioAttemptSchema>;
export type AssessmentRecord = z.infer<typeof assessmentRecordSchema>;
export type ProgressState = z.infer<typeof progressSchema>;

export interface Award {
  xp: number;
  reasons: string[];
}

const noAward = (): Award => ({ xp: 0, reasons: [] });

export function emptyProgress(now: Date = new Date()): ProgressState {
  const at = now.toISOString();
  return {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    createdAt: at,
    updatedAt: at,
    xp: 0,
    xpAwarded: [],
    completedLessons: [],
    attempts: [],
    scenarioAttempts: [],
    assessments: [],
    streak: { current: 0, best: 0, lastDay: null },
    annotations: [],
  };
}

export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function previousDayKey(date: Date): string {
  return dayKey(new Date(date.getTime() - 24 * 60 * 60 * 1000));
}

function touchStreak(streak: ProgressState["streak"], now: Date): ProgressState["streak"] {
  const today = dayKey(now);
  if (streak.lastDay === today) return streak;
  const current = streak.lastDay === previousDayKey(now) ? streak.current + 1 : 1;
  return { current, best: Math.max(streak.best, current), lastDay: today };
}

function award(ledger: string[], key: string, xp: number): { ledger: string[]; award: Award } {
  if (ledger.includes(key)) return { ledger, award: noAward() };
  return { ledger: [...ledger, key], award: { xp, reasons: [key] } };
}

function cap<T>(items: T[], limit: number): T[] {
  return items.length > limit ? items.slice(items.length - limit) : items;
}

export interface QuestionAttemptResult {
  state: ProgressState;
  correct: boolean;
  award: Award;
  firstCorrect: boolean;
}

export function recordQuestionAttempt(
  state: ProgressState,
  question: Pick<Question, "id" | "topicId" | "answerId" | "options">,
  selectedId: string,
  mode: AttemptMode,
  now: Date = new Date(),
): QuestionAttemptResult {
  if (!question.options.some((option) => option.id === selectedId)) {
    throw new Error("Unknown answer option.");
  }
  const correct = selectedId === question.answerId;
  let xp = state.xp;
  let ledger = state.xpAwarded;
  let resultAward = noAward();
  let firstCorrect = false;

  if (correct) {
    const key = `question:${question.id}`;
    firstCorrect = !ledger.includes(key);
    const applied = award(ledger, key, XP_VALUES.question);
    ledger = applied.ledger;
    resultAward = applied.award;
    xp += applied.award.xp;
  }

  const attempt: Attempt = {
    questionId: question.id,
    topicId: question.topicId,
    selectedId,
    correct,
    mode,
    at: now.toISOString(),
  };

  return {
    state: {
      ...state,
      xp,
      xpAwarded: ledger,
      attempts: cap([...state.attempts, attempt], LIMITS.attempts),
      streak: touchStreak(state.streak, now),
      updatedAt: now.toISOString(),
    },
    correct,
    award: resultAward,
    firstCorrect,
  };
}

export interface ScenarioAttemptResult {
  state: ProgressState;
  award: Award;
  firstCorrect: boolean;
}

export function recordScenarioAttempt(
  state: ProgressState,
  scenarioId: string,
  selectedId: string,
  correct: boolean,
  now: Date = new Date(),
): ScenarioAttemptResult {
  let xp = state.xp;
  let ledger = state.xpAwarded;
  let resultAward = noAward();
  let firstCorrect = false;
  if (correct) {
    const key = `scenario:${scenarioId}`;
    firstCorrect = !ledger.includes(key);
    const applied = award(ledger, key, XP_VALUES.scenario);
    ledger = applied.ledger;
    resultAward = applied.award;
    xp += applied.award.xp;
  }
  return {
    state: {
      ...state,
      xp,
      xpAwarded: ledger,
      scenarioAttempts: cap(
        [
          ...state.scenarioAttempts,
          { scenarioId, selectedId, correct, at: now.toISOString() },
        ],
        LIMITS.scenarioAttempts,
      ),
      streak: touchStreak(state.streak, now),
      updatedAt: now.toISOString(),
    },
    award: resultAward,
    firstCorrect,
  };
}

export interface LessonCompletionResult {
  state: ProgressState;
  award: Award;
  alreadyComplete: boolean;
}

export function completeLesson(state: ProgressState, lessonId: string, now: Date = new Date()): LessonCompletionResult {
  const alreadyComplete = state.completedLessons.includes(lessonId);
  if (alreadyComplete) {
    return { state, award: noAward(), alreadyComplete: true };
  }
  const applied = award(state.xpAwarded, `lesson:${lessonId}`, XP_VALUES.lesson);
  return {
    state: {
      ...state,
      xp: state.xp + applied.award.xp,
      xpAwarded: applied.ledger,
      completedLessons: cap([...state.completedLessons, lessonId], LIMITS.completedLessons),
      streak: touchStreak(state.streak, now),
      updatedAt: now.toISOString(),
    },
    award: applied.award,
    alreadyComplete: false,
  };
}

export interface AssessmentInput {
  question: Pick<Question, "id" | "topicId" | "answerId" | "options">;
  selectedId: string;
}

export interface AssessmentResult {
  state: ProgressState;
  correct: number;
  total: number;
  ratio: number;
  passed: boolean;
  award: Award;
}

export const ASSESSMENT_PASS_RATIO = 0.8;

export function recordAssessment(
  state: ProgressState,
  inputs: readonly AssessmentInput[],
  now: Date = new Date(),
): AssessmentResult {
  if (inputs.length === 0) throw new Error("Assessment has no answers.");
  let xp = state.xp;
  let ledger = state.xpAwarded;
  const awardedReasons: string[] = [];
  let xpAwarded = 0;
  const attempts: Attempt[] = inputs.map((input) => {
    if (!input.question.options.some((option) => option.id === input.selectedId)) {
      throw new Error("Unknown answer option.");
    }
    const correct = input.selectedId === input.question.answerId;
    if (correct) {
      const applied = award(ledger, `question:${input.question.id}`, XP_VALUES.question);
      ledger = applied.ledger;
      xp += applied.award.xp;
      xpAwarded += applied.award.xp;
      awardedReasons.push(...applied.award.reasons);
    }
    return {
      questionId: input.question.id,
      topicId: input.question.topicId,
      selectedId: input.selectedId,
      correct,
      mode: "assessment" as const,
      at: now.toISOString(),
    };
  });

  const correct = attempts.filter((attempt) => attempt.correct).length;
  const total = inputs.length;
  const ratio = correct / total;
  const passed = ratio >= ASSESSMENT_PASS_RATIO;

  if (passed) {
    const applied = award(ledger, "assessment:pass", XP_VALUES.assessmentPass);
    ledger = applied.ledger;
    xp += applied.award.xp;
    xpAwarded += applied.award.xp;
    awardedReasons.push(...applied.award.reasons);
  }

  const record: AssessmentRecord = {
    id: `asm-${now.getTime()}`,
    at: now.toISOString(),
    correct,
    total,
    ratio,
    passed,
  };

  return {
    state: {
      ...state,
      xp,
      xpAwarded: ledger,
      attempts: cap([...state.attempts, ...attempts], LIMITS.attempts),
      assessments: cap([...state.assessments, record], LIMITS.assessments),
      streak: touchStreak(state.streak, now),
      updatedAt: now.toISOString(),
    },
    correct,
    total,
    ratio,
    passed,
    award: { xp: xpAwarded, reasons: awardedReasons },
  };
}

export function addAnnotationToState(
  state: ProgressState,
  annotation: Annotation,
  now: Date = new Date(),
): ProgressState {
  if (state.annotations.length >= LIMITS.annotations) {
    throw new Error(`Annotation limit reached (${LIMITS.annotations}). Delete one before adding another.`);
  }
  if (state.annotations.some((item) => item.id === annotation.id)) {
    throw new Error("Duplicate annotation id.");
  }
  return {
    ...state,
    annotations: [...state.annotations, annotation],
    streak: touchStreak(state.streak, now),
    updatedAt: now.toISOString(),
  };
}

export function removeAnnotationFromState(state: ProgressState, id: string, now: Date = new Date()): ProgressState {
  return {
    ...state,
    annotations: state.annotations.filter((item) => item.id !== id),
    updatedAt: now.toISOString(),
  };
}

export interface LevelInfo {
  level: number;
  title: string;
  xp: number;
  currentMin: number;
  nextMin: number | null;
  progress: number;
}

const LEVELS = [
  { level: 1, title: "Curious", minXp: 0 },
  { level: 2, title: "Chart reader", minXp: 100 },
  { level: 3, title: "Structure spotter", minXp: 250 },
  { level: 4, title: "Rule tracker", minXp: 500 },
  { level: 5, title: "Source auditor", minXp: 900 },
  { level: 6, title: "Jadu Tona scholar", minXp: 1400 },
] as const;

export function levelInfo(xp: number): LevelInfo {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i += 1) {
    if (xp >= LEVELS[i]!.minXp) index = i;
  }
  const current = LEVELS[index]!;
  const next = LEVELS[index + 1] ?? null;
  const span = next ? next.minXp - current.minXp : 1;
  const progress = next ? Math.min(1, Math.max(0, (xp - current.minXp) / span)) : 1;
  return {
    level: current.level,
    title: current.title,
    xp,
    currentMin: current.minXp,
    nextMin: next ? next.minXp : null,
    progress,
  };
}

export interface TopicAccuracy {
  topicId: string;
  attempts: number;
  correct: number;
  ratio: number;
}

export function topicAccuracy(state: ProgressState): TopicAccuracy[] {
  const map = new Map<string, { attempts: number; correct: number }>();
  for (const attempt of state.attempts) {
    const row = map.get(attempt.topicId) ?? { attempts: 0, correct: 0 };
    row.attempts += 1;
    if (attempt.correct) row.correct += 1;
    map.set(attempt.topicId, row);
  }
  return [...map.entries()]
    .map(([topicId, row]) => ({ topicId, ...row, ratio: row.correct / row.attempts }))
    .sort((a, b) => a.topicId.localeCompare(b.topicId));
}

export interface ExportBundle {
  app: "jadu-tona-academy";
  bundleVersion: 1;
  exportedAt: string;
  progress: ProgressState;
}

export function exportProgress(state: ProgressState, now: Date = new Date()): string {
  const bundle: ExportBundle = {
    app: "jadu-tona-academy",
    bundleVersion: 1,
    exportedAt: now.toISOString(),
    progress: state,
  };
  return JSON.stringify(bundle, null, 2);
}

const bundleSchema = z
  .object({
    app: z.literal("jadu-tona-academy"),
    bundleVersion: z.literal(1),
    exportedAt: isoDate,
    progress: z.unknown(),
  })
  .strict();

/** Migrate an untrusted raw progress value into the current schema. */
export function migrateProgress(raw: unknown): ProgressState {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("Progress data must be a JSON object.");
  }
  const record = raw as Record<string, unknown>;
  const version = record.schemaVersion;

  if (version === PROGRESS_SCHEMA_VERSION) {
    return progressSchema.parse(raw);
  }

  if (version === undefined) {
    return migrateLegacyPreview(record);
  }

  throw new Error(`Unsupported progress schema version: ${String(version)}.`);
}

/**
 * The only pre-versioned shape this project ever produced was the early
 * preview state (xp, attempts, completedLessons, annotations, streak). It is
 * migrated explicitly; unknown fields are ignored rather than trusted.
 */
function migrateLegacyPreview(record: Record<string, unknown>): ProgressState {
  const now = new Date();
  const base = emptyProgress(now);
  const xp = typeof record.xp === "number" && Number.isFinite(record.xp) ? Math.max(0, Math.floor(record.xp)) : 0;
  const attempts = Array.isArray(record.attempts) ? record.attempts : [];
  const completedLessons = Array.isArray(record.completedLessons) ? record.completedLessons : [];
  const annotations = Array.isArray(record.annotations) ? record.annotations : [];
  const streak = record.streak && typeof record.streak === "object" ? record.streak : {};
  const migrated: ProgressState = {
    ...base,
    xp,
    attempts: attempts as ProgressState["attempts"],
    completedLessons: completedLessons as ProgressState["completedLessons"],
    annotations: annotations as ProgressState["annotations"],
    streak: {
      current: Number((streak as Record<string, unknown>).current) || 0,
      best: Number((streak as Record<string, unknown>).best) || 0,
      lastDay: typeof (streak as Record<string, unknown>).lastDay === "string" ? ((streak as Record<string, unknown>).lastDay as string) : null,
    },
  };
  // Validate the migrated shape; a corrupt legacy file is rejected.
  return progressSchema.parse(migrated);
}

export function importProgress(text: string): ProgressState {
  const byteLength = new TextEncoder().encode(text).length;
  if (byteLength > LIMITS.importBytes) {
    throw new Error(`Import is larger than ${Math.round(LIMITS.importBytes / 1024)} KB.`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Import is not valid JSON.");
  }
  const bundle = bundleSchema.safeParse(parsed);
  if (!bundle.success) {
    throw new Error("Import is not a JADU TONA Academy progress bundle.");
  }
  return migrateProgress(bundle.data.progress);
}
