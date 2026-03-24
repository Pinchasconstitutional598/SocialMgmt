import { test, expect } from "@playwright/test";

const E2E_CLIENT_NAME = "Firma E2E Playwright";

async function loginViaUi(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);
  await expect(page.getByTestId("login-email")).toHaveValue(email);
  await expect(page.getByTestId("login-password")).toHaveValue(password);
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

const feedJson = {
  facebook: [
    {
      socialAccountId: 1,
      pageId: "p1",
      posts: [
        {
          id: "post_e2e_1",
          message: "Post E2E",
          created_time: "2025-01-01T12:00:00+0000",
          permalink_url: "https://facebook.com/test",
        },
      ],
    },
  ],
  instagram: [],
};

const commentsJson = {
  data: [
    {
      id: "comment_e2e_1",
      message: "Komentarz E2E",
      from: { id: "1", name: "Tester" },
      created_time: "2025-01-01",
    },
  ],
};

async function mockMetaApis(page: import("@playwright/test").Page) {
  await page.route("**/api/clients/*/meta/feed", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(feedJson),
    });
  });
  await page.route("**/api/clients/*/meta/comments*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(commentsJson),
    });
  });
}

test.describe("Panel — Klienci i komentarze", () => {
  test.beforeEach(async ({ page }) => {
    await mockMetaApis(page);
  });

  test("admin: logowanie, Klienci, wyszukiwanie, drawer komentarzy, przycisk Usuń", async ({ page }) => {
    const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "e2e-admin@local.test";
    const adminPass = process.env.E2E_ADMIN_PASSWORD ?? "E2E_Admin_123!";

    await loginViaUi(page, adminEmail, adminPass);

    await page.getByRole("link", { name: "Klienci" }).click();
    await expect(page).toHaveURL(/\/clients/);

    await page.getByTestId("clients-search-input").fill(E2E_CLIENT_NAME);
    await expect(page.getByRole("gridcell", { name: E2E_CLIENT_NAME })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("row").filter({ hasText: E2E_CLIENT_NAME }).getByRole("link", { name: "Profil" }).click();
    await expect(page).toHaveURL(/\/clients\/\d+/);

    await page.getByTestId("client-tab-content-manager").click();
    await page.getByTestId("feed-manage-comments-button").click();

    await expect(page.getByTestId("comments-drawer")).toBeVisible();
    await expect(page.getByText("Komentarze (Facebook)")).toBeVisible();
    await expect(page.getByText("Komentarz E2E")).toBeVisible();

    await expect(page.getByTestId("comment-delete-button")).toBeVisible();
  });

  test("marketing: drawer komentarzy bez przycisku Usuń", async ({ page }) => {
    const email = process.env.E2E_MARKETING_EMAIL ?? "e2e-marketing@local.test";
    const pass = process.env.E2E_MARKETING_PASSWORD ?? "E2E_Marketing_123!";

    await loginViaUi(page, email, pass);

    await page.getByRole("link", { name: "Klienci" }).click();
    await page.getByTestId("clients-search-input").fill(E2E_CLIENT_NAME);
    await expect(page.getByRole("gridcell", { name: E2E_CLIENT_NAME })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("row").filter({ hasText: E2E_CLIENT_NAME }).getByRole("link", { name: "Profil" }).click();

    await page.getByTestId("client-tab-content-manager").click();
    await page.getByTestId("feed-manage-comments-button").click();

    await expect(page.getByTestId("comments-drawer")).toBeVisible();
    await expect(page.getByTestId("comment-delete-button")).toHaveCount(0);
  });
});
