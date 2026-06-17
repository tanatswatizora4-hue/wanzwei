import { expect, test, type Page } from "@playwright/test";

const FULL_E2E_ENABLED = process.env.WZ_E2E_FULL === "1";
const FACILITY_E2E_EMAIL = process.env.WZ_E2E_FACILITY_EMAIL;
const PROFESSIONAL_E2E_EMAIL = process.env.WZ_E2E_PROFESSIONAL_EMAIL;
const E2E_PASSWORD = process.env.WZ_E2E_PASSWORD;
const facilityWorkflowTest =
  FULL_E2E_ENABLED && FACILITY_E2E_EMAIL ? test : test.skip;
const professionalWorkflowTest =
  FULL_E2E_ENABLED && PROFESSIONAL_E2E_EMAIL ? test : test.skip;

async function signInAsTestAccount(page: Page, email: string) {
  if (!E2E_PASSWORD) {
    throw new Error("WZ_E2E_PASSWORD is required for full authenticated E2E");
  }
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: /continue/i }).click();
}

test.describe("application workflows", () => {
  test("post job workflow is pending implementation", async () => {
    test.skip(
      true,
      "Facility jobs page currently has no job creation form or server action.",
    );
  });

  test("apply for job workflow is pending implementation", async () => {
    test.skip(
      true,
      "Professional jobs page currently renders Apply buttons without an application action.",
    );
  });

  facilityWorkflowTest(
    "facility emergency alert workflow can be opened and completed in the UI",
    async ({ page }) => {
      test.skip(
        !FULL_E2E_ENABLED || !FACILITY_E2E_EMAIL,
      "Set WZ_E2E_FULL=1 plus WZ_E2E_FACILITY_EMAIL/WZ_E2E_PASSWORD for authenticated facility workflows.",
      );

      await signInAsTestAccount(page, FACILITY_E2E_EMAIL!);

      await page.goto("/facility/emergency");
      await expect(
        page.getByRole("heading", { name: "Emergency Locum Alerts" }),
      ).toBeVisible();
      await expect(page.getByText("Send emergency alert")).toBeVisible();

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const shiftStart = tomorrow.toISOString().slice(0, 16);
      const shiftEnd = new Date(tomorrow.getTime() + 12 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 16);

      await page.locator('input[name="shiftStart"]').fill(shiftStart);
      await page.locator('input[name="shiftEnd"]').fill(shiftEnd);
      await page.getByLabel("Minimum pay").fill("30");
      await page.getByLabel("Maximum pay").fill("45");
      await page
        .locator('textarea[name="notes"]')
        .fill("E2E smoke test shift requirements");

      await expect(page.getByRole("button", { name: /Send alert/ })).toBeEnabled();
      await expect(page.locator('textarea[name="notes"]')).toHaveValue(
        "E2E smoke test shift requirements",
      );
    },
  );

  facilityWorkflowTest(
    "facility emergency alert can be submitted with provisioned services",
    async ({ page }) => {
      test.skip(
        !FULL_E2E_ENABLED || !FACILITY_E2E_EMAIL,
      "Set WZ_E2E_FULL=1 plus Supabase/Upstash env and WZ_E2E_FACILITY_EMAIL/WZ_E2E_PASSWORD to submit persistent alerts.",
      );

      await signInAsTestAccount(page, FACILITY_E2E_EMAIL!);
      await page.goto("/facility/emergency");
      await page.getByRole("button", { name: /Send alert/ }).click();
      await expect(page.getByRole("heading", { name: "Recent alerts" })).toBeVisible();
    },
  );

  professionalWorkflowTest(
    "professional can respond to emergency alerts with provisioned service data",
    async ({ page }) => {
      test.skip(
        !FULL_E2E_ENABLED || !PROFESSIONAL_E2E_EMAIL,
      "Set WZ_E2E_FULL=1 plus WZ_E2E_PROFESSIONAL_EMAIL/WZ_E2E_PASSWORD with matching Supabase data.",
      );

      await signInAsTestAccount(page, PROFESSIONAL_E2E_EMAIL!);
      await page.goto("/professional/dashboard");
      await expect(page.getByText("Emergency Alerts")).toBeVisible();
      await page.getByRole("button", { name: /Accept shift/ }).first().click();
      await expect(page.getByText("Emergency Alerts")).toBeVisible();
    },
  );

  test("facility dashboard persistent metrics require seeded service data", async () => {
    test.skip(
      true,
      "Facility dashboard has DB-backed reads; assert persisted metrics in full E2E once beta test data exists.",
    );
  });

  test("professional dashboard persistent metrics require seeded service data", async () => {
    test.skip(
      true,
      "Professional dashboard has DB-backed reads; assert persisted metrics in full E2E once beta test data exists.",
    );
  });
});
