import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const installed = existsSync(
  join(import.meta.dirname, '../../apps/web/dist/toolchain/bundle.json'),
);

test('the AVR engine is offered only when installed', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Settings/ }).click();
  const avr = page.getByLabel(/AVR: runs real compiled code/);
  if (installed) await expect(avr).toBeEnabled();
  else await expect(avr).toBeDisabled();
});

test('compiles and runs a real sketch in the browser', async ({ page }) => {
  test.skip(!installed, 'Optional toolchain is not installed.');
  await page.goto('/');
  await page.getByRole('button', { name: /Settings/ }).click();
  await page.getByLabel(/AVR: runs real compiled code/).check();
  await page.getByRole('button', { name: /Play/ }).click();
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(page.getByText(/Compiled in \d+ ms/)).toBeVisible({ timeout: 20000 });
  const board = page.locator('.stage [data-part="uno-r3"]');
  await expect(board).toHaveAttribute('data-lit', 'true', { timeout: 4000 });
  await expect(board).toHaveAttribute('data-lit', 'false', { timeout: 4000 });
  await page.getByRole('button', { name: 'Stop' }).click();
});
