import { test, expect } from '@playwright/test';

const unique = () => `user-${Date.now()}`;

test('register, create a blog, like it from detail page, and verify count increments', async ({ page }) => {
  const email = `${unique()}@test.com`;
  const blogTitle = `Likeable Blog ${Date.now()}`;

  // Register
  await page.goto('/register');
  await page.getByLabel('Name').fill('Like Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.locator('form').getByRole('button', { name: 'Register' }).click();
  await expect(page).toHaveURL(/dashboard/);

  // Create a published blog
  await page.getByRole('link', { name: /new blog/i }).click();
  await expect(page).toHaveURL(/dashboard\/new/);
  await page.getByLabel('Title').fill(blogTitle);
  await page.getByLabel('Content').fill('This is a blog post that can be liked by users.');
  await page.getByLabel('Publish').check();
  await page.getByRole('button', { name: /create blog/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10000 });

  // Navigate to feed and click into the blog
  await page.goto('/feed');
  await expect(page.getByText(blogTitle)).toBeVisible({ timeout: 10000 });
  await page.getByText(blogTitle).click();

  // Should be on the blog detail page
  await expect(page.getByRole('heading', { name: blogTitle })).toBeVisible({ timeout: 10000 });

  // Find the like button on the detail page
  const likeButton = page.locator('button').filter({ has: page.locator('span') }).first();
  await expect(likeButton).toBeVisible({ timeout: 5000 });

  // Get initial count
  const countSpan = likeButton.locator('span');
  const beforeText = await countSpan.textContent();
  const beforeCount = parseInt(beforeText ?? '0', 10);

  // Click like
  await likeButton.click();

  // Verify the count incremented
  await expect(countSpan).toHaveText(String(beforeCount + 1), { timeout: 5000 });
});
