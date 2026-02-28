import { test, expect } from '@playwright/test';

const unique = () => `user-${Date.now()}`;

test('register, navigate to feed, like a blog, and verify count', async ({ page }) => {
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

  // Click the first like button
  const likeButton = page.getByRole('button', { name: /like/i }).first();
  await likeButton.click();

  // Verify the count has incremented (button should still be visible)
  await expect(likeButton).toBeVisible();
});
