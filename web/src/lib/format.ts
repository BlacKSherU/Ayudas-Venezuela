/** Formatea una marca temporal (epoch ms) como fecha y hora locales (es-VE). */
export function formatDateTime(ms: number): string {
  try {
    return new Date(ms).toLocaleString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(ms);
  }
}

/** Formatea solo la fecha (epoch ms). */
export function formatDate(ms: number): string {
  try {
    return new Date(ms).toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return String(ms);
  }
}
