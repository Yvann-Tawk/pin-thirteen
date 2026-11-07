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

async function buildLed(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /R-AXIAL/ }).click();
  await page.getByRole('button', { name: /LED-5MM/ }).click();
  await wire(page, 'uno-r3', 'D13', /Resistor/, 'a');
  await wire(page, 'resistor', 'b', /LED/, 'anode');
  await wire(page, 'led-5mm', 'cathode', /UNO/, 'GND_1');
  await expect(page.locator('[data-wire]')).toHaveCount(3);
}

const led = (page: Page) => page.locator('.stage [data-part="led-5mm"]');
const setSketch = async (page: Page, text: string) => {
  await page.locator('.cm-content').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await page.locator('.cm-content').evaluate((el, t) => {
    el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true }));
    document.execCommand('insertText', false, t);
  }, text);
};

test('blinks only because of the circuit and the code', async ({ page }) => {
  await buildLed(page);
  await page.getByRole('button', { name: 'Run' }).click();
  await expect(led(page)).toHaveAttribute('data-lit', 'true');
  await expect(led(page)).toHaveAttribute('data-lit', 'false', { timeout: 2500 });
  await expect(led(page)).toHaveAttribute('data-lit', 'true', { timeout: 2500 });

  // Pull the ground wire while it runs.
  await page.locator('[data-wire] .wire-hit').last().dispatchEvent('pointerdown');
  await page.getByRole('button', { name: 'Remove wire' }).click();
  await page.waitForTimeout(2300);
  await expect(led(page)).toHaveAttribute('data-lit', 'false');
  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(page.getByRole('button', { name: 'Run' })).toBeEnabled();
});

test('a wrong circuit stays dark and says why', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /LED-5MM/ }).click();
  await expect(page.locator('[data-finding="disconnected"]')).toBeVisible();
  await page.getByRole('button', { name: 'Run' }).click();
  await page.waitForTimeout(600);
  await expect(led(page)).toHaveAttribute('data-lit', 'false');
});

test('an endless loop cannot freeze the page, and Stop works', async ({ page }) => {
  await page.goto('/');
  await setSketch(page, 'void setup() { while (1) { } } void loop() { }');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Compo' }).click();
  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(page.getByRole('button', { name: 'Run' })).toBeEnabled();
});

test('unsupported code gets a clear message with its line', async ({ page }) => {
  await page.goto('/');
  await setSketch(page, 'void setup() {\n  int *p;\n}\nvoid loop() { }');
  await page.getByRole('button', { name: 'Run' }).click();
  await expect(page.locator('.findings').getByText('Line 2')).toBeVisible();
  await expect(page.locator('.findings').getByText('Pointers need the AVR engine')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stop' })).toBeDisabled();
});

test('prints a potentiometer reading to the Serial Monitor', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /POT-10K/ }).click();
  await wire(page, 'potentiometer', 'a', /UNO/, '5V');
  await wire(page, 'potentiometer', 'b', /UNO/, 'GND_1');
  await wire(page, 'potentiometer', 'wiper', /UNO/, 'A0');
  await page.getByLabel('Example').selectOption('Read a potentiometer (A0)');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('tab', { name: 'Serial Monitor' }).click();
  await expect(page.getByTestId('serial')).toContainText('512');
});
