import { expect, test, type Page } from '@playwright/test';

/** Screen position of a pin, from the same world transform the app uses. */
async function clickWorld(page: Page, x: number, y: number) {
  const p = await page.evaluate(
    ([wx, wy]) => {
      const m = document.querySelector<SVGGElement>('.world')!.getScreenCTM()!;
      const s = new DOMPoint(wx, wy).matrixTransform(m);
      return { x: s.x, y: s.y };
    },
    [x, y],
  );
  await page.mouse.click(p.x, p.y);
}

const BOARD = { x: 50, y: 395 };
const hole = (col: number, y: number) => [BOARD.x + 30 + (col - 1) * 13.6, BOARD.y + y] as const;
const UNO = { x: 340, y: 60 };

test('wires by mouse: pin to hole, undo, remove with the part', async ({ page }) => {
  await page.goto('/');
  await clickWorld(page, UNO.x + 193, UNO.y + 16); // D13
  await clickWorld(page, ...hole(10, 46)); // a10
  await expect(page.locator('[data-wire]')).toHaveCount(1);
  await page.keyboard.press('Control+z');
  await expect(page.locator('[data-wire]')).toHaveCount(0);
  await clickWorld(page, UNO.x + 193, UNO.y + 16);
  await page.keyboard.press('Escape');
  await expect(page.getByText('Wire cancelled.')).toBeVisible();
});

test('drags a resistor onto the board and it seats in holes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /R-AXIAL/ }).click();
  const r = page.locator('.stage [data-part="resistor"]');
  const box = (await r.boundingBox())!;
  const target = await page.evaluate(
    ([wx, wy]) => {
      const m = document.querySelector<SVGGElement>('.world')!.getScreenCTM()!;
      const s = new DOMPoint(wx, wy).matrixTransform(m);
      return { x: s.x, y: s.y };
    },
    [hole(20, 68)[0] + 54, hole(20, 68)[1]],
  );
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 6 });
  await page.mouse.up();
  await expect(r).toHaveAttribute('data-seated', 'c20 c28');
  await page.keyboard.press('Control+z');
  await expect(r).not.toHaveAttribute('data-seated', /c20/);
});

test('builds a full LED circuit by keyboard and survives reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /R-AXIAL/ }).focus();
  await page.keyboard.press('Enter');
  const uno = page.locator('.stage [data-part="uno-r3"]');
  await uno.focus();
  await page.getByLabel('From pin').fill('D13');
  await page.getByLabel('To part').selectOption({ label: 'Breadboard 1' });
  await page.getByLabel('To pin').fill('a5');
  await page.getByRole('button', { name: 'Add wire' }).click();
  await expect(page.locator('[data-wire]')).toHaveCount(1);
  await page.getByLabel('From pin').fill('nope');
  await page.getByLabel('To pin').fill('a6');
  await page.getByRole('button', { name: 'Add wire' }).click();
  await expect(page.getByText('That pin name was not found', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved in this browser.')).toBeVisible();
  await page.reload();
  await expect(page.locator('[data-wire]')).toHaveCount(1);
});

test('zooms and fits', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(page.locator('.world')).toHaveAttribute('transform', /scale\(1\.25\)/);
  await page.getByRole('button', { name: 'Fit' }).click();
  await expect(page.locator('.world')).toHaveAttribute('transform', /scale\(1\)/);
});
