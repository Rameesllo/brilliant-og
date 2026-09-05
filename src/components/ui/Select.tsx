import React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  isRequired?: boolean;
  options?: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      isRequired,
      options = [],
      children,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-medium text-[#374151] mb-1.5"
          >
            {label}
            {isRequired && <span className="text-[#DC2626] ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            className={cn(
              "w-full h-9.5 px-3 py-2 pr-9 text-sm bg-white rounded-lg border text-[#111827] appearance-none transition-colors focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] disabled:bg-[#F8FAFC] disabled:cursor-not-allowed cursor-pointer",
              error
                ? "border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/20"
                : "border-[#E5E7EB] hover:border-[#CBD5E1]",
              className
            )}
            {...props}
          >
            {options.length > 0
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#64748B]">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && <p className="mt-1 text-xs text-[#DC2626]">{error}</p>}
        {!error && helperText && (
          <p className="mt-1 text-xs text-[#64748B]">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
