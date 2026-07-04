export default function EmployerSignupPlaceholder() {
  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-4 text-center">
      <div className="paper-card p-8 max-w-md">
        <h1 className="font-display text-2xl text-ink mb-2">Employer sign-up is coming soon</h1>
        <p className="text-ink-soft text-sm">
          The candidate experience ships first. The employer registration flow is a separate app —
          build it next once candidates are live.
        </p>
        <a href="/signup" className="inline-block mt-5 text-sm underline underline-offset-4 text-ink">
          Back to candidate sign up
        </a>
      </div>
    </main>
  );
}
