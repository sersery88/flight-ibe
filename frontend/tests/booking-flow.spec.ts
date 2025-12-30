import { test, expect } from '@playwright/test';

test.describe('Booking Flow', () => {
  test('should load app without React child errors', async ({ page }) => {
    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Listen for page errors
    const pageErrors: Error[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate to the app
    await page.goto('/');

    // Wait for the app to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for React child errors
    const hasReactChildError = consoleErrors.some(err =>
      err.includes('Objects are not valid as a React child')
    ) || pageErrors.some(err =>
      err.message.includes('Objects are not valid as a React child')
    );

    if (hasReactChildError) {
      console.error('❌ React child error detected!');
      console.error('Console errors:', consoleErrors);
      console.error('Page errors:', pageErrors);
    }

    expect(hasReactChildError).toBe(false);

    // Wait for the search form to be visible
    const searchHeader = page.locator('h1, h2').filter({ hasText: /Flug/i }).first();
    await expect(searchHeader).toBeVisible({ timeout: 10000 });

    console.log('✅ App loaded successfully without React child errors');
  });
});

