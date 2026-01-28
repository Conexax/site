// Design System - Color Tokens
export const colors = {
  // Primary - Brand Green
  primary: {
    50: "#f0f4f1",
    100: "#d0dfd5",
    200: "#a8c8b4",
    300: "#7ab394",
    400: "#629e7f",
    500: "#355340", // Main brand color
    600: "#2e4a39",
    700: "#284039",
    800: "#1f3430",
    900: "#162925"
  },
  
  // Status Colors
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",
  
  // Neutral
  neutral: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827"
  },
  
  // Semantic
  semantic: {
    background: "#ffffff",
    foreground: "#111827",
    border: "#e5e7eb",
    input: "#f3f4f6",
    ring: "#355340",
    muted: "#6b7280",
    mutedForeground: "#9ca3af"
  }
};

// Button Variants
export const buttonVariants = {
  primary: "bg-[#355340] text-white hover:bg-[#355340]/90 active:bg-[#355340]/80",
  secondary: "bg-slate-200 text-slate-900 hover:bg-slate-300 active:bg-slate-400",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
  ghost: "text-slate-700 hover:bg-slate-100 active:bg-slate-200",
  outline: "border border-slate-300 text-slate-700 hover:bg-slate-50 active:bg-slate-100"
};

// Focus states (A11y)
export const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#355340] focus-visible:ring-offset-2";

// Status Badge Colors
export const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 border border-yellow-300",
  active: "bg-emerald-100 text-emerald-800 border border-emerald-300",
  completed: "bg-blue-100 text-blue-800 border border-blue-300",
  error: "bg-red-100 text-red-800 border border-red-300",
  success: "bg-green-100 text-green-800 border border-green-300",
  warning: "bg-amber-100 text-amber-800 border border-amber-300"
};