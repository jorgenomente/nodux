import { test, expect, type Page } from '@playwright/test';

const ADMIN_EMAIL = 'admin@demo.com';
const ADMIN_PASSWORD = 'prueba123';
const APP_URL = 'http://127.0.0.1:3000';
const SEEDED_INVOICE_SALE_ID = '8b196ae1-7ec0-4f45-899c-8130d0f96299';

const login = async (page: Page, email: string, password: string) => {
  await page.goto(`${APP_URL}/login`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
    timeout: 15000,
  });
};

test.describe('smoke', () => {
  test('POS: venta rapida con producto smoke', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(`${APP_URL}/pos`);

    await page.getByLabel('Buscar producto').fill('Cafe Molido');
    await expect(page.getByText('Cafe Molido 500g')).toBeVisible();
    await page.getByRole('button', { name: /Cafe Molido 500g/ }).click();

    await page.getByRole('button', { name: 'Cobrar', exact: true }).click();
    await expect(page.getByText(/Venta registrada/)).toBeVisible();
  });

  test('POS: cliente identificado y ticket compartible', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(`${APP_URL}/pos`);

    await page.getByLabel('Buscar producto').fill('Cafe Molido');
    await page.getByRole('button', { name: /Cafe Molido 500g/ }).click();

    await page.getByLabel('Buscar cliente existente').fill('Juan Perez');
    await page.getByRole('button', { name: /Juan Perez 1130001111/ }).click();

    await page.getByRole('button', { name: 'Cobrar', exact: true }).click();
    await expect(page.getByText(/Venta registrada/)).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Compartir ticket por WhatsApp' }),
    ).toBeVisible();

    const saleLink = page.getByRole('link', { name: 'Ver venta' });
    const saleHref = await saleLink.getAttribute('href');
    expect(saleHref).toBeTruthy();
    const saleId = saleHref?.split('/').filter(Boolean).pop();
    expect(saleId).toBeTruthy();

    const sharePayload = await page.evaluate(async (currentSaleId) => {
      const response = await fetch(`/api/sales/${currentSaleId}/ticket-share`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
      });

      return response.json();
    }, saleId);

    expect(sharePayload?.ok).toBeTruthy();
    expect(String(sharePayload?.ticketUrl ?? '')).toContain('/share/t/');

    await page.goto(String(sharePayload.ticketUrl));
    await expect(page.getByText('Ticket compartido')).toBeVisible();
    await expect(page.getByText(/Juan Perez/)).toBeVisible();
  });

  test('POS: pedido especial desde clientes', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(`${APP_URL}/clients`);

    await page.getByLabel('Buscar').fill('Juan Perez');
    await page.getByRole('link', { name: /Juan Perez 1130001111/ }).click();

    await expect(
      page.getByRole('heading', { name: 'Pedidos especiales', level: 3 }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Ir a POS' }).first().click();

    await expect(page.getByText('Pedido especial en POS')).toBeVisible();
    await page.getByRole('button', { name: 'Cobrar', exact: true }).click();
    await expect(page.getByText(/Venta registrada/)).toBeVisible();
  });

  test('Clientes: historial reciente y share desde detalle', async ({
    page,
  }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(`${APP_URL}/clients`);

    await page.getByLabel('Buscar').fill('Juan Perez');
    await page.getByRole('link', { name: /Juan Perez 1130001111/ }).click();

    await expect(
      page.getByRole('heading', { name: 'Compras recientes', level: 3 }),
    ).toBeVisible();
    await expect(page.getByText('Factura lista')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Ver venta' }).first(),
    ).toBeVisible();
    await expect(
      page
        .getByRole('button', { name: 'Compartir ticket por WhatsApp' })
        .first(),
    ).toBeVisible();
    await expect(
      page
        .getByRole('button', { name: 'Compartir factura por WhatsApp' })
        .first(),
    ).toBeVisible();

    const sharePayload = await page.evaluate(async (saleId) => {
      const response = await fetch(`/api/sales/${saleId}/invoice-share`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
      });

      return response.json();
    }, SEEDED_INVOICE_SALE_ID);

    expect(sharePayload?.ok).toBeTruthy();
    expect(String(sharePayload?.invoiceUrl ?? '')).toContain('/share/i/');
  });

  test('Ventas: factura compartible publica desde fixture seed', async ({
    page,
  }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    const sharePayload = await page.evaluate(async (saleId) => {
      const response = await fetch(`/api/sales/${saleId}/invoice-share`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
      });

      return response.json();
    }, SEEDED_INVOICE_SALE_ID);

    expect(sharePayload?.ok).toBeTruthy();
    expect(String(sharePayload?.invoiceUrl ?? '')).toContain('/share/i/');

    await page.goto(String(sharePayload.invoiceUrl));
    await expect(page.getByText('Factura compartida')).toBeVisible();
    await expect(page.getByText('0001-00000001')).toBeVisible();
    await expect(page.getByText(/CAE 12345678901234/)).toBeVisible();
    await expect(page.getByText(/Doc 80/)).toBeVisible();
  });

  test('Ventas: revocar y regenerar link de ticket', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    const initialSharePayload = await page.evaluate(async (saleId) => {
      const response = await fetch(`/api/sales/${saleId}/ticket-share`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
      });

      return response.json();
    }, SEEDED_INVOICE_SALE_ID);

    expect(initialSharePayload?.ok).toBeTruthy();
    const initialTicketUrl = String(initialSharePayload?.ticketUrl ?? '');
    expect(initialTicketUrl).toContain('/share/t/');

    await page.goto(`${APP_URL}/sales/${SEEDED_INVOICE_SALE_ID}`);
    const ticketCard = page.locator('article').filter({
      has: page.getByRole('heading', { name: 'Link de ticket' }),
    });
    await expect(ticketCard.getByText('Reenvíos asistidos')).toBeVisible();
    await expect(ticketCard.getByText('WhatsApp')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Historial de compartidos' }),
    ).toBeVisible();
    await expect(
      page.getByRole('cell', { name: 'Compartido' }).first(),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Revocar link de ticket' }).click();
    await expect(page.getByText('Link de ticket revocado.')).toBeVisible();

    await page.goto(initialTicketUrl);
    await expect(page.getByText('Link inválido o vencido.')).toBeVisible();

    await page.goto(`${APP_URL}/sales/${SEEDED_INVOICE_SALE_ID}`);
    await page.getByRole('button', { name: 'Generar link de ticket' }).click();
    await expect(
      page.getByRole('button', { name: 'Revocar link de ticket' }),
    ).toBeVisible();

    const regeneratedSharePayload = await page.evaluate(async (saleId) => {
      const response = await fetch(`/api/sales/${saleId}/ticket-share`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
      });

      return response.json();
    }, SEEDED_INVOICE_SALE_ID);

    expect(regeneratedSharePayload?.ok).toBeTruthy();
    const regeneratedTicketUrl = String(
      regeneratedSharePayload?.ticketUrl ?? '',
    );
    expect(regeneratedTicketUrl).toContain('/share/t/');
    expect(regeneratedTicketUrl).not.toBe(initialTicketUrl);

    await page.goto(`${APP_URL}/sales/${SEEDED_INVOICE_SALE_ID}`);
    await expect(
      page.getByRole('cell', { name: 'Regenerado' }).first(),
    ).toBeVisible();
  });
});
