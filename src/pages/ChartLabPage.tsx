import { useMemo, useState, type FormEvent } from "react";
import { generateSyntheticSeries, formatPrice, type Candle } from "../domain/chart";
import {
  DEFAULT_ENGINE_CONFIG,
  isAPlusLevel,
  runEngine,
  type EngineConfig,
  type EngineLevel,
  type IssScenario,
  type TapSource,
} from "../domain/engine";
import { emaSeries } from "../domain/ema";
import { ANNOTATION_KINDS, annotationLabel, type AnnotationKind } from "../domain/annotations";
import { useProgress } from "../state/store";
import { Badge, ButtonLink, Callout, PageHeader, Stat } from "../components/ui";
import { CandleChart, type ChartLevelBand, type ChartMark, type ChartPriceLine, type ChartSeriesLine } from "../components/CandleChart";

const DATASETS: { id: string; label: string; note: string; candles: Candle[] }[] = [
  {
    id: "choch",
    label: "Seed 31 · bearish CHOCH",
    note: "A non-dual bearish CHOCH creates SBR, DT and QML on bar 34.",
    candles: generateSyntheticSeries({ seed: 31, length: 80, start: 100, drift: 0, volatility: 0.0095 }),
  },
  {
    id: "bos",
    label: "Seed 19 · bullish BOS",
    note: "Bar 45 closes above lastCH and creates BUY TJL1/TJL2.",
    candles: generateSyntheticSeries({ seed: 19, length: 80, start: 100, drift: 0.00036, volatility: 0.0095 }),
  },
  {
    id: "iss",
    label: "Seed 34 · bearish ISS completion",
    note: "The bearish ISS tracker completes on bar 44.",
    candles: generateSyntheticSeries({ seed: 34, length: 80, start: 100, drift: 0.00054, volatility: 0.0095 }),
  },
  {
    id: "qml",
    label: "Seed 45 · QML from TJL1",
    note: "A SELL QML is created on bar 55 from the bar-5 TJL1 snapshot.",
    candles: generateSyntheticSeries({ seed: 45, length: 80, start: 100, drift: 0, volatility: 0.0095 }),
  },
];

const LEVEL_COLORS: Record<number, string> = {
  1: "#7b8cff",
  2: "#7b8cff",
  3: "#35c98a",
  4: "#f06a72",
  5: "#9fe6ff",
  6: "#9fe6ff",
  7: "#f4c95d",
  8: "#ff9f68",
  29: "#b388ff",
  30: "#b388ff",
  31: "#b388ff",
  32: "#b388ff",
  33: "#b388ff",
  34: "#b388ff",
  35: "#b388ff",
};

function kindVisible(level: EngineLevel, config: EngineConfig): boolean {
  if (!config.showLevels) return false;
  if (level.kind === 1 || level.kind === 2) return config.showTjl;
  if (level.kind === 29) return config.showIss1;
  if (level.kind === 34 || level.kind === 35) return config.showIss2;
  if (level.kind === 30 || level.kind === 32) return config.showIss3;
  if (level.kind === 31 || level.kind === 33) return config.showIss4;
  return true;
}

