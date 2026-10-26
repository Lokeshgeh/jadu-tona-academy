import { useMemo, useState } from "react";
import { generateSyntheticSeries, formatPrice } from "../domain/chart";
import { DEFAULT_ENGINE_CONFIG, runEngine, type EngineLevel } from "../domain/engine";
import { emaSeries, simulateDashboard, trendText } from "../domain/ema";
import { highPrintedFirst, startAnalyzer, resolveAnalyzerBar, type AnalyzerConfig } from "../domain/analyzer";
import type { TopicId } from "../domain/rules";
import { Badge, Callout } from "./ui";
import { CandleChart, type ChartLevelBand, type ChartPriceLine, type ChartSeriesLine } from "./CandleChart";

const DATASETS = {
  structure: generateSyntheticSeries({ seed: 31, length: 80, start: 100, drift: 0, volatility: 0.0095 }),
  bos: generateSyntheticSeries({ seed: 19, length: 80, start: 100, drift: 0.00036, volatility: 0.0095 }),
  qml: generateSyntheticSeries({ seed: 45, length: 80, start: 100, drift: 0, volatility: 0.0095 }),
  iss: generateSyntheticSeries({ seed: 34, length: 80, start: 100, drift: 0.00054, volatility: 0.0095 }),
};

const DEMO_BY_TOPIC: Partial<Record<TopicId, { dataset: keyof typeof DATASETS; reveal: number; caption: string }>> = {
  "swing-structure": { dataset: "structure", reveal: 34, caption: "Seed 31, bars 0–34. The bar-34 bearish shift records a CHOCH and resets phase." },
  "bos-choch": { dataset: "bos", reveal: 45, caption: "Seed 19, bars 0–45. Bar 45 closes above lastCH, confirming a bullish BOS." },
  "tjl-qml": { dataset: "qml", reveal: 55, caption: "Seed 45, bars 0–55. The SELL QML is built from the TJL1 snapshot, not the CHOCH bar." },
  "sbr-rbs-dt-db": { dataset: "structure", reveal: 34, caption: "Seed 31, bars 0–34. A bearish non-dual CHOCH creates SBR, DT and QML." },
  iss: { dataset: "iss", reveal: 44, caption: "Seed 34, bars 0–44. The bearish ISS tracker completes on bar 44." },
  levels: { dataset: "structure", reveal: 34, caption: "Seed 31, bars 0–34. Zones are derived from the source candles." },
};

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

function toBand(level: EngineLevel): ChartLevelBand {
  return {
    top: level.top,
    bot: level.bot,
    label: level.text,
    color: LEVEL_COLORS[level.kind] ?? "#7b8cff",
    active: level.active,
    fromBar: level.sourceBar,
  };
}

function EngineDemo({ dataset, reveal, caption }: { dataset: keyof typeof DATASETS; reveal: number; caption: string }) {
  const candles = DATASETS[dataset].slice(0, reveal + 1);
  const engine = useMemo(() => runEngine(candles, DEFAULT_ENGINE_CONFIG), [candles]);
  const frame = engine.frame(reveal);
  const levels = frame.levels
    .filter((level) => !level.deleted && level.kind !== 29)
    .filter((level) => level.active || level.bornBar > reveal - 8)
    .map(toBand);
  const lines: ChartPriceLine[] = [];
  if (frame.lastCH) lines.push({ value: frame.lastCH.price, label: `CH ${formatPrice(frame.lastCH.price)}`, color: "#35c98a", dashed: true });
  if (frame.lastCL) lines.push({ value: frame.lastCL.price, label: `CL ${formatPrice(frame.lastCL.price)}`, color: "#f06a72", dashed: true });
  const events = frame.events.filter((event) => event.bar === reveal);

  return (
    <div className="demo-block">
      <div className="demo-summary">
        <Badge tone={frame.trend === 1 ? "good" : frame.trend === -1 ? "bad" : "neutral"}>
          Trend {frame.trend === 1 ? "bullish" : frame.trend === -1 ? "bearish" : "flat"}
        </Badge>
        <Badge tone="info">Phase {frame.phase}</Badge>
        {frame.lastCH && <span className="mono small">CH {formatPrice(frame.lastCH.price)} @ {frame.lastCH.bar}</span>}
        {frame.lastCL && <span className="mono small">CL {formatPrice(frame.lastCL.price)} @ {frame.lastCL.bar}</span>}
      </div>
      <CandleChart
        candles={candles}
        levels={levels}
        lines={lines}
        caption={caption}
        ariaLabel={`Synthetic demonstration chart. ${caption}`}
      />
      {events.length > 0 && (
        <ul className="event-list">
          {events.map((event, index) => (
            <li key={`${event.type}-${index}`}>
              <Badge tone={event.type.includes("bear") ? "bad" : event.type.includes("bull") ? "good" : "info"}>
                {event.type}
              </Badge>{" "}
              {event.message}
            </li>
          ))}
        </ul>
      )}
      <p className="muted tiny">Synthetic seeded data. Not historical. Overlay shows only engine levels present by this bar.</p>
    </div>
  );
}

