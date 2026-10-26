import { useEffect } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Shell } from "./components/Shell";
import { useHashRoute, type Route } from "./lib/router";
import { ProgressProvider } from "./state/store";
import { DashboardPage } from "./pages/DashboardPage";
import { AcademyPage } from "./pages/AcademyPage";
import { LessonPage } from "./pages/LessonPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ChartLabPage } from "./pages/ChartLabPage";
import { QuizIndexPage, QuizSessionPage } from "./pages/QuizPage";
import { ScenariosPage } from "./pages/ScenariosPage";
import { ScenarioReplayPage } from "./pages/ScenarioReplayPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { AssessmentPage } from "./pages/AssessmentPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ButtonLink } from "./components/ui";

const TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  academy: "Academy",
  register: "Strategy register",
  lab: "Chart lab",
  quiz: "Quiz arena",
  scenarios: "Scenarios",
  analytics: "Analytics",
  assessment: "Assessment",
  settings: "Settings",
};

function NotFoundPage() {
  return (
    <div className="stack">
      <section className="card">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p>That route is not part of the academy. Your progress is untouched.</p>
        <div className="row wrap gap-sm">
          <ButtonLink to="/dashboard" variant="primary">
            Go to dashboard
          </ButtonLink>
          <ButtonLink to="/academy">Browse lessons</ButtonLink>
        </div>
      </section>
    </div>
  );
}

function Routes({ route }: { route: Route }) {
  const [first, second] = route.parts;

  if (!first || first === "dashboard") return <DashboardPage />;
  if (first === "academy") {
    return second ? <LessonPage key={second} lessonId={second} /> : <AcademyPage />;
  }
  if (first === "register") return <RegisterPage key={route.hash} route={route} />;
  if (first === "lab") return <ChartLabPage />;
  if (first === "quiz") {
    return second ? <QuizSessionPage key={second} topicId={second} /> : <QuizIndexPage />;
  }
  if (first === "scenarios") {
    return second ? <ScenarioReplayPage key={second} scenarioId={second} /> : <ScenariosPage />;
  }
  if (first === "analytics") return <AnalyticsPage />;
  if (first === "assessment") return <AssessmentPage />;
  if (first === "settings") return <SettingsPage />;
  return <NotFoundPage />;
}

function App() {
  const route = useHashRoute();
  const section = route.parts[0] ?? "dashboard";

  useEffect(() => {
    document.title = `${TITLES[section] ?? "Not found"} · JADU TONA Trading Academy`;
    window.scrollTo(0, 0);
  }, [route.path, section]);

  return (
    <ErrorBoundary>
      <ProgressProvider>
        <Shell route={route}>
          <Routes route={route} />
        </Shell>
      </ProgressProvider>
    </ErrorBoundary>
  );
}

export default App;
