export type SkillWeight = "required" | "preferred" | "nice_to_have";

export default function SkillChip({ label, weight }: { label: string; weight: SkillWeight }) {
  const styles: Record<SkillWeight, string> = {
    required: "bg-ink text-white border-ink",
    preferred: "bg-white text-ink border-ink border-2",
    nice_to_have: "bg-white text-ink-soft border border-dashed border-line",
  };
  return <span className={`inline-block rounded-full px-3 py-1 text-xs ${styles[weight]}`}>{label}</span>;
}
