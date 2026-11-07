import { expect, test, type Page } from '@playwright/test';

async function wire(page: Page, part: string, from: string, target: RegExp, to: string) {
  await page.locator(`.stage [data-part="${part}"]`).focus();
  await page.getByLabel('From pin').fill(from);
  const option = await page
    .getByLabel('To part')
    .locator('option')
    .filter({ hasText: target })
    .first()
    .getAttribute('value');
  await page.getByLabel('To part').selectOption(option!);
  await page.getByLabel('To pin').fill(to);
  await page.getByRole('button', { name: 'Add wire' }).click();
}

test('Milestone 1: Hello, Arduino', async ({ page }) => {
  // 1 to 2: open the app, with the board on the workspace.
  await page.goto('/');
  await expect(page.locator('.stage [data-part="uno-r3"]')).toBeVisible();
  await page.getByRole('button', { name: /Aca/ }).click();
  await page.getByRole('button', { name: /Blinking an LED/ }).click();
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Next' }).click();

  // 3 to 4: place an LED and a resistor from the lesson.
  await page.getByRole('button', { name: 'Place LED' }).click();
  await page.getByRole('button', { name: 'Place Resistor' }).click();

  // 10: a wrong circuit gives feedback, and the LED stays dark.
  await wire(page, 'uno-r3', 'D13', /Resistor/, 'a');
  await wire(page, 'resistor', 'b', /LED/, 'cathode');
  await wire(page, 'led-5mm', 'anode', /UNO/, 'GND_1');
  await expect(page.locator('[data-finding="led-reversed"]')).toBeVisible();
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await page.waitForTimeout(700);
  await expect(page.locator('.stage [data-part="led-5mm"]')).toHaveAttribute('data-lit', 'false');
  await page.getByRole('button', { name: 'Stop' }).click();

  // 5: fix the wiring.
  await page.getByRole('button', { name: 'Reset' }).click();
  await page.getByRole('button', { name: 'Undo' }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Undo' }).click();
  await wire(page, 'uno-r3', 'D13', /Resistor/, 'a');
  await wire(page, 'resistor', 'b', /LED/, 'anode');
  await wire(page, 'led-5mm', 'cathode', /UNO/, 'GND_1');
  await expect(page.locator('[data-finding="led-reversed"]')).toHaveCount(0);

  // 6 to 7: load the supported sketch.
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Load sketch' }).click();

  // 8 to 9: run it, and watch the LED blink.
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  const led = page.locator('.stage [data-part="led-5mm"]');
  await expect(led).toHaveAttribute('data-lit', 'true');
  await expect(led).toHaveAttribute('data-lit', 'false', { timeout: 2500 });
  await expect(led).toHaveAttribute('data-lit', 'true', { timeout: 2500 });

  // 11: the lesson verifies the real result.
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  const complete = page.getByRole('button', { name: 'Complete lesson' });
  await expect(complete).toBeEnabled({ timeout: 6000 });
  await complete.click();
  await expect(page.getByRole('button', { name: 'Lesson complete' })).toBeDisabled();
  await page.getByRole('button', { name: 'Stop' }).click();

  // 12 to 13: save, reload, and everything is still there.
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved in this browser.')).toBeVisible();
  await page.reload();
  await expect(page.locator('[data-wire]')).toHaveCount(3);
  await expect(page.locator('.stage [data-part="led-5mm"]')).toHaveCount(1);
  await page.getByRole('button', { name: /Aca/ }).click();
  await expect(page.getByRole('button', { name: /Blinking an LED/ })).toContainText('Complete');
});

test('finding links to knowledge, and selection offers Learn more', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /LED-5MM/ }).click();
  await page.getByRole('button', { name: 'Why?' }).first().click();
  await expect(page.getByRole('heading', { name: 'What it is' })).toBeVisible();
  await page.getByRole('button', { name: /Play/ }).click();
  await page.locator('.stage [data-part="led-5mm"]').focus();
  await page.getByRole('button', { name: 'Learn more' }).click();
  await expect(page.getByRole('heading', { name: 'Common mistakes' })).toBeVisible();
  await expect(page.getByText('Short leg → GND.')).toBeVisible();
});

test('the Library lists tools as reference only', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Lib/ }).click();
  await page.getByLabel('Search').fill('solder');
  await expect(page.getByRole('button', { name: /Soldering safety/ })).toContainText(
    'Reference only',
  );
});

test('a lesson from the new hardware runs: servo moves through the shim', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /SG90/ }).click();
  await wire(page, 'servo-sg90', 'signal', /UNO/, 'D9');
  await wire(page, 'servo-sg90', 'vcc', /UNO/, '5V');
  await wire(page, 'servo-sg90', 'gnd', /UNO/, 'GND_1');
  await page.getByRole('button', { name: /Aca/ }).click();
  await page.getByRole('button', { name: /Controlling motors/ }).click();
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Load sketch' }).click();
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(page.locator('[data-readout="30°"]')).toBeVisible();
  await expect(page.locator('[data-readout="150°"]')).toBeVisible({ timeout: 3000 });
  await page.getByRole('button', { name: 'Stop' }).click();
});
