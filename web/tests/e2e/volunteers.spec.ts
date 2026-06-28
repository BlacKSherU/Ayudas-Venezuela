import { test, expect } from "@playwright/test";

// US3 — Voluntarios con interfaz por rol. Smoke de UI (sin backend): sin sesión, la sección
// invita a iniciar sesión. La interfaz por rol y el selector multi-rol se cubren en la prueba
// de integración del backend (registrar repartidor + transportista y listarlos).

test.describe("Voluntarios (US3)", () => {
  test("sin sesión, la sección Voluntarios invita a iniciar sesión", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Secciones" }).getByRole("button", { name: "Voluntarios" }).click();
    await expect(page.getByRole("heading", { name: "Inicia sesión para continuar" })).toBeVisible();
    await expect(page.getByText("ser voluntario")).toBeVisible();
  });
});
