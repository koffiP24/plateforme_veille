export type PriorityLevel = "FAIBLE" | "MOYENNE" | "ELEVEE" | "CRITIQUE";

export function getPriorityLevel(score: number): PriorityLevel {
  if (score <= 25) return "FAIBLE";

  if (score <= 50) return "MOYENNE";

  if (score <= 75) return "ELEVEE";

  return "CRITIQUE";
}

export function getPriorityColor(score: number): string {
  if (score <= 25) return "#31966e";

  if (score <= 50) return "#d6a125";

  if (score <= 75) return "#e08032";

  return "#d34848";
}

export function getPriorityLabel(score: number): string {
  const labels = {
    FAIBLE: "Faible",
    MOYENNE: "Moyenne",
    ELEVEE: "Élevée",
    CRITIQUE: "Critique",
  };

  return labels[getPriorityLevel(score)];
}
