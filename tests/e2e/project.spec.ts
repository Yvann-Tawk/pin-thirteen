import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const leds = (page: import('@playwright/test').Page) =>
  page.locator('.stage [data-part="led-5mm"]');

test('places, undoes, saves and reopens a project', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Pin\s*Thirteen/ })).toBeVisible();
  const led = page.getByRole('button', { name: /LED-5MM/ });
  await led.click();
  await led.click();
  await expect(leds(page)).toHaveCount(2);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(leds(page)).toHaveCount(1);
  await page.getByRole('button', { name: 'Redo' }).click();
  await expect(leds(page)).toHaveCount(2);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved in this browser.')).toBeVisible();
  await page.reload();
  await expect(leds(page)).toHaveCount(2);
});

test('exports a file that imports back, and refuses a bad file', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /R-AXIAL/ }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export' }).click();
  const text = await readFile(await (await download).path(), 'utf8');
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.locator('.stage [data-part="resistor"]')).toHaveCount(0);

  const input = page.getByLabel('Import project file');
  await input.setInputFiles({
    name: 'p.json',
    mimeType: 'application/json',
    buffer: Buffer.from(text),
  });
  await expect(page.locator('.stage [data-part="resistor"]')).toHaveCount(1);
  await input.setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{'),
  });
  await expect(page.getByText('This file is not valid JSON.')).toBeVisible();
});
