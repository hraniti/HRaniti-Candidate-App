import { CheckCircle2 } from "lucide-react";

export default function Seal({
  label,
  confidence,
}: {
  label: string;
  confidence: number;
}) {
  const low = confidence < 90;
  return (
    <span className={`seal ${low ? "low" : ""}`}>
      <CheckCircle2 size={12} strokeWidth={2.5} />
      {label} · {confidence}%
    </span>
  );
}
