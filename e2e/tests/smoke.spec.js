// @ts-check
const { test, expect } = require('@playwright/test');

function env(name, fallback = '') {
  return (process.env[name] || fallback).trim();
}

async function login(page, adminEmail, adminPassword) {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Acesse sua conta' })).toBeVisible();

  await page.getByRole('textbox', { name: 'E-mail' }).fill(adminEmail);
  await page.getByRole('textbox', { name: 'Senha' }).fill(adminPassword);
  await page.getByRole('button', { name: 'Acessar' }).click();

  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole('complementary').getByRole('heading', { name: 'TXAI Suporte' })).toBeVisible();
}

async function createCallAndVerifyHistory(page) {
  await page.getByRole('link', { name: /Chamados/ }).click();
  await expect(page).toHaveURL(/\/calls$/);
  await expect(page.getByRole('heading', { name: 'Chamados' })).toBeVisible();

  await page.getByRole('link', { name: 'Novo Chamado' }).click();
  await expect(page).toHaveURL(/\/calls\/new$/);
  await expect(page.getByRole('heading', { name: 'Novo Chamado' })).toBeVisible();

  const title = `Smoke test - ${new Date().toISOString()}`;
  await page.getByRole('textbox', { name: 'Título' }).fill(title);
  await page.getByRole('textbox', { name: 'Descrição' }).fill(
    'Criando um chamado de teste para validar fluxo de criação/listagem em produção.'
  );
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page).toHaveURL(/\/calls$/, { timeout: 30_000 });

  const searchBox = page.getByRole('searchbox', { name: 'Buscar chamados...' });
  await expect(searchBox).toBeVisible();
  await searchBox.fill(title);
  await page.getByRole('button', { name: 'search' }).click();

  const rowForCall = page.getByRole('row').filter({ hasText: title }).first();
  await expect(rowForCall).toBeVisible({ timeout: 30_000 });

  await rowForCall.getByRole('button', { name: 'eye' }).click();
  await expect(page.getByText(/Histórico do Chamado/i)).toBeVisible();
  await expect(page.getByText('Nenhuma mensagem do WhatsApp registrada para este chamado.')).toBeVisible();

  await page.getByRole('tab', { name: 'Auditoria' }).click();
  await expect(page.getByText('Nenhum histórico encontrado para este chamado.')).toBeVisible();
  await page.keyboard.press('Escape');
}

async function verifyNavigation(page) {
  await page.getByRole('link', { name: /Usuários/ }).click();
  await expect(page).toHaveURL(/\/users$/);
  await expect(page.getByRole('heading', { name: 'Usuários' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Novo Usuário' })).toBeVisible();

  await page.getByRole('link', { name: /Relatórios/ }).click();
  await expect(page).toHaveURL(/\/reports$/);
  await expect(page.getByText('Gráfico de Chamados por Status')).toBeVisible();
}

async function verifyWhatsApp(page) {
  await page.getByRole('link', { name: /WhatsApp/ }).click();
  await expect(page).toHaveURL(/\/whatsapp$/);
  await expect(page.getByRole('heading', { name: 'Conexão WhatsApp' })).toBeVisible();

  const connectedText = page.getByText(/WhatsApp está conectado/i);
  const qrImg = page.getByRole('img', { name: 'Código QR do WhatsApp' });

  await expect(connectedText.or(qrImg)).toBeVisible({ timeout: 60_000 });

  const refreshButton = page.getByRole('button', { name: /Atualizar Código QR/i });
  if (await refreshButton.count()) {
    await refreshButton.click();
    await expect(qrImg).toBeVisible({ timeout: 60_000 });
  }
}

test.describe('TXAI Support - smoke', () => {
  test('login + core navigation + create call + whatsapp QR', async ({ page }) => {
    const adminEmail = env('ADMIN_EMAIL', 'admin@txai.com');
    const adminPassword = env('ADMIN_PASSWORD', 'admin123');

    await login(page, adminEmail, adminPassword);
    await createCallAndVerifyHistory(page);
    await verifyNavigation(page);
    await verifyWhatsApp(page);
  });
});

