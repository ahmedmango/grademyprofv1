// Grade classification mapping
// Distinction = A+, A, A-
// Merit = B+, B, B-
// Pass = C+, C, C-, D+, D
// Fail = F
// null = W, IP (no classification)

export type GradeClassification = "Distinction" | "Merit" | "Pass" | "Fail" | null;

const GRADE_MAP: Record<string, GradeClassification> = {
  "A+": "Distinction",
  "A": "Distinction",
  "A-": "Distinction",
  "B+": "Merit",
  "B": "Merit",
  "B-": "Merit",
  "C+": "Pass",
  "C": "Pass",
  "C-": "Pass",
  "D+": "Pass",
  "D": "Pass",
  "F": "Fail",
  "W": null,
  "IP": null,
  "Distinction": "Distinction",
  "Merit": "Merit",
  "Pass": "Pass",
  "Fail": "Fail",
};

export function getGradeClassification(grade: string | null | undefined): GradeClassification {
  if (!grade) return null;
  return GRADE_MAP[grade] ?? null;
}

export function getClassificationColor(classification: GradeClassification): string {
  switch (classification) {
    case "Distinction": return "#16A34A";
    case "Merit": return "#2563EB";
    case "Pass": return "#CA8A04";
    case "Fail": return "#DC2626";
    default: return "#6B7280";
  }
}

export function getClassificationBg(classification: GradeClassification): string {
  switch (classification) {
    case "Distinction": return "#16A34A18";
    case "Merit": return "#2563EB18";
    case "Pass": return "#CA8A0418";
    case "Fail": return "#DC262618";
    default: return "#6B728018";
  }
}
