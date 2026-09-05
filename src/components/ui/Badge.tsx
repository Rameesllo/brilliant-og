import React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "paid"
  | "completed"
  | "active"
  | "present"
  | "joined"
  | "pending"
  | "partial"
  | "warning"
  | "late"
  | "cancelled"
  | "absent"
  | "inactive"
  | "danger"
  | "orange"
  | "neutral";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "sm" | "md";
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; border: string; dot: string }> = {
  // Green success
  paid: { bg: "bg-[#F0FDF4]", text: "text-[#15803D]", border: "border-[#BBF7D0]", dot: "bg-[#16A34A]" },
  completed: { bg: "bg-[#F0FDF4]", text: "text-[#15803D]", border: "border-[#BBF7D0]", dot: "bg-[#16A34A]" },
  active: { bg: "bg-[#F0FDF4]", text: "text-[#15803D]", border: "border-[#BBF7D0]", dot: "bg-[#16A34A]" },
  present: { bg: "bg-[#F0FDF4]", text: "text-[#15803D]", border: "border-[#BBF7D0]", dot: "bg-[#16A34A]" },
  joined: { bg: "bg-[#F0FDF4]", text: "text-[#15803D]", border: "border-[#BBF7D0]", dot: "bg-[#16A34A]" },

  // Amber warning
  pending: { bg: "bg-[#FFFBEB]", text: "text-[#B45309]", border: "border-[#FDE68A]", dot: "bg-[#F59E0B]" },
  partial: { bg: "bg-[#FFFBEB]", text: "text-[#B45309]", border: "border-[#FDE68A]", dot: "bg-[#F59E0B]" },
  warning: { bg: "bg-[#FFFBEB]", text: "text-[#B45309]", border: "border-[#FDE68A]", dot: "bg-[#F59E0B]" },
  late: { bg: "bg-[#FFFBEB]", text: "text-[#B45309]", border: "border-[#FDE68A]", dot: "bg-[#F59E0B]" },

  // Red danger
  cancelled: { bg: "bg-[#FEF2F2]", text: "text-[#B91C1C]", border: "border-[#FECACA]", dot: "bg-[#DC2626]" },
  absent: { bg: "bg-[#FEF2F2]", text: "text-[#B91C1C]", border: "border-[#FECACA]", dot: "bg-[#DC2626]" },
  inactive: { bg: "bg-[#FEF2F2]", text: "text-[#B91C1C]", border: "border-[#FECACA]", dot: "bg-[#DC2626]" },
  danger: { bg: "bg-[#FEF2F2]", text: "text-[#B91C1C]", border: "border-[#FECACA]", dot: "bg-[#DC2626]" },

  // Brand orange accent badge
  orange: { bg: "bg-[#FFF7ED]", text: "text-[#C2410C]", border: "border-[#FFEDD5]", dot: "bg-[#F97316]" },

  // Neutral slate
  neutral: { bg: "bg-[#F8FAFC]", text: "text-[#475569]", border: "border-[#E2E8F0]", dot: "bg-[#94A3B8]" },
};

export const Badge: React.FC<BadgeProps> = ({
  variant = "neutral",
  size = "md",
  dot = true,
  className,
  children,
  ...props
}) => {
  const styles = variantStyles[variant] || variantStyles.neutral;
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-full border shadow-2xs whitespace-nowrap transition-colors",
        styles.bg,
        styles.text,
        styles.border,
        sizeClasses,
        className
      )}
      {...props}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", styles.dot)} />}
      {children}
    </span>
  );
};
