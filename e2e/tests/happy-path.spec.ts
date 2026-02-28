import { test, expect } from '@playwright/test';

const unique = () => `user-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;

test('register, create blog, publish, and view in feed', async ({ page }) => {
  const email = `${unique()}@test.com`;
  const blogTitle = `My Happy-Path Blog ${Date.now()}`;

  // Register
  await page.goto('/register');
  await page.getByLabel('Name').fill('Test Author');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.locator('form').getByRole('button', { name: 'Register' }).click();

  // Should land on dashboard
  await expect(page).toHaveURL(/dashboard/);

  // Create a new blog
  await page.getByRole('link', { name: /new blog/i }).click();
  await page.getByLabel('Title').fill(blogTitle);
  await page.getByLabel('Content').fill('This is the blog content for happy-path testing.');
  await page.getByLabel('Publish').check();
  await page.getByRole('button', { name: /create blog/i }).click();

  // Navigate to feed and verify the blog appears
  await page.goto('/feed');
  await expect(page.getByRole('heading', { name: /^feed$/i })).toBeVisible();

  const feedRes = await page.request.get('/api/feed?take=50');
  expect(feedRes.ok()).toBeTruthy();

  const feedData = (await feedRes.json()) as {
    items: Array<{ title: string }>;
  };

  expect(feedData.items.some((item) => item.title === blogTitle)).toBeTruthy();
});
