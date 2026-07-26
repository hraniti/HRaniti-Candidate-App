export default function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? "border-verified bg-verified-soft text-verified font-medium"
          : "border-line text-ink-soft"
      }`}
    >
      {label}
    </button>
  );
}
