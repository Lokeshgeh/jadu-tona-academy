import { useMemo, useState } from "react";
import { ALL_RULES, TOPICS, type RuleGroup } from "../domain/rules";
import type { Route } from "../lib/router";
import { Badge, Callout, PageHeader, Stat } from "../components/ui";

type GroupFilter = "all" | RuleGroup;
type StatusFilter = "all" | "source-verified" | "definition";

export function RegisterPage({ route }: { route: Route }) {
  const focus = route.query.get("focus");
  const [group, setGroup] = useState<GroupFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [topic, setTopic] = useState("all");
  const [query, setQuery] = useState("");

  const topicMap = useMemo(() => new Map(TOPICS.map((item) => [item.id, item])), []);
  const rules = useMemo(
    () =>
      ALL_RULES.filter((rule) => {
        if (group !== "all" && rule.group !== group) return false;
        if (status !== "all" && rule.status !== status) return false;
        if (topic !== "all" && rule.topicId !== topic) return false;
        if (query.trim()) {
          const haystack = `${rule.id} ${rule.label} ${rule.summary} ${rule.rationale} ${rule.sourceRef ?? ""}`.toLowerCase();
          if (!haystack.includes(query.trim().toLowerCase())) return false;
        }
        return true;
      }),
    [group, status, topic, query],
  );
  const verified = ALL_RULES.filter((rule) => rule.status === "source-verified").length;
  const definitions = ALL_RULES.filter((rule) => rule.status === "definition").length;
  const unverified = ALL_RULES.filter((rule) => rule.status === "unverified").length;

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Traceability"
        title="Strategy register"
        description="Every scored strategy rule, its exact source anchor, and what the implementation actually does. Mechanics definitions are separated from source-verified strategy behaviour."
      />

      <section className="stat-grid" aria-label="Rule counts">
        <Stat label="Total rules" value={ALL_RULES.length} hint="Mechanics definitions plus strategy rules." />
        <Stat label="Source-verified" value={verified} hint="Pinned to script.txt line anchors and engine fixtures." />
        <Stat label="Definitions" value={definitions} hint="Chart mechanics that do not depend on the strategy source." />
        <Stat label="Unverified" value={unverified} hint={unverified === 0 ? "No unscored placeholder rules are published." : "Not used for scoring."} />
      </section>

      <Callout title="What is not in this register" tone="info">
        Only in-scope logic is listed. Modules outside this game’s scope are not modelled, taught, quizzed, or scored. The
        audit document records the boundary; the game does not turn an exclusion into content.
      </Callout>

      <section className="card">
        <div className="filter-grid" role="group" aria-label="Filter rules">
          <label>
            Search
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rule id, level, source line…"
            />
          </label>
          <label>
            Track
            <select value={group} onChange={(event) => setGroup(event.target.value as GroupFilter)}>
              <option value="all">All tracks</option>
              <option value="mechanics">Mechanics</option>
              <option value="strategy">Strategy</option>
            </select>
          </label>
          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
              <option value="all">All statuses</option>
              <option value="source-verified">Source-verified</option>
              <option value="definition">Definition</option>
            </select>
          </label>
          <label>
            Topic
            <select value={topic} onChange={(event) => setTopic(event.target.value)}>
              <option value="all">All topics</option>
              {TOPICS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="muted small" role="status">
          Showing {rules.length} of {ALL_RULES.length} rules.
        </p>

        <div className="rule-list">
          {rules.map((rule) => (
            <details key={rule.id} id={rule.id} className={focus === rule.id ? "rule-row rule-focused" : "rule-row"} open={focus === rule.id}>
              <summary>
                <span className="mono rule-id">{rule.id}</span>
                <span className="rule-label">{rule.label}</span>
                <span className="rule-meta">
                  <Badge tone={rule.status === "source-verified" ? "good" : "neutral"}>{rule.status}</Badge>
                  <Badge tone="info">{topicMap.get(rule.topicId)?.name ?? rule.topicId}</Badge>
                  <Badge tone={rule.scored ? "good" : "warn"}>{rule.scored ? "scored" : "not scored"}</Badge>
                </span>
              </summary>
              <div className="rule-detail">
                <p>{rule.summary}</p>
                <p className="muted small">{rule.rationale}</p>
                <p className="source-ref mono tiny">
                  {rule.sourceRef ?? "No source anchor (chart mechanics definition)."}
                </p>
                <p className="muted tiny">
                  Confidence: {rule.confidence}. Scored: {rule.scored ? "yes" : "no"}.
                </p>
              </div>
            </details>
          ))}
          {rules.length === 0 && <p className="empty-inline">No rules match those filters.</p>}
        </div>
      </section>
    </div>
  );
}
