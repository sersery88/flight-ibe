import { test, expect } from '@playwright/test';

test.describe('React Error Detection', () => {
  test('should detect React child errors in console', async ({ page }) => {
    // Track all errors
    const errors: { type: string; message: string }[] = [];

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push({ type: 'console', message: msg.text() });
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      errors.push({ type: 'page', message: error.message });
    });

    // Navigate to app
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Take screenshot for manual inspection
    await page.screenshot({ path: 'test-results/app-loaded.png', fullPage: true });

    // Check for React child errors
    const reactChildErrors = errors.filter(err => 
      err.message.includes('Objects are not valid as a React child') ||
      err.message.includes('object with keys')
    );

    if (reactChildErrors.length > 0) {
      console.error('❌ React child errors detected:');
      reactChildErrors.forEach(err => {
        console.error(`  [${err.type}] ${err.message}`);
      });
    } else {
      console.log('✅ No React child errors detected');
    }

    // Log all errors for debugging
    if (errors.length > 0) {
      console.log('\nAll errors detected:');
      errors.forEach(err => {
        console.log(`  [${err.type}] ${err.message}`);
      });
    }

    // Assert no React child errors
    expect(reactChildErrors.length).toBe(0);
  });

  test('should check for error boundary activation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check if error boundary is visible
    const errorBoundary = page.getByText('Etwas ist schiefgelaufen');
    const isErrorVisible = await errorBoundary.isVisible().catch(() => false);

    if (isErrorVisible) {
      console.error('❌ Error boundary is visible - something went wrong');
      await page.screenshot({ path: 'test-results/error-boundary.png', fullPage: true });
    } else {
      console.log('✅ No error boundary visible');
    }

    expect(isErrorVisible).toBe(false);
  });
});

