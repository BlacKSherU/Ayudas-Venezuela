import { test, expect } from "@playwright/test";

// Smoke E2E del mapa y la navegación (feature 4: 4 secciones). La verificación "en vivo ≤5 s"
// completa requiere el backend (Worker) en ejecución; aquí cubrimos el render mobile-first,
// los filtros y la degradación a lista accesible.

test.describe("Mapa — portal de ayuda", () => {
  test("carga el portal y muestra el mapa en viewport móvil", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Ayuda Venezuela" })).toBeVisible();

    // La sección Mapa es la vista por defecto: el contenedor del mapa está presente.
    await expect(page.locator("#map")).toBeVisible();

    // Filtros de tipo de insumo y urgencia disponibles.
    await expect(page.getByText("Tipo de insumo")).toBeVisible();
    await expect(page.getByText("Urgencia")).toBeVisible();

    // Indicador de estado de tiempo real (en vivo / reconectando).
    await expect(page.getByRole("status")).toBeVisible();
  });

  test("ir a Necesitados invita a iniciar sesión con el botón global", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Necesitados" }).click();
    await expect(page.getByRole("heading", { name: "Inicia sesión para continuar" })).toBeVisible();
  });

  test("la lista accesible de necesidades sirve de alternativa al mapa", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("region", { name: /Lista de necesidades|Necesidades/ }),
    ).toBeAttached();
  });
});
