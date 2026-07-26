export default function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-ink-soft">
        {label} {required && <span className="text-alert">*</span>}
      </span>
      <div className="mt-1">{children}</div>
      {hint && <span className="text-[11px] text-ink-faint block mt-1">{hint}</span>}
    </label>
  );
}
