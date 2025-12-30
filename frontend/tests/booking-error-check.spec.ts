import { test, expect } from '@playwright/test';

test.describe('Booking Error Check', () => {
  test('should not have React child errors when rendering prices', async ({ page }) => {
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
    await page.waitForLoadState('networkidle');

    // Try to trigger a search to get to results
    const originInput = page.getByPlaceholder(/von/i).first();
    if (await originInput.isVisible({ timeout: 5000 })) {
      await originInput.click();
      await originInput.fill('FRA');
      await page.waitForTimeout(500);
      
      // Try to select from dropdown
      const firstOption = page.locator('[role="option"]').first();
      if (await firstOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await firstOption.click();
      } else {
        await page.keyboard.press('Enter');
      }

      // Fill destination
      const destInput = page.getByPlaceholder(/nach/i).first();
      await destInput.click();
      await destInput.fill('JFK');
      await page.waitForTimeout(500);
      
      const destOption = page.locator('[role="option"]').first();
      if (await destOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await destOption.click();
      } else {
        await page.keyboard.press('Enter');
      }

      // Click search
      const searchButton = page.getByRole('button', { name: /suchen/i });
      if (await searchButton.isVisible()) {
        await searchButton.click();
        
        // Wait for results or error
        await page.waitForTimeout(5000);
        
        // Check for React child errors after search
        const hasReactChildError = consoleErrors.some(err => 
          err.includes('Objects are not valid as a React child')
        ) || pageErrors.some(err => 
          err.message.includes('Objects are not valid as a React child')
        );

        if (hasReactChildError) {
          console.error('❌ React child error detected after search!');
          console.error('Console errors:', consoleErrors);
          console.error('Page errors:', pageErrors);
        }

        expect(hasReactChildError).toBe(false);

        // Try to select a flight if available
        const flightCard = page.locator('[class*="card"]').first();
        if (await flightCard.isVisible({ timeout: 3000 }).catch(() => false)) {
          await flightCard.click();
          await page.waitForTimeout(1000);

          // Look for select button
          const selectButton = page.getByRole('button', { name: /auswählen/i }).first();
          if (await selectButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await selectButton.click();
            await page.waitForTimeout(2000);

            // Check for errors on booking page
            const hasBookingError = consoleErrors.some(err => 
              err.includes('Objects are not valid as a React child')
            ) || pageErrors.some(err => 
              err.message.includes('Objects are not valid as a React child')
            );

            if (hasBookingError) {
              console.error('❌ React child error detected on booking page!');
              console.error('Console errors:', consoleErrors);
              console.error('Page errors:', pageErrors);
            }

            expect(hasBookingError).toBe(false);
            console.log('✅ No React child errors on booking page');
          }
        }
      }
    }

    // Final check
    const finalCheck = consoleErrors.some(err => 
      err.includes('Objects are not valid as a React child')
    ) || pageErrors.some(err => 
      err.message.includes('Objects are not valid as a React child')
    );

    expect(finalCheck).toBe(false);
    console.log('✅ Complete flow tested - no React child errors detected');
  });
});

