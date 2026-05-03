import { test, expect } from '@playwright/test';

test.describe('User Story 22: Dashboard Navigation', () => {
  test('Test Case 22.1: Verify "Start New Analysis" Routing', async ({ page }) => {
    // Generate credentials and create user via API
    const dashboardTestEmail = `dashboardtest_${Math.random().toString(36).substring(2, 10)}@example.com`;
    const validTestPassword = 'SecurePassword123!';

    await page.request.post('http://127.0.0.1:8000/api/v1/auth/register', {
      data: {
        email: dashboardTestEmail,
        full_name: 'Dashboard Test User',
        password: validTestPassword
      }
    });

    // Perform login via API to skip UI login in the video
    const loginResponse = await page.request.post('http://127.0.0.1:8000/api/v1/auth/login', {
      data: {
        email: dashboardTestEmail,
        password: validTestPassword
      }
    });
    const loginData = await loginResponse.json();
    const token = loginData.access_token;

    // Inject token into localStorage before navigation
    await page.addInitScript(({ token, email }) => {
      window.localStorage.setItem('access_token', token);
      window.localStorage.setItem('user_email', email);
    }, { token, email: dashboardTestEmail });

    // Navigate directly to dashboard
    await page.goto('/dashboard');

    // Wait for Dashboard to load and verify we are on the Dashboard interface
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Ensure dashboard loads its content
    await expect(page.locator('h2.analyze-card-title')).toHaveText('Dashboard');

    // Locate the "Start New Analysis" action button (UI text is "New Analysis")
    const newAnalysisBtn = page.getByRole('button', { name: 'New Analysis' }).first();
    
    // Verify the button is clearly visible
    await expect(newAnalysisBtn).toBeVisible();

    // Click the "New Analysis" button
    await newAnalysisBtn.click();

    // Verify system instantly redirects user to the analysis input screen
    // without requiring intermediate navigation steps or menus
    await expect(page).toHaveURL(/\/analysis\/new/);

    // Verify the user is successfully placed in the analysis workflow interface
    // (We check for the presence of the product identifier input)
    await expect(page.locator('input#product-identifier')).toBeVisible();
    await expect(page.locator('h2.analyze-card-title')).toContainText('Analyze');
  });
});
