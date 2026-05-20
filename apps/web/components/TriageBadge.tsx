type TriageLevel = "home" | "pcp" | "urgent_care" | "er" | "emergency";

const severityStyles: Record<TriageLevel, { label: string; className: string }> =
  {
    home: {
      label: "Home care",
      className: "bg-green-50 text-green-700 border-green-200",
    },
    pcp: {
      label: "Primary care",
      className: "bg-blue-50 text-blue-700 border-blue-200",
    },
    urgent_care: {
      label: "Urgent care",
      className: "bg-amber-50 text-amber-800 border-amber-200",
    },
    er: {
      label: "ER",
      className: "bg-red-50 text-red-700 border-red-200",
    },
    emergency: {
      label: "ER",
      className: "bg-red-50 text-red-700 border-red-200",
    },
  };

export function TriageBadge({
  level,
  className = "",
}: {
  level: string | null | undefined;
  className?: string;
}) {
  const normalized = normalizeTriageLevel(level);
  const style = normalized ? severityStyles[normalized] : null;

  return (
    <span
      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${
        style?.className ?? "border-gray-200 bg-gray-50 text-gray-600"
      } ${className}`}
    >
      {style?.label ?? "Pending"}
    </span>
  );
}

export function normalizeTriageLevel(
  level: string | null | undefined,
): TriageLevel | null {
  if (level === "emergency") return "emergency";
  if (level === "er") return "er";
  if (level === "urgent_care") return "urgent_care";
  if (level === "pcp") return "pcp";
  if (level === "home") return "home";
  return null;
}
