import { test, expect } from '@playwright/test';

const APP_URL = 'http://127.0.0.1:3000';
const PUBLIC_DEMO_SALE_ID = '99999999-7777-7777-7777-777777777771';
const DEMO_READONLY_EMAIL = 'demo-readonly@demo.com';
const DEMO_READONLY_PASSWORD = 'prueba123';

test.describe('smoke demo readonly', () => {
  test('demo publica interactiva entra a la org publica y bloquea writes', async ({
    page,
  }) => {
    await page.goto(`${APP_URL}/demo`);
    await expect(
      page.getByRole('heading', { name: 'Recorrido publico de NODUX' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Probar demo interactiva' }),
    ).toBeVisible();

    await page.goto(`${APP_URL}/login`);
    await page.getByLabel('Email').fill(DEMO_READONLY_EMAIL);
    await page.getByLabel('Password').fill(DEMO_READONLY_PASSWORD);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
      timeout: 15000,
    });

    await expect(page.getByText('Demo Publica Org')).toBeVisible();
    await expect(page.getByText('demo-readonly@demo.com')).toBeVisible();

    await page.goto(`${APP_URL}/products`);
    await expect(
      page.locator('p', { hasText: 'Espresso Blend 250g' }).first(),
    ).toBeVisible();

    const readonlyBlockResult = await page.evaluate(async (saleId) => {
      const response = await fetch(`/api/sales/${saleId}/ticket-share`, {
        method: 'POST',
        redirect: 'manual',
      });

      return {
        status: response.status,
        type: response.type,
        redirected: response.redirected,
        url: response.url,
      };
    }, PUBLIC_DEMO_SALE_ID);

    expect(
      readonlyBlockResult.status === 307 ||
        readonlyBlockResult.type === 'opaqueredirect',
    ).toBeTruthy();

    await page.goto(`${APP_URL}/demo?readonly=1`);
    await expect(
      page.getByText(
        'Esta cuenta demo es solo lectura. Podes navegar todo, pero no guardar cambios.',
      ),
    ).toBeVisible();
  });
});
