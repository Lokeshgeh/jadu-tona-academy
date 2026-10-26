import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../App";
import { LESSONS, QUESTIONS_BY_TOPIC, getQuestion } from "../domain/content";
import { SCENARIOS, SEALED_ANSWERS } from "../domain/scenarios";
import { loadProgress } from "../lib/storage";

function openRoute(hash: string): void {
  window.location.hash = hash;
  act(() => {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
}

function renderAt(hash: string) {
  window.location.hash = hash;
  return render(<App />);
}

beforeEach(() => {
  window.localStorage.clear();
  window.location.hash = "#/dashboard";
});

describe("application shell and routes", () => {
  it("renders the dashboard and navigation", () => {
    renderAt("#/dashboard");
    expect(screen.getByRole("heading", { name: /read the chart/i })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Academy" })).toHaveAttribute("href", "#/academy");
  });

  it("navigates between routes without a reload", () => {
    renderAt("#/dashboard");
    openRoute("#/academy");
    expect(screen.getByRole("heading", { name: /build the reading habit/i })).toBeInTheDocument();
    openRoute("#/register");
    expect(screen.getByRole("heading", { name: /strategy register/i })).toBeInTheDocument();
    openRoute("#/settings");
    expect(screen.getByRole("heading", { name: /your data, your browser/i })).toBeInTheDocument();
  });

  it("renders a 404 for unknown routes instead of crashing on malformed escapes", () => {
    renderAt("#/does-not-exist");
    expect(screen.getByRole("heading", { name: /page not found/i })).toBeInTheDocument();
    openRoute("#/%E0%A4%A");
    expect(screen.getByRole("heading", { name: /page not found/i })).toBeInTheDocument();
  });

  it("keeps excluded concepts out of every rendered route", () => {
    const routes = [
      "#/dashboard",
      "#/academy",
      "#/register",
      "#/lab",
      "#/quiz",
      "#/scenarios",
      "#/analytics",
      "#/assessment",
      "#/settings",
    ];
    const excluded = /order\s*blocks?|fair\s*value\s*gaps?|\bFVG\b|kill\s*zones?/i;
    renderAt("#/dashboard");
    for (const route of routes) {
      openRoute(route);
      expect(document.body.innerHTML, route).not.toMatch(excluded);
    }
    for (const lesson of LESSONS) {
      openRoute(`#/academy/${lesson.id}`);
      expect(document.body.innerHTML, lesson.id).not.toMatch(excluded);
    }
    for (const topicId of Object.keys(QUESTIONS_BY_TOPIC)) {
      openRoute(`#/quiz/${topicId}`);
      expect(document.body.innerHTML, topicId).not.toMatch(excluded);
    }
    for (const scenario of SCENARIOS) {
      openRoute(`#/scenarios/${scenario.id}`);
      expect(document.body.innerHTML, scenario.id).not.toMatch(excluded);
    }
  });

  it("renders a lesson and marks it complete once", async () => {
    renderAt("#/academy/LSN-CANDLE");
    expect(screen.getByRole("heading", { level: 1, name: /reading a candle without guessing/i })).toBeInTheDocument();
    const button = screen.getByRole("button", { name: /mark lesson complete/i });
    fireEvent.click(button);
    expect(screen.getByRole("status")).toHaveTextContent(/5 XP/);
    await waitFor(() => expect(loadProgress().state.xp).toBe(5));
    expect(screen.getByRole("button", { name: "Complete" })).toBeDisabled();
  });
});

describe("quiz flow", () => {
  it("scores a correct answer once and shows the explanation only after submission", async () => {
    const question = QUESTIONS_BY_TOPIC["chart-basics"]![0]!;
    const correct = question.options.find((option) => option.id === question.answerId)!;
    renderAt("#/quiz/chart-basics");
    expect(screen.queryByText(question.explanation)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: correct.label }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    expect(screen.getByText("Correct", { selector: ".feedback-title" })).toBeInTheDocument();
    expect(screen.getByText(question.explanation)).toBeInTheDocument();
    await waitFor(() => expect(loadProgress().state.xp).toBe(10));
    expect(screen.getByText(/\+10 XP awarded/i)).toBeInTheDocument();
  });

  it("does not award XP for a wrong answer", async () => {
    const question = getQuestion("Q-MEC-01")!;
    const wrong = question.options.find((option) => option.id !== question.answerId)!;
    renderAt("#/quiz/chart-basics");
    fireEvent.click(screen.getByRole("button", { name: wrong.label }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    expect(screen.getByText("Not this time", { selector: ".feedback-title" })).toBeInTheDocument();
    await waitFor(() => expect(loadProgress().state.xp).toBe(0));
  });
});

describe("scenario replay", () => {
  it("keeps future candles and the explanation out of the DOM until submission", async () => {
    const scenario = SCENARIOS.find((item) => item.id === "SCN-BOS-01")!;
    const sealed = SEALED_ANSWERS[scenario.id]!;
    const { container } = renderAt("#/scenarios/SCN-BOS-01");
    const titlesBefore = [...container.querySelectorAll("svg title")].map((node) => node.textContent ?? "");
    expect(titlesBefore.length).toBeGreaterThan(0);
    for (const title of titlesBefore) {
      expect(title).not.toMatch(/Bar (4[6-9]|[5-9][0-9])/);
    }
    expect(screen.queryByText(sealed.explanation)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /jump to task/i }));
    expect(screen.getAllByRole("button", { name: /bullish bos|bearish bos|bullish choch|bearish choch/i }).length).toBeGreaterThan(0);
    expect(screen.queryByText(sealed.explanation)).not.toBeInTheDocument();

    const correctLabel = scenario.task.options.find((option) => option.id === sealed.answerId)!.label;
    fireEvent.click(screen.getByRole("button", { name: correctLabel }));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
    expect(screen.getByText("Correct")).toBeInTheDocument();
    expect(screen.getByText(sealed.explanation)).toBeInTheDocument();
    await waitFor(() => expect(loadProgress().state.xp).toBe(25));
  });
});
