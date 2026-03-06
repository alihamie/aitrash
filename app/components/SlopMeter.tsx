"use client";

import { getSlopGradient, getSlopTier } from "@/lib/types";

interface SlopMeterProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animate?: boolean;
}

export function SlopMeter({
  score,
  size = "md",
  showLabel = true,
  animate = true,
}: SlopMeterProps) {
  const tier = getSlopTier(score);
  const gradient = getSlopGradient(score);

  const heights = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const scoreSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  };

  const isLegendary = score > 80;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className={`font-black ${scoreSizes[size]} text-white`}>
          {score}%
        </span>
        {showLabel && (
          <span className={`${textSizes[size]} font-black uppercase tracking-wide text-zinc-300`}>
            {tier}
          </span>
        )}
      </div>
      <div
        className={`w-full ${heights[size]} bg-zinc-800 rounded-full overflow-hidden`}
      >
        <div
          className={`${heights[size]} bg-gradient-to-r ${gradient} rounded-full ${animate ? "transition-all duration-1000 ease-out" : ""} ${isLegendary ? "animate-pulse" : ""}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
