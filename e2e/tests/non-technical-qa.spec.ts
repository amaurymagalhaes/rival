import fs from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

test.setTimeout(900_000);

type CaseStatus = 'passed' | 'failed' | 'blocked';

type CaseResult = {
  id: string;
  status: CaseStatus;
  note?: string;
  screenshot?: string;
};

const stamp = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
const user = {
  name: 'QA Runner',
  email: `qa-${stamp}@test.com`,
  password: 'password123',
};

const content = {
  draft: `Draft content ${stamp}`,
  draftEdited: `Draft edited content ${stamp}`,
  published: `Published content ${stamp}`,
  hiddenDraft: `Hidden draft content ${stamp}`,
  deleteDraft: `Delete draft content ${stamp}`,
  newestA: `Newest A content ${stamp}`,
  newestB: `Newest B content ${stamp}`,
};

const title = {
  draft: `QA Draft ${stamp}`,
  draftEdited: `QA Draft Edited ${stamp}`,
  hiddenDraft: `QA Hidden Draft ${stamp}`,
  deleteDraft: `QA Delete Draft ${stamp}`,
  newestA: `QA Newest A ${stamp}`,
  newestB: `QA Newest B ${stamp}`,
};

let publishedTitle = title.draftEdited;
let selectedBlogPath = '';

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.locator('form').getByRole('button', { name: /^login$/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function logout(page: Page) {
  await page.getByRole('button', { name: /^logout$/i }).click();
  await expect(page).toHaveURL(/\/login$/);
}

async function createBlog(
  page: Page,
  blogTitle: string,
  blogContent: string,
  publish: boolean,
) {
  await page.goto('/dashboard/new');
  await page.getByLabel('Title').fill(blogTitle);
  await page.getByLabel('Content').fill(blogContent);

  const publishCheckbox = page.getByLabel('Publish');
  if (publish) {
    await publishCheckbox.check();
  } else if (await publishCheckbox.isChecked()) {
    await publishCheckbox.uncheck();
  }

  await page.getByRole('button', { name: /create blog/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

function blogCard(page: Page, blogTitle: string) {
  return page
    .locator('[data-slot="card"]')
    .filter({ hasText: blogTitle })
    .first();
}

test('non-technical QA checklist executable cases', async ({ page }) => {
  const outputDir = path.resolve('test-results/non-technical-qa');
  await fs.mkdir(outputDir, { recursive: true });

  const results: CaseResult[] = [];

  const runCase = async (
    id: string,
    fn: () => Promise<void>,
    note?: string,
  ): Promise<boolean> => {
    try {
      await fn();
      results.push({ id, status: 'passed', note });
      return true;
    } catch (error) {
      const screenshotPath = path.join(outputDir, `${id}.png`);
      let capturedScreenshot: string | undefined;
      try {
        await page.screenshot({ path: screenshotPath, fullPage: true });
        capturedScreenshot = screenshotPath;
      } catch {
        capturedScreenshot = undefined;
      }
      results.push({
        id,
        status: 'failed',
        note: error instanceof Error ? error.message : String(error),
        screenshot: capturedScreenshot,
      });
      return false;
    }
  };

  const blockCase = (id: string, note: string) => {
    results.push({ id, status: 'blocked', note });
  };

  await runCase('ENV-01', async () => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /HyperBlog Editorial Platform/i })).toBeVisible();
  });

  await runCase('ENV-02', async () => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /^register$/i })).toBeVisible();
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /^login$/i })).toBeVisible();
  });

  await runCase('ENV-03', async () => {
    await page.goto('/feed');
    await expect(page.getByRole('heading', { name: /^feed$/i })).toBeVisible();
  });

  const hasRegisteredUser = await runCase('ENV-04', async () => {
    await page.goto('/register');
    await page.getByLabel(/Name/).fill(user.name);
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password').fill(user.password);
    await page.locator('form').getByRole('button', { name: /^register$/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  if (hasRegisteredUser) {
    await runCase(
      'AUTH-01',
      async () => {
        await expect(page).toHaveURL(/\/dashboard$/);
      },
      'Covered by ENV-04 registration flow.',
    );

    await runCase('AUTH-02', async () => {
      await logout(page);
      await login(page, user.email, user.password);
    });

    await runCase('AUTH-03', async () => {
      await logout(page);
      await page.getByLabel('Email').fill(user.email);
      await page.getByLabel('Password').fill(`${user.password}-wrong`);
      await page.locator('form').getByRole('button', { name: /^login$/i }).click();
      await expect(page.locator('form')).toContainText(/invalid|credentials|password/i);
    });
  } else {
    blockCase(
      'AUTH-01',
      'Blocked by ENV-04 registration failure. Could not validate authenticated flow.',
    );
    blockCase(
      'AUTH-02',
      'Blocked by ENV-04 registration failure. Could not validate login for the new account.',
    );
    blockCase(
      'AUTH-03',
      'Blocked by ENV-04 registration failure. No known valid account for this run.',
    );
  }

  await runCase('AUTH-04', async () => {
    if (hasRegisteredUser) {
      await logout(page);
    }
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
    if (hasRegisteredUser) {
      await login(page, user.email, user.password);
    }
  });

  let hasPublishedBlog = false;
  if (hasRegisteredUser) {
    await runCase('BLOG-01', async () => {
      await createBlog(page, title.draft, content.draft, false);
      const card = blogCard(page, title.draft);
      await expect(card).toBeVisible();
      await expect(card).toContainText('Draft');
    });

    await runCase('BLOG-02', async () => {
      const card = blogCard(page, title.draft);
      await card.getByRole('link', { name: /^edit$/i }).click();
      await expect(page).toHaveURL(/\/dashboard\/edit\//);

      await page.getByLabel('Title').fill(title.draftEdited);
      await page.getByLabel('Content').fill(content.draftEdited);
      await page.getByRole('button', { name: /save changes/i }).click();

      await expect(page).toHaveURL(/\/dashboard$/);
      const updated = blogCard(page, title.draftEdited);
      await expect(updated).toBeVisible();
    });

    hasPublishedBlog = await runCase('BLOG-03', async () => {
      const card = blogCard(page, title.draftEdited);
      await card.getByRole('link', { name: /^edit$/i }).click();
      await page.getByLabel('Publish').check();
      await page.getByRole('button', { name: /save changes/i }).click();

      await expect(page).toHaveURL(/\/dashboard$/);
      const updated = blogCard(page, title.draftEdited);
      await expect(updated).toContainText('Published');
      publishedTitle = title.draftEdited;
    });

    await runCase('BLOG-04', async () => {
      await createBlog(page, title.deleteDraft, content.deleteDraft, false);
      const deleteCard = blogCard(page, title.deleteDraft);
      await expect(deleteCard).toBeVisible();
      await deleteCard.getByRole('button', { name: /^delete$/i }).click();
      await deleteCard.getByRole('button', { name: /confirm delete/i }).click();
      await expect(blogCard(page, title.deleteDraft)).toHaveCount(0);
    });
  } else {
    blockCase('BLOG-01', 'Blocked by ENV-04 registration failure.');
    blockCase('BLOG-02', 'Blocked by ENV-04 registration failure.');
    blockCase('BLOG-03', 'Blocked by ENV-04 registration failure.');
    blockCase('BLOG-04', 'Blocked by ENV-04 registration failure.');
  }

  if (hasPublishedBlog) {
    await runCase('PUBLIC-01', async () => {
      await page.goto('/feed');
      await page.getByRole('link', { name: publishedTitle }).first().click();
      await expect(page.getByRole('heading', { name: publishedTitle })).toBeVisible();
      await expect(page.getByText(content.draftEdited)).toBeVisible();
      selectedBlogPath = new URL(page.url()).pathname;
    });
  } else {
    blockCase(
      'PUBLIC-01',
      'Blocked because no published blog was created during this run.',
    );
  }

  if (hasRegisteredUser) {
    await runCase('PUBLIC-02', async () => {
      await createBlog(page, title.hiddenDraft, content.hiddenDraft, false);
      await page.goto('/feed');
      await expect(page.getByRole('link', { name: title.hiddenDraft })).toHaveCount(0);
    });
  } else {
    blockCase('PUBLIC-02', 'Blocked by ENV-04 registration failure.');
  }

  await runCase('PUBLIC-03', async () => {
    await page.goto('/blogs/does-not-exist');
    await expect(page.getByText(/blog not found/i)).toBeVisible();
  });

  await runCase('FEED-01', async () => {
    await page.goto('/feed');
    await expect(page.getByRole('heading', { name: /^feed$/i })).toBeVisible();
    await expect
      .poll(async () => page.locator('main a[href^="/blogs/"]').count())
      .toBeGreaterThan(0);
  });

  let hasFeedFixtureBlog = false;
  if (hasRegisteredUser) {
    hasFeedFixtureBlog = await runCase('FEED-02', async () => {
      await createBlog(page, title.newestA, content.newestA, true);
      await page.waitForTimeout(50);
      await createBlog(page, title.newestB, content.newestB, true);

      await page.goto('/feed');
      await expect
        .poll(async () => page.locator('main a[href^="/blogs/"]').count())
        .toBeGreaterThan(0);
      await expect
        .poll(async () => {
          const titles = await page.locator('main a[href^="/blogs/"]').allTextContents();
          return titles.includes(title.newestA) && titles.includes(title.newestB);
        })
        .toBeTruthy();

      const titles = await page.locator('main a[href^="/blogs/"]').allTextContents();

      const firstIdx = titles.indexOf(title.newestA);
      const secondIdx = titles.indexOf(title.newestB);

      expect(firstIdx).toBeGreaterThanOrEqual(0);
      expect(secondIdx).toBeGreaterThanOrEqual(0);
      expect(secondIdx).toBeLessThan(firstIdx);
    });
  } else {
    blockCase('FEED-02', 'Blocked by ENV-04 registration failure.');
  }

  await runCase('FEED-03', async () => {
    await page.goto('/feed');
    const list = page.locator('main a[href^="/blogs/"]');
    const before = await list.count();

    const loadMoreButton = page.getByRole('button', { name: /load more/i });
    await expect(loadMoreButton).toBeVisible();
    await loadMoreButton.click();

    await expect.poll(async () => list.count()).toBeGreaterThan(before);
    await expect(page).toHaveURL(/\/feed$/);
  });

  blockCase(
    'FEED-04',
    'Requires a zero-published-posts environment. Current shared DB already has published posts.',
  );

  blockCase(
    'FEED-05',
    'Slow-network loading-state timing not deterministic in this headless run; requires manual visual throttle check.',
  );

  const hasBlogDetailTarget = hasFeedFixtureBlog || Boolean(selectedBlogPath);
  if (hasFeedFixtureBlog) {
    await runCase('LIKE-01', async () => {
      await page.goto('/feed');
      await page.getByRole('link', { name: title.newestB }).first().click();

      const likeButton = page.locator('button:has(svg.lucide-heart)').first();
      const count = likeButton.locator('span').first();
      const before = Number((await count.textContent()) ?? '0');

      await likeButton.click();
      await expect(count).toHaveText(String(before + 1));
      selectedBlogPath = new URL(page.url()).pathname;
    });

    await runCase('LIKE-02', async () => {
      const likeButton = page.locator('button:has(svg.lucide-heart)').first();
      const count = likeButton.locator('span').first();
      const expected = Number((await count.textContent()) ?? '0');

      await page.reload();
      const reloadedCount = page
        .locator('button:has(svg.lucide-heart)')
        .first()
        .locator('span')
        .first();
      await expect(reloadedCount).toHaveText(String(expected));
    });

    await runCase('LIKE-03', async () => {
      const likeButton = page.locator('button:has(svg.lucide-heart)').first();
      const count = likeButton.locator('span').first();
      const before = Number((await count.textContent()) ?? '0');

      await likeButton.click();
      await expect(count).toHaveText(String(before - 1));
    });
  } else {
    blockCase('LIKE-01', 'Blocked because FEED-02 could not create a published test post.');
    blockCase('LIKE-02', 'Blocked because FEED-02 could not create a published test post.');
    blockCase('LIKE-03', 'Blocked because FEED-02 could not create a published test post.');
  }

  if (hasRegisteredUser && hasBlogDetailTarget) {
    await runCase('COMMENT-01', async () => {
      const commentText = `QA comment ${stamp}`;
      await page.goto(selectedBlogPath || '/feed');
      await page.locator('textarea[name="content"]').fill(commentText);
      await page.getByRole('button', { name: /post comment/i }).click();
      await expect(page.getByText(commentText)).toBeVisible();
    });

    await runCase('COMMENT-02', async () => {
      await logout(page);
      await page.goto(selectedBlogPath || '/feed');
      await expect(page.getByText(/log in to leave a comment/i)).toBeVisible();
      await expect(page.locator('textarea[name="content"]')).toHaveCount(0);
    });

    await runCase('COMMENT-03', async () => {
      await page.goto('/dashboard');
      if (!/\/dashboard$/.test(page.url())) {
        await login(page, user.email, user.password);
      }
      await page.goto(selectedBlogPath || '/feed');
      await page.locator('textarea[name="content"]').fill('   ');
      await page.getByRole('button', { name: /post comment/i }).click();
      await expect(page.getByText(/comment cannot be empty/i)).toBeVisible();
    });
  } else {
    blockCase(
      'COMMENT-01',
      'Blocked because authenticated blog-detail context was not available.',
    );
    blockCase(
      'COMMENT-02',
      'Blocked because authenticated blog-detail context was not available.',
    );
    blockCase(
      'COMMENT-03',
      'Blocked because authenticated blog-detail context was not available.',
    );
  }

  blockCase('UX-01', 'Requires temporarily disabling backend connectivity during browser session.');

  if (hasRegisteredUser) {
    await runCase('UX-02', async () => {
      await page.goto('/dashboard');
      if (!/\/dashboard$/.test(page.url())) {
        await login(page, user.email, user.password);
      }

      await expect(page.getByRole('link', { name: /^dashboard$/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /^logout$/i })).toBeVisible();

      await logout(page);
      await expect(page.getByRole('link', { name: /^login$/i })).toBeVisible();
      await expect(
        page.getByRole('navigation').getByRole('link', { name: /^register$/i }),
      ).toBeVisible();
      await expect(page.getByRole('link', { name: /^dashboard$/i })).toHaveCount(0);

      await login(page, user.email, user.password);
    });
  } else {
    blockCase('UX-02', 'Blocked by ENV-04 registration failure.');
  }

  await runCase('UX-03', async () => {
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto('/feed');
    await expect(page.getByRole('heading', { name: /^feed$/i })).toBeVisible();

    await page.goto(selectedBlogPath || '/feed');
    await expect(page.getByRole('main').first()).toBeVisible();

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    expect(hasOverflow).toBeFalsy();

    await page.setViewportSize({ width: 1280, height: 720 });
  });

  const reportPath = path.join(outputDir, 'results.json');
  await fs.writeFile(reportPath, JSON.stringify(results, null, 2), 'utf8');

  const failed = results.filter((result) => result.status === 'failed');
  if (failed.length > 0) {
    throw new Error(
      `Failed cases: ${failed.map((item) => item.id).join(', ')}. See ${reportPath}.`,
    );
  }
});
