import React from "react";
import { cn } from "@/lib/utils";

export interface LoadingStateProps {
  message?: string;
  rows?: number;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading data...",
  rows = 4,
  className,
}) => {
  return (
    <div className={cn("w-full p-6 space-y-4 bg-white rounded-xl border border-[#E5E7EB]", className)}>
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-[#F97316] border-t-transparent animate-spin" />
        <span className="text-xs font-medium text-[#64748B]">{message}</span>
      </div>
      <div className="space-y-2.5 pt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-8 bg-[#F8FAFC] border border-[#F1F5F9] rounded-md animate-pulse"
            style={{ width: `${100 - i * 8}%` }}
          />
        ))}
      </div>
    </div>
  );
};