function EmaDemo() {
  const full = generateSyntheticSeries({ seed: 31, length: 200, start: 100, drift: 0, volatility: 0.0095 });
  const startBar = 120;
  const candles = full.slice(startBar);
  const fullEma = emaSeries(full.map((candle) => candle.close), 132);
  const ema = fullEma.slice(startBar);
  const series: ChartSeriesLine[] = [{ values: ema, label: "EMA 132", color: "#f4c95d" }];
  return (
    <div className="demo-block">
      <CandleChart
        candles={candles}
        series={series}
        caption={`Synthetic seed 31, bars ${startBar}–${full.length - 1}. EMA(close, 132) with the SMA seed used by Pine's ta.ema. Not historical.`}
        ariaLabel="Synthetic chart with a 132-period EMA overlay."
      />
      <p className="muted small">
        The default length is 132. The plotted EMA here uses the Pine convention: an SMA seed over the first 132 closes,
        then alpha = 2 / (132 + 1). The first visible EMA value is at bar {startBar}.
      </p>
    </div>
  );
}

function DashboardDemo() {
  const rows = useMemo(() => simulateDashboard(132), []);
  return (
    <div className="demo-block">
      <div className="table-wrap">
        <table className="data-table">
          <caption>Simulated dashboard rows — generated series, not resampled market data.</caption>
          <thead>
            <tr>
              <th scope="col">TF</th>
              <th scope="col">Close</th>
              <th scope="col">EMA 132</th>
              <th scope="col">State</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <td>{row.close === null ? "—" : formatPrice(row.close, 2)}</td>
                <td>{row.ema === null ? "—" : formatPrice(row.ema, 2)}</td>
                <td>
                  <Badge tone={row.trend === 1 ? "good" : row.trend === -1 ? "bad" : "neutral"}>{trendText(row.trend)}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        Each row compares its own timeframe close with EMA(close, 132). Equality is neutral. In the source, the current
        live row can still change until that timeframe closes, even with lookahead_off.
      </p>
    </div>
  );
}

function AnalyzerDemo() {
  const [close, setClose] = useState(1.1);
  const [low, setLow] = useState(1.098);
  const [targetPips, setTargetPips] = useState(150);
  const [lossPips, setLossPips] = useState(50);
  const [pip, setPip] = useState(0.0001);
  const config: AnalyzerConfig = { targetPips, lossPips, pipMode: "custom", customPipSize: pip };
  const safe = [close, low, pip, targetPips, lossPips].every((value) => Number.isFinite(value));
  if (!safe || pip <= 0 || targetPips <= 0 || lossPips <= 0) {
    return <Callout title="Enter positive finite values" tone="warn">The analyzer needs a positive pip size, target and loss.</Callout>;
  }
  const start = startAnalyzer(1, { index: 0, open: close, high: close, low, close }, config, pip);
  const resolutionBar = {
    index: 1,
    open: close,
    high: Math.max(close, start.targetPrice) + pip * 10,
    low: Math.min(low, start.lossPrice) - pip * 10,
    close,
  };
  const resolved = resolveAnalyzerBar(1, start.targetPrice, start.lossPrice, resolutionBar);
  const highFirst = highPrintedFirst(resolutionBar);

  return (
    <div className="demo-block analyzer-demo">
      <div className="form-grid">
        <label>
          Tap close
          <input type="number" step="0.0001" value={close} onChange={(event) => setClose(Number(event.target.value))} />
        </label>
        <label>
          Tap low
          <input type="number" step="0.0001" value={low} onChange={(event) => setLow(Number(event.target.value))} />
        </label>
        <label>
          Pip size
          <input type="number" step="0.00001" value={pip} onChange={(event) => setPip(Number(event.target.value))} />
        </label>
        <label>
          Target pips
          <input type="number" step="1" value={targetPips} onChange={(event) => setTargetPips(Number(event.target.value))} />
        </label>
        <label>
          Loss pips
          <input type="number" step="1" value={lossPips} onChange={(event) => setLossPips(Number(event.target.value))} />
        </label>
      </div>
      <dl className="result-grid">
        <div>
          <dt>Target</dt>
          <dd className="mono">{formatPrice(start.targetPrice, 5)}</dd>
        </div>
        <div>
          <dt>Loss</dt>
          <dd className="mono">{formatPrice(start.lossPrice, 5)}</dd>
        </div>
        <div>
          <dt>Example bar</dt>
          <dd className="mono">
            O {formatPrice(resolutionBar.open, 5)} H {formatPrice(resolutionBar.high, 5)} L {formatPrice(resolutionBar.low, 5)}
          </dd>
        </div>
        <div>
          <dt>Source result</dt>
          <dd>
            <Badge tone={resolved.result === 1 ? "good" : resolved.result === -1 ? "bad" : "neutral"}>
              {resolved.result === 1 ? "Win" : resolved.result === -1 ? "Loss" : "Unresolved"}
            </Badge>
          </dd>
        </div>
      </dl>
      <Callout title="Both-hit heuristic" tone="warn">
        This example bar contains both target and loss. The source compares |open − high| with |open − low| and assumes
        the nearer extreme printed first. Here it assumes the {highFirst ? "high" : "low"} printed first. That is a
        heuristic, not evidence of true intrabar order.
      </Callout>
    </div>
  );
}

export function LessonDemo({ topicId }: { topicId: TopicId }) {
  if (topicId === "ema") return <EmaDemo />;
  if (topicId === "mtf") return <DashboardDemo />;
  if (topicId === "accuracy") return <AnalyzerDemo />;
  const config = DEMO_BY_TOPIC[topicId];
  if (!config) return null;
  return <EngineDemo {...config} />;
}
