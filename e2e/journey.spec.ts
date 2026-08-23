/**
 * T-11 — the M7 journey, through the real UI.
 *
 * receive -> sell -> oversell REFUSED -> correct -> return, then the ledger must reconcile.
 *
 * Assertions are business outcomes only (balances, refusals, ledger rows). No class names, no
 * markup — those churn with UIUX.md and would make this a maintenance tax instead of a safety net
 * (docs/TESTING.md §E2E scope).
 */
import { test, expect, type Page } from "@playwright/test";
import { ADMIN } from "./global-setup";

// Unique per run so the journey never collides with demo data or a previous run.
const RUN = Date.now().toString().slice(-6);
const SKU = `E2E-${RUN}`;
const CATEGORY = `E2E Category ${RUN}`;
const SUPPLIER = `E2E Supplier ${RUN}`;
const PRODUCT = `E2E Widget ${RUN}`;

const RECEIVED = 100;
const SENT = 30;
const OVERSELL = 500; // deliberately far beyond stock
const CORRECTION = -5;
const RETURNED = 10;
// 100 - 30 - 5 + 10
const EXPECTED_ON_HAND = RECEIVED - SENT + CORRECTION + RETURNED;

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Password").fill(ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

/** Select the option whose text contains `needle`.
 *  Playwright's `selectOption({label})` needs an exact string, but our option labels are built
 *  from live data ("E2E-123456 — E2E Widget (100 on hand)"), so we resolve the value first. */
async function selectContaining(scope: ReturnType<Page["getByRole"]>, field: string, needle: string) {
  const select = scope.getByLabel(field);
  const value = await select.locator("option", { hasText: needle }).first().getAttribute("value");
  if (!value) throw new Error(`No option containing "${needle}" in the ${field} select`);
  await select.selectOption(value);
}

/** The on-hand figure the Inventory table shows for our product. */
async function onHand(page: Page): Promise<number> {
  await page.goto("/inventory");
  const row = page.getByRole("row").filter({ hasText: SKU });
  await expect(row).toBeVisible();
  const cells = row.getByRole("cell");
  return Number((await cells.nth(2).innerText()).trim());
}

