import { test, expect } from "@playwright/test";

// US1 — Login único global. Smoke de UI (sin backend): el botón único de la cabecera abre el
// login centralizado y se puede cerrar. La verificación OTP completa requiere el Worker.

test.describe("Login único (US1)", () => {
  test("la cabecera muestra un único botón de iniciar sesión", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeVisible();
  });

  test("el botón abre el login global (modal) y se puede cerrar", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Iniciar sesión" }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Verifica tu identidad" })).toBeVisible();
    // Permite elegir correo o WhatsApp desde el punto único (chips de canal).
    await expect(dialog.getByRole("button", { name: "Correo" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "WhatsApp" })).toBeVisible();
    await dialog.getByRole("button", { name: "Cerrar" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
