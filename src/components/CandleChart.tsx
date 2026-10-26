import type { Candle } from "../domain/chart";

export interface ChartLevelBand {
  top: number;
  bot: number;
  label: string;
  color?: string;
  active?: boolean;
  fromBar?: number;
}

export interface ChartPriceLine {
  value: number;
  label: string;
  color?: string;
  dashed?: boolean;
}

export interface ChartSeriesLine {
  values: (number | null)[];
  label: string;
  color: string;
}

export interface ChartMark {
  id: string;
  price: number;
  label: string;
  color?: string;
  barIndex?: number | null;
}

export interface CandleChartProps {
  candles: Candle[];
  levels?: ChartLevelBand[];
  lines?: ChartPriceLine[];
  series?: ChartSeriesLine[];
  marks?: ChartMark[];
  height?: number;
  ariaLabel: string;
  caption?: string;
  emptyMessage?: string;
}

const WIDTH = 1000;
const PAD_TOP = 18;
const PAD_BOTTOM = 30;
const PAD_LEFT = 12;
const PAD_RIGHT = 116;
const BULL = "#35c98a";
const BEAR = "#f06a72";
const GRID = "rgba(255,255,255,0.09)";
const AXIS = "#9aa7b8";

function tick(value: number): string {
  if (Math.abs(value) >= 1000) return value.toFixed(1);
  return value.toFixed(2);
}