export function ChartLabPage() {
  const { state, addAnnotation, deleteAnnotation } = useProgress();
  const [datasetKey, setDatasetKey] = useState("choch");
  const dataset = DATASETS.find((item) => item.id === datasetKey) ?? DATASETS[0]!;
  const [reveal, setReveal] = useState(60);
  const [zoneBodyPct, setZoneBodyPct] = useState(1);
  const [tapSource, setTapSource] = useState<TapSource>("wick");
  const [stopOnTap, setStopOnTap] = useState(true);
  const [stopIssOnWickTap, setStopIssOnWickTap] = useState(true);
  const [issScenario, setIssScenario] = useState<IssScenario>("1");
  const [showIss1, setShowIss1] = useState(false);
  const [showStopped, setShowStopped] = useState(true);
  const [onlyAPlus, setOnlyAPlus] = useState(false);
  const [showEma, setShowEma] = useState(false);
  const [annotationKind, setAnnotationKind] = useState<AnnotationKind>("note");
  const [annotationText, setAnnotationText] = useState("");
  const [annotationPrice, setAnnotationPrice] = useState("");
  const [annotationBar, setAnnotationBar] = useState("");
  const [annotationError, setAnnotationError] = useState<string | null>(null);
  const [annotationNotice, setAnnotationNotice] = useState<string | null>(null);

  const safeReveal = Math.max(2, Math.min(reveal, dataset.candles.length - 1));
  const candles = dataset.candles.slice(0, safeReveal + 1);
  const lastCandle = candles[candles.length - 1]!;
  const config: EngineConfig = {
    ...DEFAULT_ENGINE_CONFIG,
    zoneBodyPct,
    tapSource,
    stopOnTap,
    stopIssOnWickTap,
    issScenario,
    showIss1,
    showLevels: true,
    showTjl: true,
    showIss2: true,
    showIss3: true,
    showIss4: true,
  };
  const engine = useMemo(() => runEngine(candles, config), [candles, config]);
  const frame = engine.frame(safeReveal);

  const visibleLevels = frame.levels
    .filter((level) => kindVisible(level, config))
    .filter((level) => (showStopped ? true : level.active && !level.deleted))
    .filter((level) => (onlyAPlus ? isAPlusLevel(level) : true));
  const activeLevels = visibleLevels.filter((level) => level.active && !level.deleted);
  const stoppedLevels = visibleLevels.filter((level) => !level.active || level.deleted);

  const bands: ChartLevelBand[] = visibleLevels.slice(-24).map((level) => ({
    top: level.top,
    bot: level.bot,
    label: level.text,
    color: LEVEL_COLORS[level.kind] ?? "#7b8cff",
    active: level.active && !level.deleted,
    fromBar: level.sourceBar,
  }));

  const lines: ChartPriceLine[] = [];
  if (frame.lastCH) lines.push({ value: frame.lastCH.price, label: `CH ${formatPrice(frame.lastCH.price)}`, color: "#35c98a" });
  if (frame.lastCL) lines.push({ value: frame.lastCL.price, label: `CL ${formatPrice(frame.lastCL.price)}`, color: "#f06a72" });

  const series: ChartSeriesLine[] = showEma
    ? [{ values: emaSeries(candles.map((candle) => candle.close), 132), label: "EMA 132", color: "#f4c95d" }]
    : [];

  const chartAnnotations = state.annotations.filter(
    (annotation) => annotation.barIndex === null || annotation.barIndex <= safeReveal,
  );
  const marks: ChartMark[] = chartAnnotations.map((annotation) => ({
    id: annotation.id,
    price: annotation.price,
    label: annotationLabel(annotation.kind),
    barIndex: annotation.barIndex,
    color: annotation.kind === "support" || annotation.kind === "swing-low" ? "#35c98a" : "#f4c95d",
  }));

  const events = frame.events.slice(-10).reverse();

  const onDatasetChange = (key: string) => {
    setDatasetKey(key);
    const next = DATASETS.find((item) => item.id === key);
    if (next) setReveal(Math.min(safeReveal, next.candles.length - 1));
  };

  const onAddAnnotation = (event: FormEvent) => {
    event.preventDefault();
    setAnnotationError(null);
    setAnnotationNotice(null);
    try {
      const price = annotationPrice.trim() === "" ? lastCandle.close : Number(annotationPrice);
      const barIndex = annotationBar.trim() === "" ? safeReveal : Number(annotationBar);
      const created = addAnnotation({
        kind: annotationKind,
        price,
        barIndex: Number.isInteger(barIndex) ? barIndex : null,
        text: annotationText,
      });
      setAnnotationText("");
      setAnnotationNotice(`Saved annotation at ${formatPrice(created.price)}.`);
    } catch (error) {
      setAnnotationError(error instanceof Error ? error.message : "Could not save the annotation.");
    }
  };

  return (
    <div className="stack">
      <PageHeader
        eyebrow="Chart lab"
        title="Inspect the engine, then change one input"
        description="A deterministic synthetic chart with the in-scope indicator logic running locally. Toggle source settings, hover a level, and add your own study notes. Nothing here is live data."
        actions={<ButtonLink to="/register">Check the rules</ButtonLink>}
      />

      <section className="stat-grid" aria-label="Engine state">
        <Stat label="Trend" value={frame.trend === 1 ? "Bullish" : frame.trend === -1 ? "Bearish" : "Flat"} hint={`Phase ${frame.phase}`} />
        <Stat
          label="Last CH / CL"
          value={`${frame.lastCH ? formatPrice(frame.lastCH.price) : "—"} / ${frame.lastCL ? formatPrice(frame.lastCL.price) : "—"}`}
          hint="Frozen snapshots, with source bars shown on the chart."
        />
        <Stat label="Active levels" value={activeLevels.length} hint={showStopped ? `${stoppedLevels.length} stopped levels also drawn.` : "Stopped levels are hidden by your setting."} />
        <Stat label="Annotations" value={state.annotations.length} hint="Your notes, stored only in this browser." />
      </section>

      <div className="lab-layout">
        <section className="card lab-chart-card">
          <div className="card-head">
            <div>
              <h2>{dataset.label}</h2>
              <p className="muted small">{dataset.note}</p>
            </div>
            <Badge tone="warn">Synthetic</Badge>
          </div>
          <CandleChart
            candles={candles}
            levels={bands}
            lines={lines}
            series={series}
            marks={marks}
            caption={`${dataset.label}. Synthetic seeded series, bars 0–${safeReveal}. Not historical market data.`}
            ariaLabel={`Synthetic chart for ${dataset.label}, through bar ${safeReveal}.`}
          />
          <div className="chart-controls">
            <label className="range-field">
              <span>
                Revealed through bar <strong>{safeReveal}</strong>
              </span>
              <input
                type="range"
                min={2}
                max={dataset.candles.length - 1}
                value={safeReveal}
                onChange={(event) => setReveal(Number(event.target.value))}
              />
            </label>
            <div className="row wrap gap-sm">
              <button type="button" className="button button-secondary button-small" onClick={() => setReveal(Math.max(2, safeReveal - 1))}>
                Back one bar
              </button>
              <button
                type="button"
                className="button button-secondary button-small"
                onClick={() => setReveal(Math.min(dataset.candles.length - 1, safeReveal + 1))}
              >
                Forward one bar
              </button>
              <button type="button" className="button button-ghost button-small" onClick={() => setReveal(dataset.candles.length - 1)}>
                Show full series
              </button>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Source settings</h2>
            <Badge tone="info">live</Badge>
          </div>
          <div className="form-stack">
            <label>
              Dataset
              <select value={datasetKey} onChange={(event) => onDatasetChange(event.target.value)}>
                {DATASETS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Zone Body %
              <span className="range-row">
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.1}
                  value={zoneBodyPct}
                  onChange={(event) => setZoneBodyPct(Number(event.target.value))}
                />
                <output>{zoneBodyPct.toFixed(1)}%</output>
              </span>
            </label>
            <label>
              Tap source
              <select value={tapSource} onChange={(event) => setTapSource(event.target.value as TapSource)}>
                <option value="wick">Wick (source default)</option>
                <option value="close">Close</option>
              </select>
            </label>
            <label>
              ISS scenario
              <select value={issScenario} onChange={(event) => setIssScenario(event.target.value as IssScenario)}>
                <option value="1">Scenario 1 (source default)</option>
                <option value="2">Scenario 2</option>
              </select>
            </label>

            <fieldset className="check-fieldset">
              <legend>Behaviour</legend>
              <label className="check">
                <input type="checkbox" checked={stopOnTap} onChange={(event) => setStopOnTap(event.target.checked)} />
                Stop levels on tap
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={stopIssOnWickTap}
                  onChange={(event) => setStopIssOnWickTap(event.target.checked)}
                />
                Stop ISS 3/4 on later wick overlap
              </label>
              <label className="check">
                <input type="checkbox" checked={showIss1} onChange={(event) => setShowIss1(event.target.checked)} />
                Show ISS1 (source default: off)
              </label>
              <label className="check">
                <input type="checkbox" checked={showStopped} onChange={(event) => setShowStopped(event.target.checked)} />
                Show stopped levels
              </label>
              <label className="check">
                <input type="checkbox" checked={onlyAPlus} onChange={(event) => setOnlyAPlus(event.target.checked)} />
                Show only A+ levels
              </label>
              <label className="check">
                <input type="checkbox" checked={showEma} onChange={(event) => setShowEma(event.target.checked)} />
                Draw EMA 132
              </label>
            </fieldset>
          </div>
        </section>
      </div>

      <div className="two-col">
        <section className="card">
          <div className="card-head">
            <h2>Active levels</h2>
            <Badge tone="info">{activeLevels.length}</Badge>
          </div>
          {activeLevels.length === 0 ? (
            <p className="muted">No visible levels match the current settings at this bar.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Level</th>
                    <th>Zone</th>
                    <th>Source</th>
                    <th>Dir</th>
                  </tr>
                </thead>
                <tbody>
                  {[...activeLevels].reverse().map((level) => (
                    <tr key={level.id}>
                      <th scope="row">{level.text}</th>
                      <td className="mono">
                        {formatPrice(level.top)} / {formatPrice(level.bot)}
                      </td>
                      <td className="mono">
                        bar {level.sourceBar}
                        <span className="muted"> (born {level.bornBar})</span>
                      </td>
                      <td>{level.dir}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Event log</h2>
            <Badge tone="info">{events.length} shown</Badge>
          </div>
          {events.length === 0 ? (
            <p className="muted">No engine events by this bar.</p>
          ) : (
            <ul className="event-list interactive">
              {events.map((event, index) => (
                <li key={`${event.bar}-${event.type}-${index}`}>
                  <button type="button" className="event-button" onClick={() => setReveal(event.bar)}>
                    <span className="mono">bar {event.bar}</span>
                    <Badge tone={event.type.includes("bear") ? "bad" : event.type.includes("bull") ? "good" : "info"}>
                      {event.type}
                    </Badge>
                    <span>{event.message}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Your annotations</h2>
          <Badge tone="info">{chartAnnotations.length}</Badge>
        </div>
        <p className="muted small">
          Annotations are local study notes drawn over the chart. They are not signals, not scored, and not tied to a
          dataset key, so a price-level note can appear on any chart where that price is in view.
        </p>
        <form className="annotation-form" onSubmit={onAddAnnotation}>
          <label>
            Kind
            <select value={annotationKind} onChange={(event) => setAnnotationKind(event.target.value as AnnotationKind)}>
              {ANNOTATION_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {annotationLabel(kind)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Price
            <input
              type="number"
              step="0.0001"
              value={annotationPrice}
              placeholder={formatPrice(lastCandle.close)}
              onChange={(event) => setAnnotationPrice(event.target.value)}
            />
          </label>
          <label>
            Bar (optional)
            <input
              type="number"
              min={0}
              max={dataset.candles.length - 1}
              value={annotationBar}
              placeholder={String(safeReveal)}
              onChange={(event) => setAnnotationBar(event.target.value)}
            />
          </label>
          <label className="annotation-text">
            Note
            <input
              type="text"
              maxLength={160}
              value={annotationText}
              onChange={(event) => setAnnotationText(event.target.value)}
              placeholder="Why this price matters"
            />
          </label>
          <button type="submit" className="button button-primary" disabled={annotationText.trim().length === 0}>
            Add note
          </button>
        </form>
        {annotationError && (
          <p className="alert alert-error" role="alert">
            {annotationError}
          </p>
        )}
        {annotationNotice && (
          <p className="notice" role="status">
            {annotationNotice}
          </p>
        )}
        {chartAnnotations.length === 0 ? (
          <p className="muted">No annotations yet. Add a note above to mark a price you want to revisit.</p>
        ) : (
          <ul className="annotation-list">
            {chartAnnotations.map((annotation) => (
              <li key={annotation.id}>
                <Badge tone={annotation.kind === "support" ? "good" : annotation.kind === "resistance" ? "bad" : "info"}>
                  {annotationLabel(annotation.kind)}
                </Badge>
                <span className="mono">{formatPrice(annotation.price)}</span>
                {annotation.barIndex !== null && <span className="muted tiny">bar {annotation.barIndex}</span>}
                <span>{annotation.text}</span>
                <button
                  type="button"
                  className="button button-ghost button-small"
                  onClick={() => deleteAnnotation(annotation.id)}
                  aria-label={`Delete annotation: ${annotation.text}`}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Callout title="What changes, and what does not" tone="info">
        Zone Body %, tap source, stop-on-tap, ISS scenario and display toggles are source inputs. Changing them changes
        the deterministic output. They do not change the source rules that scored questions use: those run with the
        documented defaults.
      </Callout>
    </div>
  );
}
