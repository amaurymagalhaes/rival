import { test, expect } from '@playwright/test';

const unique = () => `user-${Date.now()}`;

test('register, create blog, publish, and view in feed', async ({ page }) => {
  const email = `${unique()}@test.com`;

  // Register
  await page.goto('/register');
  await page.getByLabel('Name').fill('Test Author');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Register' }).click();

  // Should land on dashboard
  await expect(page).toHaveURL(/dashboard/);

  // Create a new blog
  await page.getByRole('link', { name: /new blog/i }).click();
  await page.getByLabel('Title').fill('My Happy-Path Blog');
  await page.getByLabel('Content').fill('This is the blog content for happy-path testing.');
  await page.getByLabel('Publish').check();
  await page.getByRole('button', { name: /create blog/i }).click();

  // Navigate to feed and verify the blog appears
  await page.goto('/feed');
  await expect(page.getByText('My Happy-Path Blog')).toBeVisible();
});
