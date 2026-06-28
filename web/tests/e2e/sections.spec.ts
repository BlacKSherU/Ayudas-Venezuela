import { test, expect } from "@playwright/test";

// US2 — Cuatro secciones de navegación. Smoke de UI (sin backend): existen las 4 secciones,
// el Mapa es la vista por defecto, y las rutas previas redirigen a su nueva ubicación.

test.describe("Cuatro secciones (US2)", () => {
  test("muestra las 4 secciones con el Mapa por defecto", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Secciones" });
    for (const name of ["Mapa", "Centros de acopio", "Necesitados", "Voluntarios"]) {
      await expect(nav.getByRole("button", { name })).toBeVisible();
    }
    // Mapa por defecto: el contenedor del mapa está visible.
    await expect(page.locator("#map")).toBeVisible();
  });

  test("la sección Mapa contiene Distribución y Transparencia", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("tab", { name: "Distribución" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Transparencia" })).toBeVisible();
  });

  test("ruta previa #/donate redirige a Centros de acopio", async ({ page }) => {
    await page.goto("/#/donate");
    // La sección activa es Centros de acopio (su pestaña queda marcada).
    const centros = page
      .getByRole("navigation", { name: "Secciones" })
      .getByRole("button", { name: "Centros de acopio" });
    await expect(centros).toHaveAttribute("aria-current", "page");
  });

  test("ruta previa #/inventory redirige a Necesitados", async ({ page }) => {
    await page.goto("/#/inventory");
    const nec = page
      .getByRole("navigation", { name: "Secciones" })
      .getByRole("button", { name: "Necesitados" });
    await expect(nec).toHaveAttribute("aria-current", "page");
  });
});
