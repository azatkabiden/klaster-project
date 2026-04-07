import { expect, test } from "@playwright/test";

test("marketplace renders the command deck scan lane", async ({ page }) => {
  await page.goto("/marketplace");

  await expect(
    page.getByRole("heading", {
      name: "Compare public compute pools through one disciplined scan lane.",
    }),
  ).toBeVisible();
  await expect(page.getByText("H200 Inference Rack / Frankfurt")).toBeVisible();
  await expect(
    page.getByTestId("marketplace-listing-demo-vault"),
  ).toBeVisible();
  await expect(
    page.getByTestId("marketplace-open-vault-demo-vault"),
  ).toBeVisible();
});

test("public shell exposes the seeded demo wallet auth posture locally", async ({
  page,
}) => {
  await page.goto("/marketplace");

  await expect(page.getByTestId("wallet-auth-control")).toBeVisible();
  await expect(page.getByTestId("wallet-auth-demo")).toBeVisible();
});

test("vault detail renders the confidence ledger purchase rail", async ({
  page,
}) => {
  await page.goto("/vaults/demo-vault");

  await expect(
    page.getByRole("heading", {
      name: "H200 Inference Rack / Frankfurt",
    }),
  ).toBeVisible();
  await expect(page.getByTestId("vault-purchase-panel")).toBeVisible();
  await expect(page.getByTestId("vault-purchase-submit")).toBeVisible();
  await expect(page.getByText("Health summary")).toBeVisible();
});
