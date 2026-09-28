"use client";

import EmployerShell from "@/components/employer/EmployerShell";
import JobEditor from "@/components/employer/JobEditor";

export default function NewJobPage() {
  return (
    <EmployerShell>
      <JobEditor />
    </EmployerShell>
  );
}
