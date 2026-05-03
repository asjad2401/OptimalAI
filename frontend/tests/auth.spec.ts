import { test, expect } from '@playwright/test';

// Generate a random email for the registration test to prevent duplicate user errors
const randomId = Math.random().toString(36).substring(2, 10);
const validTestEmail = `testuser_${randomId}@example.com`;
const validTestPassword = 'SecurePassword123!';

test.describe('User Story 25: User Registration', () => {
  test('Test Case 25.1: Successful Registration with Valid Data', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/register');

    // Enter a valid string in the "Name" field
    await page.fill('input#reg-name', 'Jane Doe');

    // Enter a valid, unregistered email address
    await page.fill('input#reg-email', validTestEmail);

    // Enter a secure password
    await page.fill('input#reg-password', validTestPassword);

    // Click the "Register" submit button
    await page.click('button[type="submit"]');

    // Verify system processes request, creates account, and redirects to Dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Verify an active session by checking if "Sign Out" or user email is visible
    await expect(page.locator('.app-shell-user-email')).toBeVisible();
    await expect(page.locator('button.app-shell-signout')).toBeVisible();
  });

  test('Test Case 25.2: Registration Failure with Invalid Email Format', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/register');

    // Enter a valid name in the "Name" field
    await page.fill('input#reg-name', 'John Doe');

    // Enter an improperly formatted string in the "Email" field
    await page.fill('input#reg-email', 'invalid-email-format');

    // Enter a secure password
    await page.fill('input#reg-password', 'Password123!');

    // Disable browser validation to trigger our custom error bar
    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) form.setAttribute('novalidate', 'novalidate');
    });

    // Click the "Register" submit button
    await page.click('button[type="submit"]');

    // Verify system blocks submission and displays a validation error message
    const errorBar = page.locator('.error-bar');
    await expect(errorBar).toBeVisible();
    await expect(errorBar).toContainText(/valid email/i);

    // Verify user remains on the Registration page
    await expect(page).toHaveURL(/\/register/);
  });
});

test.describe('User Story 26: Secure Login and Logout', () => {
  // Use the credentials generated in the previous test suite for login
  test('Test Case 26.1: Successful User Login', async ({ page }) => {
    // Register a user first to guarantee existence
    const loginTestEmail = `logintest_${Math.random().toString(36).substring(2, 10)}@example.com`;
    
    // Pre-condition: Create the account via API
    const response = await page.request.post('http://127.0.0.1:8000/api/v1/auth/register', {
      data: {
        email: loginTestEmail,
        full_name: 'Login Test User',
        password: validTestPassword
      }
    });
    expect(response.ok()).toBeTruthy();

    // Navigate to login page
    await page.goto('/login');

    // Enter the registered email address
    await page.fill('input#login-email', loginTestEmail);

    // Enter the correct associated password
    await page.fill('input#login-password', validTestPassword);

    // Click the "Login" button
    await page.click('button[type="submit"]');

    // Verify system authenticates and redirects user to Dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('.app-shell-user-email')).toHaveText(loginTestEmail);
  });

  test('Test Case 26.2: Secure User Logout', async ({ page }) => {
    // Register a user first to guarantee existence
    const logoutTestEmail = `logouttest_${Math.random().toString(36).substring(2, 10)}@example.com`;
    
    await page.request.post('http://localhost:8000/api/v1/auth/register', {
      data: {
        email: logoutTestEmail,
        full_name: 'Logout Test User',
        password: validTestPassword
      }
    });

    // Login manually to set up state
    await page.goto('/login');
    await page.fill('input#login-email', logoutTestEmail);
    await page.fill('input#login-password', validTestPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);

    // Locate the "Logout" button (Sign Out in UI)
    const signOutBtn = page.locator('button.app-shell-signout');
    
    // Click the "Logout" button
    await signOutBtn.click();

    // Verify system terminates session and redirects to public Login page
    await expect(page).toHaveURL(/\/login/);

    // Attempt to access Dashboard again via direct URL (simulating Back arrow)
    await page.goto('/dashboard');

    // Verify pressing "Back" arrow does not grant access
    await expect(page).toHaveURL(/\/login/);
  });
});
