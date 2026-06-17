# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> auth workflows >> login submits credentials and preserves safe next redirect
- Location: e2e\auth.spec.ts:36:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('Email')
    - locator resolved to <input id="email" required="" type="email" name="email" placeholder="you@hospital.co.zw" class="flex h-9 w-full rounded-[var(--radius-sm)] border bg-white px-3 text-sm border-[color:var(--color-border-default)] text-[color:var(--color-ink-900)] placeholder:text-[color:var(--color-ink-300)] shadow-[var(--shadow-xs)] transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--color-brand-100)] focus-visible:border-[color:var(--color-brand-500)] disabled:cursor-…/>
    - fill("pro.e2e@example.com")
  - attempting fill action
    - waiting for element to be visible, enabled and editable

```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | test.describe("auth workflows", () => {
  4  |   test("signup submits account details and handles verification redirect", async ({
  5  |     page,
  6  |   }) => {
  7  |     let submitted = "";
  8  |     await page.route("**/api/auth/signup", async (route) => {
  9  |       submitted = route.request().postData() ?? "";
  10 |       await route.fulfill({
  11 |         status: 303,
  12 |         headers: {
  13 |           location: "/login?check-email=1&email=e2e.signup%40example.com",
  14 |         },
  15 |       });
  16 |     });
  17 | 
  18 |     await page.goto("/signup?role=facility", { waitUntil: "domcontentloaded" });
  19 |     await expect(
  20 |       page.getByRole("heading", { name: "Create your account" }),
  21 |     ).toBeVisible();
  22 | 
  23 |     await page.locator('input[name="role"][value="facility"]').check({
  24 |       force: true,
  25 |     });
  26 |     await page.getByLabel("Full name").fill("E2E Facility Lead");
  27 |     await page.getByLabel("Work email").fill("e2e.signup@example.com");
  28 |     await page.getByLabel("Password").fill("secret1");
  29 |     await page.getByRole("button", { name: "Create account" }).click();
  30 | 
  31 |     await expect.poll(() => submitted).toContain("role=facility");
  32 |     expect(submitted).toContain("name=E2E+Facility+Lead");
  33 |     expect(submitted).toContain("email=e2e.signup%40example.com");
  34 |   });
  35 | 
  36 |   test("login submits credentials and preserves safe next redirect", async ({
  37 |     page,
  38 |   }) => {
  39 |     let submitted = "";
  40 |     await page.route("**/api/auth/login", async (route) => {
  41 |       submitted = route.request().postData() ?? "";
  42 |       await route.fulfill({
  43 |         status: 303,
  44 |         headers: { location: "/professional/dashboard" },
  45 |       });
  46 |     });
  47 | 
  48 |     await page.goto("/login?next=/professional/jobs", {
  49 |       waitUntil: "domcontentloaded",
  50 |     });
  51 |     await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  52 | 
> 53 |     await page.getByLabel("Email").fill("pro.e2e@example.com");
     |                                    ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  54 |     await page.getByLabel("Password").fill("ValidPass123!");
  55 |     await page.getByRole("button", { name: "Continue" }).click();
  56 | 
  57 |     await expect.poll(() => submitted).toContain("email=pro.e2e%40example.com");
  58 |     expect(submitted).toContain("password=ValidPass123%21");
  59 |     expect(submitted).toContain("next=%2Fprofessional%2Fjobs");
  60 |   });
  61 | });
  62 | 
```