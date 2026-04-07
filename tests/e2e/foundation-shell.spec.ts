import { expect, test } from "@playwright/test";

test("foundation shell exposes the marketing checkpoint state", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Finance real compute nodes through verified onchain vaults.",
    }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("main")
      .getByRole("link", { name: "Open marketplace" })
      .first(),
  ).toBeVisible();
});
