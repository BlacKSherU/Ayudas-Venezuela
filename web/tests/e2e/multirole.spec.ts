import { test, expect } from "@playwright/test";

// US6 — Multi-rol por usuario. Smoke de UI (sin backend): una misma sesión navega entre varias
// secciones con un único control de sesión compartido (no hay logins separados por sección).
// La coexistencia real de datos (necesitado + voluntario) se cubre en la integración del backend.

test.describe("Multi-rol (US6)", () => {
  test("el control de sesión es único y compartido entre secciones", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Secciones" });

    // En Necesitados: un único botón global para iniciar sesión.
    await nav.getByRole("button", { name: "Necesitados" }).click();
    await expect(page.getByRole("button", { name: "Iniciar sesión" }).first()).toBeVisible();

    // En Voluntarios: el mismo control de sesión (no uno distinto por sección).
    await nav.getByRole("button", { name: "Voluntarios" }).click();
    await expect(page.getByRole("button", { name: "Iniciar sesión" }).first()).toBeVisible();
  });
});
