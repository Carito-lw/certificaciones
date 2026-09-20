export interface CoursePreset {
  name: string;
  code: string;
  defaultHours: number;
  defaultPeriod: string;
  defaultIssueDate: string; // YYYY-MM-DD
}

export const PRESET_COURSES: CoursePreset[] = [
  {
    name: "Python con Análisis de Datos y Vibe Coding",
    code: "PYVC",
    defaultHours: 64,
    defaultPeriod: "abril – julio 2026",
    defaultIssueDate: "2026-09-18",
  },
  {
    name: "Producción y Validación de Contenidos",
    code: "PVC",
    defaultHours: 40,
    defaultPeriod: "abril – julio 2026",
    defaultIssueDate: "2026-09-18",
  },
];

export function deriveCourseCode(courseName: string, customCode?: string): string {
  if (customCode && customCode.trim()) {
    return customCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  const clean = courseName.trim();
  const match = PRESET_COURSES.find(
    (c) => c.name.toLowerCase() === clean.toLowerCase() || c.code.toLowerCase() === clean.toLowerCase(),
  );
  if (match) return match.code;

  // Si no coincide con un preset, derivar de las iniciales de palabras significativas (>2 letras)
  const words = clean
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !["con", "del", "las", "los", "para", "por", "una", "uno"].includes(w.toLowerCase()));

  if (words.length >= 2) {
    return words.map((w) => w[0].toUpperCase()).join("").slice(0, 5);
  }

  return clean.slice(0, 4).toUpperCase();
}
