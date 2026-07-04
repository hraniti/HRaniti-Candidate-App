"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium text-sm px-5 py-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-ink-light",
  secondary:
    "bg-white text-ink border border-line hover:border-ink/40",
  ghost: "text-ink-soft hover:text-ink underline underline-offset-4",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", loading, className = "", children, ...props }, ref) => (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${className}`}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? "Working…" : children}
    </button>
  )
);
Button.displayName = "Button";

export default Button;
