import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createAnnotation, type Annotation, type AnnotationInput } from "../domain/annotations";
import type { Question } from "../domain/content";
import {
  addAnnotationToState,
  completeLesson,
  emptyProgress,
  exportProgress,
  importProgress,
  recordAssessment,
  recordQuestionAttempt,
  recordScenarioAttempt,
  removeAnnotationFromState,
  type AssessmentInput,
  type AssessmentResult,
  type LessonCompletionResult,
  type ProgressState,
  type QuestionAttemptResult,
  type ScenarioAttemptResult,
} from "../domain/progress";
import { clearProgress, loadProgress, saveProgress } from "../lib/storage";

export interface StoreValue {
  state: ProgressState;
  loadWarning: string | null;
  saveWarning: string | null;
  dismissLoadWarning: () => void;
  dismissSaveWarning: () => void;
  recordQuestion: (question: Question, selectedId: string, mode?: "quiz" | "assessment") => QuestionAttemptResult;
  recordScenario: (scenarioId: string, selectedId: string, correct: boolean) => ScenarioAttemptResult;
  markLessonComplete: (lessonId: string) => LessonCompletionResult;
  submitAssessment: (inputs: readonly AssessmentInput[]) => AssessmentResult;
  addAnnotation: (input: AnnotationInput) => Annotation;
  deleteAnnotation: (id: string) => void;
  exportText: () => string;
  importText: (text: string) => void;
  resetAll: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const initial = useRef<ReturnType<typeof loadProgress> | null>(null);
  if (initial.current === null) initial.current = loadProgress();
  const [state, setState] = useState<ProgressState>(initial.current.state);
  const [loadWarning, setLoadWarning] = useState<string | null>(initial.current.error);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const result = saveProgress(state);
    setSaveWarning(result.ok ? null : `Progress could not be saved: ${result.error}`);
  }, [state]);

  const recordQuestion = useCallback(
    (question: Question, selectedId: string, mode: "quiz" | "assessment" = "quiz") => {
      const result = recordQuestionAttempt(state, question, selectedId, mode);
      setState(result.state);
      return result;
    },
    [state],
  );

  const recordScenario = useCallback(
    (scenarioId: string, selectedId: string, correct: boolean) => {
      const result = recordScenarioAttempt(state, scenarioId, selectedId, correct);
      setState(result.state);
      return result;
    },
    [state],
  );

  const markLessonComplete = useCallback(
    (lessonId: string) => {
      const result = completeLesson(state, lessonId);
      setState(result.state);
      return result;
    },
    [state],
  );

  const submitAssessment = useCallback(
    (inputs: readonly AssessmentInput[]) => {
      const result = recordAssessment(state, inputs);
      setState(result.state);
      return result;
    },
    [state],
  );

  const addAnnotation = useCallback(
    (input: AnnotationInput) => {
      const annotation = createAnnotation(input);
      setState(addAnnotationToState(state, annotation));
      return annotation;
    },
    [state],
  );

  const deleteAnnotation = useCallback(
    (id: string) => {
      setState(removeAnnotationFromState(state, id));
    },
    [state],
  );

  const exportText = useCallback(() => exportProgress(state), [state]);

  const importText = useCallback((text: string) => {
    const next = importProgress(text);
    setState(next);
  }, []);

  const resetAll = useCallback(() => {
    clearProgress();
    setState(emptyProgress());
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      state,
      loadWarning,
      saveWarning,
      dismissLoadWarning: () => setLoadWarning(null),
      dismissSaveWarning: () => setSaveWarning(null),
      recordQuestion,
      recordScenario,
      markLessonComplete,
      submitAssessment,
      addAnnotation,
      deleteAnnotation,
      exportText,
      importText,
      resetAll,
    }),
    [
      state,
      loadWarning,
      saveWarning,
      recordQuestion,
      recordScenario,
      markLessonComplete,
      submitAssessment,
      addAnnotation,
      deleteAnnotation,
      exportText,
      importText,
      resetAll,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useProgress(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useProgress must be used inside ProgressProvider");
  return value;
}
