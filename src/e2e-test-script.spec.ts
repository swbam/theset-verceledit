// E2E test for user journey: homepage -> search artist -> artist page -> show page -> setlist

import { test, expect } from '@playwright/test';

test('User journey: search artist, view shows, view show details and setlist', async ({ page }) => {
  // 1. Go to homepage
  await page.goto('http://localhost:8080/');
  await expect(page).toHaveTitle(/TheSet/i);

  // 2. Search for an artist
  await page.fill('input[placeholder*="Search for artists"]', 'Dispatch');
  await page.click('button:has-text("Search")');
  await page.waitForSelector('.artist-card, .artist-list-item');
  const artistName = await page.textContent('.artist-card .artist-name, .artist-list-item .artist-name');
  expect(artistName).toMatch(/Dispatch/i);

  // 3. Click the artist to go to artist page
  await page.click('.artist-card, .artist-list-item');
  await page.waitForSelector('.artist-shows-list, .shows-list');
  const showCount = await page.locator('.show-card, .show-list-item').count();
  expect(showCount).toBeGreaterThan(0);

  // 4. Click a show on the artist page
  await page.click('.show-card, .show-list-item');
  await page.waitForSelector('.show-details, .show-title');
  const showTitle = await page.textContent('.show-details .show-title, .show-title');
  expect(showTitle).not.toBeNull();

  // 5. View setlist functionality
  await page.waitForSelector('.setlist, .setlist-section');
  const setlistItems = await page.locator('.setlist-song, .setlist-item').count();
  expect(setlistItems).toBeGreaterThan(0);

  // Optionally, check for voting or setlist interaction
  // await page.click('.setlist-song .vote-button, .setlist-item .vote-button');
  // expect(await page.textContent('.vote-count')).not.toBeNull();
});
