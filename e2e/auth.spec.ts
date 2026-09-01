import { expect, test } from "@playwright/test";

test.describe("auth workflows", () => {
  test("signup submits account details and handles verification redirect", async ({
    page,
  }) => {
    let submitted = "";
    await page.route("**/api/auth/signup", async (route) => {
      submitted = route.request().postData() ?? "";
      await route.fulfill({
        status: 303,
        headers: {
          location: "/login?check-email=1&email=e2e.signup%40example.com",
        },
      });
    });

    await page.goto("/signup?role=facility", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Create your account" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Facility" }).click();
    await page.getByLabel("Full name").fill("E2E Facility Lead");
    await page.getByLabel("Organisation name").fill("E2E Clinic");
    await page.getByLabel("City / location").fill("Harare");
    await page.getByLabel("Facility type").selectOption("Clinic");
    await page.getByLabel("Work email").fill("e2e.signup@example.com");
    await page.getByLabel("Password").fill("secret1");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect.poll(() => submitted).toContain("role=facility");
    expect(submitted).toContain("name=E2E+Facility+Lead");
    expect(submitted).toContain("email=e2e.signup%40example.com");
    expect(submitted).toContain("organisationName=E2E+Clinic");
    expect(submitted).toContain("location=Harare");
    expect(submitted).toContain("facilityType=Clinic");
  });

  test("login submits credentials and preserves safe next redirect", async ({
    page,
  }) => {
    let submitted = "";
    await page.route("**/api/auth/login", async (route) => {
      submitted = route.request().postData() ?? "";
      await route.fulfill({
        status: 303,
        headers: { location: "/professional/dashboard" },
      });
    });

    await page.goto("/login?next=/professional/jobs", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();

    await page.getByLabel("Email").fill("pro.e2e@example.com");
    await page.getByLabel("Password").fill("ValidPass123!");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect.poll(() => submitted).toContain("email=pro.e2e%40example.com");
    expect(submitted).toContain("password=ValidPass123%21");
    expect(submitted).toContain("next=%2Fprofessional%2Fjobs");
  });

  test("confirmation landing GET does not auto-submit verification", async ({
    page,
  }) => {
    const token = "a".repeat(40);
    const posts: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST") posts.push(request.url());
    });

    await page.goto(`/auth/confirm?token_hash=${token}&type=signup`, {
      waitUntil: "domcontentloaded",
    });

    await expect(
      page.getByRole("heading", { name: "Confirm your email" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Confirm email" }),
    ).toBeVisible();
    expect(posts).toEqual([]);
  });
});
