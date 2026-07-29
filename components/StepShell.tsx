export default function StepShell({
  step,
  total,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  step?: number;
  total?: number;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-paper flex flex-col items-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <span className="inline-flex items-center gap-2"><img src="/brand/logo-icon.png" alt="" className="h-5 w-auto" /><span className="font-display italic text-lg text-ink">HRaniti</span></span>
          {step && total ? (
            <span className="font-mono text-xs text-ink-soft tracking-wide">
              STEP {step} / {total}
            </span>
          ) : null}
        </div>

        {step && total ? (
          <div className="h-1 w-full bg-line rounded-full mb-8 overflow-hidden">
            <div
              className="h-full bg-gold transition-all duration-500"
              style={{ width: `${(step / total) * 100}%` }}
            />
          </div>
        ) : null}

        {eyebrow ? (
          <p className="font-mono text-[11px] tracking-widest text-verified uppercase mb-3">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-3xl sm:text-4xl text-ink mb-2 leading-tight">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-ink-soft mb-8 text-[15px] leading-relaxed">{subtitle}</p>
        ) : (
          <div className="mb-6" />
        )}

        <div className="paper-card p-6 sm:p-8">{children}</div>
      </div>
    </main>
  );
}
