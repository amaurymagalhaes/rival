import { test, expect } from '@playwright/test';

const unique = () => `user-${Date.now()}`;

test('register, navigate to feed, like a blog, and verify count increments', async ({ page }) => {
  const email = `${unique()}@test.com`;

  // Register
  await page.goto('/register');
  await page.getByLabel('Name').fill('Like Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Register' }).click();

  // Should land on dashboard
  await expect(page).toHaveURL(/dashboard/);

  // Navigate to feed
  await page.goto('/feed');

  // Find the first like button and capture initial count
  const likeButton = page.getByRole('button', { name: /\d+/ }).first();
  const countSpan = likeButton.locator('span');
  const beforeText = await countSpan.textContent();
  const beforeCount = parseInt(beforeText ?? '0', 10);

  // Click like
  await likeButton.click();

  // Verify the count incremented
  await expect(countSpan).toHaveText(String(beforeCount + 1));
});
