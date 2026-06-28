// Normalización de nombres de producto para deduplicación "normalizada exacta" (FR-004):
// minúsculas, sin acentos/diacríticos, espacios colapsados y recortados. NO tolera typos.

export function normalizeName(name: string): string {
  return name
    .normalize("NFD") // separa diacríticos
    .replace(/[̀-ͯ]/g, "") // elimina acentos
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