test.describe.serial("T-11 the M7 journey", () => {
  test("sign in", async ({ page }) => {
    await signIn(page);
    // The admin-only nav entry proves the session resolved with the right role.
    await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
  });

  test("create a category, a supplier and a product", async ({ page }) => {
    await signIn(page);

    await page.goto("/categories");
    await page.getByRole("button", { name: "Add category" }).first().click();
    await page.getByRole("dialog").getByLabel("Name").fill(CATEGORY);
    await page.getByRole("dialog").getByRole("button", { name: "Add category" }).click();
    await expect(page.getByRole("cell", { name: CATEGORY })).toBeVisible();

    await page.goto("/suppliers");
    await page.getByRole("button", { name: "Add supplier" }).first().click();
    await page.getByRole("dialog").getByLabel("Name").fill(SUPPLIER);
    await page.getByRole("dialog").getByRole("button", { name: "Add supplier" }).click();
    await expect(page.getByRole("cell", { name: SUPPLIER })).toBeVisible();

    await page.goto("/products");
    await page.getByRole("button", { name: "Add product" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Item Code").fill(SKU);
    await dialog.getByLabel("Name").fill(PRODUCT);
    await selectContaining(dialog, "Category", CATEGORY);
    await dialog.getByLabel("Unit of measure").fill("ea");
    await dialog.getByLabel("Low-Stock Level").fill("20");
    await dialog.getByRole("button", { name: "Add product" }).click();

    await expect(page.getByRole("cell", { name: SKU })).toBeVisible();
    // CAT-3: the balance is server-derived and starts at zero.
    expect(await onHand(page)).toBe(0);
  });

  test("receive stock in (PO-2 writes a real movement)", async ({ page }) => {
    await signIn(page);
    await page.goto("/purchase-orders");

    await page.getByRole("button", { name: "New Incoming Stock" }).first().click();
    let dialog = page.getByRole("dialog");
    await selectContaining(dialog, "Supplier", SUPPLIER);
    await selectContaining(dialog, "Product", SKU);
    await dialog.getByLabel("Quantity ordered").fill(String(RECEIVED));
    await dialog.getByRole("button", { name: "Create" }).click();

    const row = page.getByRole("row").filter({ hasText: SKU }).first();
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Mark Ordered" }).click();

    await row.getByRole("button", { name: "Receive Stock" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("spinbutton").first().fill(String(RECEIVED));
    await dialog.getByRole("button", { name: "Receive Stock" }).click();

    // The verb carries through to the toast (UIUX.md §8 / §12).
    await expect(page.getByText("Stock received")).toBeVisible();
    expect(await onHand(page)).toBe(RECEIVED);
  });

  test("an oversell is refused and the balance is unchanged (INV-3 / SO-3)", async ({ page }) => {
    await signIn(page);
    await page.goto("/sales-orders");

    await page.getByRole("button", { name: "New Outgoing Stock" }).first().click();
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel("Customer reference").fill(`E2E Customer ${RUN}`);
    await selectContaining(dialog, "Product", SKU);
    await dialog.getByLabel("Quantity ordered").fill(String(OVERSELL));
    await dialog.getByRole("button", { name: "Create" }).click();

    const row = page.getByRole("row").filter({ hasText: `E2E Customer ${RUN}` }).first();
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Confirm" }).click();

    // Ask for far more than exists.
    await row.getByRole("button", { name: "Send Stock" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("spinbutton").first().fill(String(OVERSELL));
    await dialog.getByRole("button", { name: "Send Stock" }).click();

    // The business reason surfaces, not a generic failure.
    await expect(page.getByText("Can't fulfill — insufficient stock.")).toBeVisible();

    // INV-3: nothing moved.
    expect(await onHand(page)).toBe(RECEIVED);
  });

  test("send part of it (SO-5 derives PARTIALLY_FULFILLED)", async ({ page }) => {
    await signIn(page);
    await page.goto("/sales-orders");

    const row = page.getByRole("row").filter({ hasText: `E2E Customer ${RUN}` }).first();
    await row.getByRole("button", { name: "Send Stock" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("spinbutton").first().fill(String(SENT));
    await dialog.getByRole("button", { name: "Send Stock" }).click();

    await expect(page.getByText("Stock sent")).toBeVisible();
    expect(await onHand(page)).toBe(RECEIVED - SENT);
  });

  test("record a correction (ADJ-1/ADJ-2)", async ({ page }) => {
    await signIn(page);
    await page.goto("/inventory");

    await page.getByRole("button", { name: "Correct Stock" }).first().click();
    const dialog = page.getByRole("dialog");
    await selectContaining(dialog, "Product", SKU);
    await dialog.getByLabel("Quantity").fill(String(CORRECTION));
    await dialog.getByLabel("Reason").fill("E2E cycle count");
    await dialog.getByRole("button", { name: "Correct Stock" }).click();

    await expect(page.getByText("Correction saved")).toBeVisible();
    expect(await onHand(page)).toBe(RECEIVED - SENT + CORRECTION);
  });

  test("record a return (RET-1)", async ({ page }) => {
    await signIn(page);
    await page.goto("/sales-orders");

    const row = page.getByRole("row").filter({ hasText: `E2E Customer ${RUN}` }).first();
    await row.getByRole("button", { name: "Record Return" }).click();
    const dialog = page.getByRole("dialog");
    await selectContaining(dialog, "Product", SKU);
    await dialog.getByLabel("Quantity").fill(String(RETURNED));
    await dialog.getByLabel("Reason").fill("E2E customer return");
    await dialog.getByRole("button", { name: "Record Return" }).click();

    await expect(page.getByText("Return recorded")).toBeVisible();
    expect(await onHand(page)).toBe(EXPECTED_ON_HAND);
  });

  test("the ledger reconciles with on-hand (INV-2, proved through the UI)", async ({ page }) => {
    await signIn(page);
    await page.goto("/inventory");

    const row = page.getByRole("row").filter({ hasText: SKU });
    await row.getByRole("link", { name: "Stock History" }).click();
    await expect(page).toHaveURL(/\/inventory\/\d+/);

    // Every movement the journey made is present, newest first.
    await expect(page.getByRole("cell", { name: "Received", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Sent", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Manual Correction" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Returned Stock" })).toBeVisible();

    // INV-2: the newest row's running balance IS the on-hand figure.
    const balanceOfNewest = page.getByRole("row").nth(1).getByRole("cell").nth(3);
    await expect(balanceOfNewest).toHaveText(String(EXPECTED_ON_HAND));

    // And the signed sum of every Change cell equals it too.
    const changes = await page.getByRole("row").locator("td:nth-child(3)").allInnerTexts();
    const sum = changes
      .map((t) => Number(t.replace("+", "").trim()))
      .filter((n) => !Number.isNaN(n))
      .reduce((a, b) => a + b, 0);
    expect(sum).toBe(EXPECTED_ON_HAND);
  });
});
