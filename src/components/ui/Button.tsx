import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "secondary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer";

    const variantStyles = {
      // Primary: Orange background, white text, orange hover
      primary:
        "bg-[#F97316] text-white hover:bg-[#EA580C] focus:ring-[#F97316] shadow-sm border border-transparent active:bg-[#C2410C]",
      // Secondary: White background, subtle border, dark text
      secondary:
        "bg-white text-[#111827] border border-[#E5E7EB] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] focus:ring-gray-300 shadow-xs active:bg-gray-100",
      // Outline: Transparent bg with border
      outline:
        "bg-transparent text-[#111827] border border-[#E5E7EB] hover:bg-[#F8FAFC] focus:ring-gray-300",
      // Ghost: Subdued
      ghost:
        "bg-transparent text-[#64748B] hover:text-[#111827] hover:bg-[#F8FAFC] focus:ring-gray-300",
      // Danger: Red for destructive actions only
      danger:
        "bg-[#DC2626] text-white hover:bg-[#B91C1C] focus:ring-[#DC2626] shadow-xs active:bg-[#991B1B]",
    };

    const sizeStyles = {
      sm: "text-xs px-3 py-1.5 gap-1.5 h-8",
      md: "text-sm px-4 py-2 gap-2 h-9.5",
      lg: "text-base px-5 py-2.5 gap-2.5 h-11",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />}
        {!isLoading && leftIcon && <span className="shrink-0">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
