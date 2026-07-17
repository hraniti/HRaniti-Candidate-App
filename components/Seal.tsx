import { CheckCircle2 } from "lucide-react";

export default function Seal({
  label,
  confidence,
  stamp = false,
}: {
  label: string;
  confidence: number;
  /** Use the deeper seal-red treatment for high-stakes verification
   * (KYC, Trusted Referrer) rather than routine AI confidence. */
  stamp?: boolean;
}) {
  const low = confidence < 90;
  return (
    <span className={`seal ${stamp ? "stamp" : low ? "low" : ""}`}>
      <CheckCircle2 size={11} strokeWidth={2.5} />
      {label} · {confidence}%
    </span>
  );
}
