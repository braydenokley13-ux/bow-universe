"use client";

import dynamic from "next/dynamic";

const SparkChartInner = dynamic(
  () => import("./spark-chart").then((m) => ({ default: m.SparkChart })),
  {
    ssr: false,
    loading: () => <div className="h-full animate-pulse rounded-xl bg-mist" />
  }
);

export { SparkChartInner as SparkChart };
