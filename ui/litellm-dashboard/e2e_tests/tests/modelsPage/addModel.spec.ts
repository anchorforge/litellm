import { test, expect } from "@playwright/test";
import { ADMIN_STORAGE_PATH } from "../../constants";
import { navigateToPage } from "../../helpers/navigation";
import { Page } from "../../fixtures/pages";

/**
 * Helper to select a provider from the Add Model form dropdown.
 */
async function selectProvider(page: any, providerName: string) {
  const providerDropdown = page.getByRole("combobox", { name: /Provider/i });
  await providerDropdown.fill(providerName);
  await page.waitForTimeout(1000);
  await providerDropdown.press("Enter");
  await page.waitForTimeout(2000);
}

test.describe("Add Model", () => {
  test.use({ storageState: ADMIN_STORAGE_PATH });

  test("Able to see all models for a specific provider in the model dropdown", async ({ page }) => {
    await navigateToPage(page, Page.Models);
    await page.getByRole("tab", { name: "Add Model" }).click();

    await selectProvider(page, "Anthropic");

    // The model field should be a multi-select dropdown; click to open it
    const modelDropdown = page.locator(".ant-select-selection-overflow").first();
    await modelDropdown.click();

    // Verify provider-specific models are listed
    await expect(page.getByTitle("claude-haiku-4-5", { exact: true })).toBeVisible();
  });

  test("Test connection with bad credentials shows failure", async ({ page }) => {
    await navigateToPage(page, Page.Models);
    await page.getByRole("tab", { name: "Add Model" }).click();

    await selectProvider(page, "Anthropic");

    // Select model: claude-haiku-4-5
    const modelDropdown = page.locator(".ant-select-selection-overflow").first();
    await modelDropdown.click();
    await page.getByTitle("claude-haiku-4-5", { exact: true }).click();
    await page.keyboard.press("Escape");

    // Enter bad API key
    const apiKeyInput = page.locator('input[type="password"]').first();
    await apiKeyInput.fill("sk-bad-key-12345");

    // Click Test Connect button by its text
    await page.getByRole("button", { name: "Test Connect" }).click();

    // Wait for modal to appear and connection test to complete
    await expect(page.getByText("Connection Test Results")).toBeVisible({ timeout: 10_000 });

    // Verify failure message appears (the test makes a real API call, so it will fail with bad creds)
    await expect(page.getByText(/Connection to .* failed/)).toBeVisible({ timeout: 30_000 });
  });

  test("Add specific model and verify it appears in All Models", async ({ page }) => {
    await navigateToPage(page, Page.Models);
    await page.getByRole("tab", { name: "Add Model" }).click();

    await selectProvider(page, "Anthropic");

    // Select model: claude-haiku-4-5
    const modelDropdown = page.locator(".ant-select-selection-overflow").first();
    await modelDropdown.click();
    await page.getByTitle("claude-haiku-4-5", { exact: true }).click();
    await page.keyboard.press("Escape");

    // Enter any API key
    const apiKeyInput = page.locator('input[type="password"]').first();
    await apiKeyInput.fill("sk-any-key-for-add-test");

    // Click Add Model button by its text
    await page.getByRole("button", { name: "Add Model" }).last().click();

    // Wait for success notification
    await expect(page.getByText("created successfully")).toBeVisible({ timeout: 15_000 });

    // Navigate to All Models tab
    await page.getByRole("tab", { name: "All Models" }).click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Search for the model we just added
    await page.locator('input[placeholder="Search model names..."]').fill("claude-haiku-4-5");
    await page.waitForTimeout(1000);

    // Verify the model appears in the results count (not "Showing 0 results")
    await expect(page.getByText(/Showing \d+ - \d+ of \d+ results/)).toBeVisible({ timeout: 15_000 });

    // Verify the model name appears in the table body
    const tableBody = page.locator("table tbody");
    await expect(tableBody.getByText("claude-haiku-4-5").first()).toBeVisible({ timeout: 15_000 });
  });

  test("Add wildcard route and verify it appears in All Models", async ({ page }) => {
    await navigateToPage(page, Page.Models);
    await page.getByRole("tab", { name: "Add Model" }).click();

    await selectProvider(page, "Cohere");

    // Select All Cohere Models (Wildcard)
    const modelDropdown = page.locator(".ant-select-selection-overflow").first();
    await modelDropdown.click();
    const wildcardOption = page.getByTitle(/All .* Models \(Wildcard\)/);
    await wildcardOption.click();
    await page.keyboard.press("Escape");

    // Enter any API key
    const apiKeyInput = page.locator('input[type="password"]').first();
    await apiKeyInput.fill("sk-any-key-for-wildcard-test");

    // Click Add Model button by its text
    await page.getByRole("button", { name: "Add Model" }).last().click();

    // Wait for success notification
    await expect(page.getByText("created successfully")).toBeVisible({ timeout: 15_000 });

    // Navigate to All Models tab
    await page.getByRole("tab", { name: "All Models" }).click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Search for the wildcard model
    await page.locator('input[placeholder="Search model names..."]').fill("cohere");
    await page.waitForTimeout(1000);

    // Verify the model appears in the results count (not "Showing 0 results")
    await expect(page.getByText(/Showing \d+ - \d+ of \d+ results/)).toBeVisible({ timeout: 15_000 });

    // Verify the wildcard model appears in the table body (wildcard models show as "cohere/*")
    const tableBody = page.locator("table tbody");
    await expect(tableBody.getByText("cohere/").first()).toBeVisible({ timeout: 15_000 });
  });
});
