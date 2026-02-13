import { test, expect, type Page } from '@playwright/test';

const STAFF_EMAIL = 'staff@demo.com';
const STAFF_PASSWORD = 'prueba123';
const ADMIN_EMAIL = 'admin@demo.com';
const ADMIN_PASSWORD = 'prueba123';

const login = async (page: Page, email: string, password: string) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
    timeout: 15000,
  });
};

test.describe('smoke', () => {
  test('POS: venta rapida con producto smoke', async ({ page }) => {
    await login(page, STAFF_EMAIL, STAFF_PASSWORD);
    await page.goto('/pos');

    await page.getByLabel('Buscar producto').fill('Cafe Molido');
    await expect(page.getByText('Cafe Molido 500g')).toBeVisible();
    await page.getByRole('button', { name: /Cafe Molido 500g/ }).click();

    await page.getByRole('button', { name: 'Cobrar' }).click();
    await expect(page.getByText(/Venta registrada/)).toBeVisible();
  });

  test('POS: pedido especial desde clientes', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/clients');

    await page.getByLabel('Buscar').fill('Juan Perez');
    await page.getByRole('link', { name: /Juan Perez/ }).click();

    await expect(
      page.getByRole('heading', { name: 'Pedidos especiales', level: 3 }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Ir a POS' }).first().click();

    await expect(page.getByText('Pedido especial en POS')).toBeVisible();
    await page.getByRole('button', { name: 'Cobrar' }).click();
    await expect(page.getByText(/Venta registrada/)).toBeVisible();
  });
});
