# Automated Testing Documentation

This document summarizes the automated end-to-end testing suite implemented for the OptimalAI project using Playwright.

## Test Suite Overview

The test suite validates three core user stories as requested. All tests are configured to record video sessions for documentation purposes.

### User Story 25: User Registration
- **Test Case 25.1: Successful Registration**
  - **Goal**: Verify account creation with valid inputs.
  - **Flow**: Navigates to `/register`, fills name, dynamic random email, and password. Clicks register.
  - **Result**: Redirected to `/dashboard` with an active session.
- **Test Case 25.2: Registration Failure (Invalid Email)**
  - **Goal**: Verify validation blocking for improper email format.
  - **Flow**: Bypasses browser validation via `noValidate` attribute to trigger the application's custom React error bar.
  - **Result**: Error message "Enter a valid email address." displayed; remains on `/register`.

### User Story 26: Secure Login and Logout
- **Test Case 26.1: Successful Login**
  - **Goal**: Verify user authentication.
  - **Flow**: Registers a test user via API, then logs in through the UI.
  - **Result**: Redirected to `/dashboard`.
- **Test Case 26.2: Secure Logout**
  - **Goal**: Verify session termination.
  - **Flow**: Logs in, clicks "Sign Out", then attempts to go back to `/dashboard`.
  - **Result**: "Sign Out" redirects to `/login`. Back navigation to `/dashboard` is blocked and redirected to `/login`.

### User Story 22: Dashboard Navigation
- **Test Case 22.1: Verify "Start New Analysis" Routing**
  - **Goal**: Verify instant access to analysis workflow.
  - **Flow**: Navigates from Dashboard to New Analysis via the "New Analysis" button.
  - **Result**: Instantly routes to `/analysis/new` and verifies the product identifier input is visible.

## How to Run Tests

1. Ensure the backend server is running (`python run.py`).
2. Ensure the frontend server is running (`npm run dev`).
3. Run the following command in the `frontend` directory:
   ```bash
   npm run test:e2e
   ```

## Viewing Results and Videos

After execution, you can view the HTML report and recorded videos:
- **HTML Report**: `npx playwright show-report` (run from the `frontend` folder).
- **Recorded Videos**: Located in `frontend/test-results/`.

Videos are saved in `.webm` format for each test case.
