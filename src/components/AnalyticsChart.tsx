"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";

interface DataPoint {
  label: string;
  value: number;
}

interface AnalyticsChartProps {
  title: string;
  subtitle?: string;
  data: DataPoint[];
  type?: "line" | "bar";
}

export function AnalyticsChart({ title, subtitle, data, type = "line" }: AnalyticsChartProps) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  
  if (!data || data.length === 0) {
    return (
      <Card>
        <p className="text-slate-500 text-xs text-center py-10">No analytics data available.</p>
      </Card>
    );
  }

  const values = data.map((d) => d.value);
  const maxValue = Math.max(...values, 10); // Avoid divide by 0, default floor to 10
  
  // SVG Dimensions
  const width = 500;
  const height = 180;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Generate line points
  const points = data.map((d, index) => {
    const x = paddingLeft + (index / (data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - (d.value / maxValue) * chartHeight;
    return { x, y, label: d.label, value: d.value };
  });

  // SVG path definitions
  const linePath = points.reduce((path, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${path} L ${p.x} ${p.y}`;
  }, "");

  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
    : "";

  return (
    <Card className="w-full">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[#002d59]">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="relative w-full h-[180px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3ac0ff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3ac0ff" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = paddingTop + chartHeight * ratio;
            const val = Math.round(maxValue * (1 - ratio));
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="rgba(0,45,89,0.06)"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 4}
                  fill="rgba(15, 23, 42, 0.55)"
                  fontSize="9"
                  textAnchor="end"
                  className="font-mono font-medium"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {type === "line" ? (
            <>
              {/* Fill Area */}
              {areaPath && (
                <path
                  d={areaPath}
                  fill="url(#chartGradient)"
                  className="transition-all duration-500 ease-in-out"
                />
              )}

              {/* Line */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#3ac0ff"
                  strokeWidth="2.5"
                  className="transition-all duration-500 ease-in-out"
                />
              )}

              {/* Interactive Circles */}
              {points.map((p, idx) => (
                <g key={idx}>
                  {/* Invisible larger hover trigger */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="12"
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setActiveIdx(idx)}
                    onMouseLeave={() => setActiveIdx(null)}
                  />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={activeIdx === idx ? "5" : "3.5"}
                    fill={activeIdx === idx ? "#002d59" : "#3ac0ff"}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="transition-all duration-150 pointer-events-none"
                  />
                </g>
              ))}
            </>
          ) : (
            <>
              {/* Bar Chart Rendering */}
              {points.map((p, idx) => {
                const barWidth = Math.max(8, chartWidth / data.length * 0.4);
                const barHeight = chartHeight - (p.y - paddingTop);
                const xOffset = p.x - barWidth / 2;
                
                // Match the mockup: the last bar is navy blue (#002d59)
                const isLast = idx === points.length - 1;
                const barColor = isLast 
                  ? "#002d59" 
                  : (activeIdx === idx ? "#002d59" : "#3ac0ff");

                return (
                  <g key={idx}>
                    <rect
                      x={xOffset}
                      y={p.y}
                      width={barWidth}
                      height={barHeight}
                      rx="3"
                      fill={barColor}
                      opacity={activeIdx === idx ? 0.9 : 0.8}
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setActiveIdx(idx)}
                      onMouseLeave={() => setActiveIdx(null)}
                    />
                  </g>
                );
              })}
            </>
          )}

          {/* X Labels */}
          {points.map((p, idx) => {
            // Show every label or filter if too many
            const shouldShow = points.length < 10 || idx % 2 === 0;
            if (!shouldShow) return null;

            return (
              <text
                key={idx}
                x={p.x}
                y={height - 8}
                fill="rgba(15, 23, 42, 0.65)"
                fontSize="9"
                textAnchor="middle"
                className="font-medium"
              >
                {p.label}
              </text>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {activeIdx !== null && (
          <div
            className="absolute bg-[#002d59] border border-[#3ac0ff]/20 px-3 py-1.5 rounded-lg shadow-xl text-[10px] text-white backdrop-blur-md pointer-events-none z-10"
            style={{
              left: `${(points[activeIdx].x / width) * 100}%`,
              top: `${(points[activeIdx].y / height) * 100 - 25}%`,
              transform: "translateX(-50%)",
            }}
          >
            <p className="font-bold text-white">{points[activeIdx].label}</p>
            <p className="mt-0.5 text-sky-300 font-semibold">{points[activeIdx].value} Items</p>
          </div>
        )}
      </div>
    </Card>
  );
}
