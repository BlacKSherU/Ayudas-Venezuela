import { test, expect } from "@playwright/test";

// Smoke E2E del mapa y la navegación. La verificación "en vivo ≤5 s" completa requiere el
// backend (Worker) en ejecución; aquí cubrimos el render mobile-first, los filtros y la
// degradación a lista accesible. Ampliar con un backend de prueba para el flujo realtime.

test.describe("Mapa — portal de ayuda", () => {
  test("carga el portal y muestra el mapa en viewport móvil", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Ayuda Venezuela" })).toBeVisible();

    // El contenedor del mapa (pieza central) está presente.
    await expect(page.locator("#map")).toBeVisible();

    // Filtros de tipo de insumo y urgencia disponibles.
    await expect(page.getByText("Tipo de insumo")).toBeVisible();
    await expect(page.getByText("Urgencia")).toBeVisible();

    // Indicador de estado de tiempo real (en vivo / reconectando).
    await expect(page.getByRole("status")).toBeVisible();
  });

  test("navega a publicar y exige identidad ligera", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Publicar necesidad" }).click();
    await expect(page.getByRole("heading", { name: "Verifica tu identidad" })).toBeVisible();
    await expect(page.getByLabel("Correo electrónico")).toBeVisible();
  });

  test("la lista accesible de necesidades sirve de alternativa al mapa", async ({ page }) => {
    await page.goto("/");
    // La región de lista existe para lectores de pantalla / sin mapa (degradación elegante).
    await expect(page.getByRole("region", { name: /Lista de necesidades|Necesidades/ })).toBeAttached();
  });
});
