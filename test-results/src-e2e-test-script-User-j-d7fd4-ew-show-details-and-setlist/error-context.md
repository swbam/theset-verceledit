# Test info

- Name: User journey: search artist, view shows, view show details and setlist
- Location: /Users/seth/theset-vercel/src/e2e-test-script.spec.ts:5:1

# Error details

```
Error: page.fill: Test ended.
Call log:
  - waiting for locator('input[placeholder*="Search for artists"]')

    at /Users/seth/theset-vercel/src/e2e-test-script.spec.ts:11:14
```

# Test source

```ts
   1 | // E2E test for user journey: homepage -> search artist -> artist page -> show page -> setlist
   2 |
   3 | import { test, expect } from '@playwright/test';
   4 |
   5 | test('User journey: search artist, view shows, view show details and setlist', async ({ page }) => {
   6 |   // 1. Go to homepage
   7 |   await page.goto('http://localhost:8080/');
   8 |   await expect(page).toHaveTitle(/TheSet/i);
   9 |
  10 |   // 2. Search for an artist
> 11 |   await page.fill('input[placeholder*="Search for artists"]', 'Dispatch');
     |              ^ Error: page.fill: Test ended.
  12 |   await page.click('button:has-text("Search")');
  13 |   await page.waitForSelector('.artist-card, .artist-list-item');
  14 |   const artistName = await page.textContent('.artist-card .artist-name, .artist-list-item .artist-name');
  15 |   expect(artistName).toMatch(/Dispatch/i);
  16 |
  17 |   // 3. Click the artist to go to artist page
  18 |   await page.click('.artist-card, .artist-list-item');
  19 |   await page.waitForSelector('.artist-shows-list, .shows-list');
  20 |   const showCount = await page.locator('.show-card, .show-list-item').count();
  21 |   expect(showCount).toBeGreaterThan(0);
  22 |
  23 |   // 4. Click a show on the artist page
  24 |   await page.click('.show-card, .show-list-item');
  25 |   await page.waitForSelector('.show-details, .show-title');
  26 |   const showTitle = await page.textContent('.show-details .show-title, .show-title');
  27 |   expect(showTitle).not.toBeNull();
  28 |
  29 |   // 5. View setlist functionality
  30 |   await page.waitForSelector('.setlist, .setlist-section');
  31 |   const setlistItems = await page.locator('.setlist-song, .setlist-item').count();
  32 |   expect(setlistItems).toBeGreaterThan(0);
  33 |
  34 |   // Optionally, check for voting or setlist interaction
  35 |   // await page.click('.setlist-song .vote-button, .setlist-item .vote-button');
  36 |   // expect(await page.textContent('.vote-count')).not.toBeNull();
  37 | });
  38 |
```