export function CandleChart({
  candles,
  levels = [],
  lines = [],
  series = [],
  marks = [],
  height = 360,
  ariaLabel,
  caption,
  emptyMessage = "No candles to display.",
}: CandleChartProps) {
  if (candles.length === 0) {
    return (
      <div className="chart-empty" role="status">
        {emptyMessage}
      </div>
    );
  }

  const prices: number[] = [];
  for (const candle of candles) prices.push(candle.high, candle.low);
  for (const band of levels) prices.push(band.top, band.bot);
  for (const line of lines) prices.push(line.value);
  for (const item of series) for (const value of item.values) if (value !== null) prices.push(value);
  for (const mark of marks) prices.push(mark.price);

  let max = Math.max(...prices);
  let min = Math.min(...prices);
  if (!Number.isFinite(max) || !Number.isFinite(min)) {
    max = 1;
    min = 0;
  }
  if (max === min) {
    max += 0.5;
    min -= 0.5;
  }
  const padding = (max - min) * 0.06;
  max += padding;
  min -= padding;

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = height - PAD_TOP - PAD_BOTTOM;
  const barStep = plotWidth / candles.length;
  const bodyWidth = Math.max(3, Math.min(22, barStep * 0.62));
  const firstIndex = candles[0]!.index;
  const lastIndex = candles[candles.length - 1]!.index;
  const y = (price: number): number => PAD_TOP + ((max - price) / (max - min)) * plotHeight;
  const x = (index: number): number => PAD_LEFT + (index - firstIndex + 0.5) * barStep;
  const rightEdge = PAD_LEFT + plotWidth;

  const ticks = [0, 1, 2, 3, 4].map((step) => min + ((max - min) * step) / 4);

  const pathFor = (values: (number | null)[]): string => {
    const parts: string[] = [];
    values.forEach((value, index) => {
      if (value === null || index >= candles.length) return;
      parts.push(`${parts.length === 0 ? "M" : "L"} ${x(candles[index]!.index).toFixed(2)} ${y(value).toFixed(2)}`);
    });
    return parts.join(" ");
  };

  return (
    <figure className="chart-figure">
      <div className="chart-scroll">
        <svg
          className="chart-svg"
          viewBox={`0 0 ${WIDTH} ${height}`}
          role="img"
          aria-label={ariaLabel}
          preserveAspectRatio="xMidYMid meet"
        >
          <rect x={0} y={0} width={WIDTH} height={height} rx={10} fill="#0d1420" />

          {ticks.map((value) => (
            <g key={`grid-${value}`}>
              <line x1={PAD_LEFT} x2={rightEdge} y1={y(value)} y2={y(value)} stroke={GRID} strokeWidth={1} />
              <text x={rightEdge + 8} y={y(value) + 3} fill={AXIS} fontSize={11} fontFamily="ui-monospace, monospace">
                {tick(value)}
              </text>
            </g>
          ))}

          {levels.map((band, index) => {
            const top = y(Math.max(band.top, band.bot));
            const bottom = y(Math.min(band.top, band.bot));
            const bandHeight = Math.max(2, bottom - top);
            const from = band.fromBar === undefined ? PAD_LEFT : Math.max(PAD_LEFT, x(band.fromBar) - barStep / 2);
            const color = band.color ?? "#7b8cff";
            const opacity = band.active === false ? 0.16 : 0.24;
            return (
              <g key={`band-${index}-${band.label}`}>
                <rect
                  x={from}
                  y={top}
                  width={Math.max(1, rightEdge - from)}
                  height={bandHeight}
                  fill={color}
                  fillOpacity={opacity}
                  stroke={color}
                  strokeOpacity={band.active === false ? 0.35 : 0.75}
                  strokeWidth={1}
                  strokeDasharray={band.active === false ? "4 4" : undefined}
                />
                {bandHeight > 9 && (
                  <text
                    x={rightEdge + 8}
                    y={top + bandHeight / 2 + 3}
                    fill={color}
                    fontSize={10}
                    fontFamily="ui-monospace, monospace"
                  >
                    {band.label.length > 16 ? `${band.label.slice(0, 15)}…` : band.label}
                  </text>
                )}
              </g>
            );
          })}

          {candles.map((candle) => {
            const bullish = candle.close >= candle.open;
            const color = bullish ? BULL : BEAR;
            const openY = y(candle.open);
            const closeY = y(candle.close);
            const top = Math.min(openY, closeY);
            const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));
            return (
              <g key={`candle-${candle.index}`}>
                <line x1={x(candle.index)} x2={x(candle.index)} y1={y(candle.high)} y2={y(candle.low)} stroke={color} strokeWidth={1.4} />
                <rect
                  x={x(candle.index) - bodyWidth / 2}
                  y={top}
                  width={bodyWidth}
                  height={bodyHeight}
                  fill={color}
                  rx={1}
                />
                <title>
                  {`Bar ${candle.index} — O ${candle.open} H ${candle.high} L ${candle.low} C ${candle.close}`}
                </title>
              </g>
            );
          })}

          {series.map((item) => (
            <path
              key={item.label}
              d={pathFor(item.values)}
              fill="none"
              stroke={item.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {lines.map((line) => (
            <g key={`line-${line.label}-${line.value}`}>
              <line
                x1={PAD_LEFT}
                x2={rightEdge}
                y1={y(line.value)}
                y2={y(line.value)}
                stroke={line.color ?? "#f4c95d"}
                strokeWidth={1.4}
                strokeDasharray={line.dashed === false ? undefined : "7 5"}
              />
              <text x={rightEdge + 8} y={y(line.value) + 3} fill={line.color ?? "#f4c95d"} fontSize={10} fontFamily="ui-monospace, monospace">
                {line.label.slice(0, 18)}
              </text>
            </g>
          ))}

          {marks.map((mark) => (
            <g key={mark.id}>
              <line
                x1={PAD_LEFT}
                x2={rightEdge}
                y1={y(mark.price)}
                y2={y(mark.price)}
                stroke={mark.color ?? "#9fe6ff"}
                strokeWidth={1}
                strokeDasharray="2 4"
              />
              {typeof mark.barIndex === "number" && mark.barIndex >= firstIndex && mark.barIndex <= lastIndex && (
                <circle cx={x(mark.barIndex)} cy={y(mark.price)} r={3.5} fill={mark.color ?? "#9fe6ff"} />
              )}
              <text x={rightEdge + 8} y={y(mark.price) + 3} fill={mark.color ?? "#9fe6ff"} fontSize={9} fontFamily="ui-monospace, monospace">
                {mark.label.slice(0, 18)}
              </text>
            </g>
          ))}

          <line x1={PAD_LEFT} x2={rightEdge} y1={PAD_TOP + plotHeight} y2={PAD_TOP + plotHeight} stroke={GRID} />
          <text x={PAD_LEFT} y={height - 9} fill={AXIS} fontSize={10} fontFamily="ui-monospace, monospace">
            bar {firstIndex}
          </text>
          <text x={rightEdge} y={height - 9} fill={AXIS} fontSize={10} textAnchor="end" fontFamily="ui-monospace, monospace">
            bar {lastIndex}
          </text>
        </svg>
      </div>
      <figcaption className="chart-caption">
        {caption ?? "Synthetic chart. Not historical market data."}
        {series.length > 0 && (
          <span className="chart-legend">
            {series.map((item) => (
              <span key={item.label} className="chart-legend-item">
                <span className="chart-legend-swatch" style={{ background: item.color }} aria-hidden="true" />
                {item.label}
              </span>
            ))}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
