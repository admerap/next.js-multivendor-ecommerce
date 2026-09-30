"use client";

import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
  type ScriptableContext,
} from "chart.js";
import { useMemo, useRef } from "react";
import { Doughnut, Line } from "react-chartjs-2";
import { useAppliedTheme, useInViewOnce, useReducedMotion } from "@/lib/hooks";
import { money } from "@/lib/money";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Filler, Tooltip);

/** Reads design tokens at render time so charts follow the active theme (DESIGN_SYSTEM §5 Chart). */
function useTokens(names: string[]) {
  const applied = useAppliedTheme();
  const key = names.join("|");
  return useMemo(() => {
    if (typeof window === "undefined") return {} as Record<string, string>;
    const css = getComputedStyle(document.documentElement);
    return Object.fromEntries(key.split("|").map((n) => [n, css.getPropertyValue(n).trim()]));
    // `applied` is the trigger: tokens are remapped when data-theme changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, applied]);
}

export type LineSeries = { label: string; data: number[]; token: string; dashed?: boolean; fill?: boolean };

const BASE_TOKENS = ["--text-muted", "--border-subtle", "--neutral-900", "--neutral-700", "--iris-200", "--iris-100"];

/** Line chart: lines rise from zero on first view and whenever `labels`/data change. */
export function LineChart({
  labels,
  series,
  format,
  label,
  className,
}: {
  labels: string[];
  series: LineSeries[];
  format: "count" | "cents";
  label: string;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const seen = useInViewOnce(box);
  const reduced = useReducedMotion();
  const resolvedTheme = useAppliedTheme();
  const t = useTokens([...BASE_TOKENS, ...series.map((s) => s.token)]);
  const dark = resolvedTheme === "dark";
  const fmt = (v: number) => (format === "cents" ? money(v) : v.toLocaleString("en-US"));

  const data = {
    labels,
    datasets: series.map((s) => ({
      label: s.label,
      data: s.data,
      borderColor: t[s.token],
      pointBackgroundColor: t[s.token],
      borderWidth: 2.5,
      borderDash: s.dashed ? [5, 4] : [],
      tension: 0.38,
      pointRadius: 0,
      pointHoverRadius: 5,
      fill: !!s.fill,
      backgroundColor: s.fill
        ? (ctx: ScriptableContext<"line">) => {
            const { chart } = ctx;
            if (!chart.chartArea) return "transparent";
            const g = chart.ctx.createLinearGradient(0, chart.chartArea.top, 0, chart.chartArea.bottom);
            g.addColorStop(0, dark ? t["--iris-100"]! : t["--iris-200"]!);
            g.addColorStop(1, "transparent");
            return g;
          }
        : "transparent",
    })),
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    animation: reduced ? false : { duration: 700, easing: "easeOutCubic" },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: dark ? t["--neutral-700"] : t["--neutral-900"],
        padding: 12,
        cornerRadius: 10,
        titleFont: { family: "Manrope", weight: "bold" },
        bodyFont: { family: "Manrope" },
        callbacks: { label: (c) => ` ${c.dataset.label}: ${fmt(c.parsed.y ?? 0)}` },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: t["--text-muted"], font: { family: "Manrope", size: 12 } } },
      y: {
        beginAtZero: true,
        suggestedMax: format === "cents" ? 100_000 : 10,
        grid: { color: t["--border-subtle"] },
        border: { display: false },
        ticks: {
          color: t["--text-muted"],
          font: { family: "Manrope", size: 12 },
          precision: 0,
          callback: (v) => {
            const n = Number(v);
            if (format === "count") return n;
            const d = n / 100;
            return d >= 1000 ? `$${d / 1000}k` : `$${d}`;
          },
        },
      },
    },
  };

  // Remount on theme or data change so the entrance animation replays with fresh colours.
  const chartKey = `${resolvedTheme}|${labels.join()}|${series.map((s) => s.data.join()).join("/")}`;

  return (
    <div ref={box} className={className}>
      {seen && <Line key={chartKey} data={data} options={options} aria-label={label} />}
    </div>
  );
}

/** Doughnut that sweeps in segment by segment. */
export function DoughnutChart({
  labels,
  data,
  tokens,
  label,
  className,
}: {
  labels: string[];
  data: number[];
  tokens: string[];
  label: string;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const seen = useInViewOnce(box);
  const reduced = useReducedMotion();
  const resolvedTheme = useAppliedTheme();
  const t = useTokens([...tokens, "--surface-card", "--neutral-900", "--neutral-700", "--border-subtle"]);
  const empty = data.every((v) => v === 0);

  const options: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "72%",
    animation: reduced
      ? false
      : {
          animateRotate: true,
          animateScale: true,
          duration: 900,
          easing: "easeOutCubic",
          delay: (c) => (c.type === "data" && c.mode === "default" ? c.dataIndex * 260 : 0),
        },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: !empty,
        backgroundColor: resolvedTheme === "dark" ? t["--neutral-700"] : t["--neutral-900"],
        padding: 12,
        cornerRadius: 10,
        callbacks: { label: (c) => ` ${c.label}: ${c.parsed.toLocaleString("en-US")}` },
      },
    },
  };

  return (
    <div ref={box} className={className}>
      {seen && (
        <Doughnut
          key={`${resolvedTheme}|${data.join()}`}
          data={{
            labels,
            datasets: [
              {
                // An empty ring keeps the shape when there is no data yet.
                data: empty ? [1] : data,
                backgroundColor: empty ? [t["--border-subtle"]] : tokens.map((n) => t[n]),
                borderColor: t["--surface-card"],
                borderWidth: 3,
                hoverOffset: empty ? 0 : 6,
              },
            ],
          }}
          options={options}
          aria-label={label}
        />
      )}
    </div>
  );
}
