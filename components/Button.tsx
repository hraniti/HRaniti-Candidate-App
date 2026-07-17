"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

// Shape shifted from a generic rounded-full "SaaS pill" to a sharper,
// document-radius button — matches the card treatment and reads as more
// considered, less templated.
const base =
  "inline-flex items-center justify-center gap-2 rounded font-medium text-sm px-5 py-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-ink-light shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_2px_6px_-2px_rgba(15,20,32,0.4)]",
  secondary: "bg-white text-ink border-[1.5px] border-line hover:border-ink/50",
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
