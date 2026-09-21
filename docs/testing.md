# Testing Strategy

This document outlines the testing strategy for the App Ponto project.

## Overview
Given that the application interacts heavily with native device capabilities (Camera) and third-party APIs (OCR/Vision), the testing strategy emphasizes isolation and mocking to ensure that business logic can be tested reliably without needing physical devices or real API calls.

## Testing Layers

### 1. Unit Testing
- **Goal:** Ensure that utility functions (e.g., date parsing, hour calculation) and individual UI components behave as expected.
- **Tools:** Jest and React Native Testing Library.
- **Approach:** 
  - Pure functions that calculate the "bank of hours" are tested with various edge cases (overtime, missing punches, night shifts).
  - UI components are rendered and their states asserted without triggering side effects.

### 2. Integration Testing & Mocks
- **Goal:** Verify that the interaction between the UI, the services layer, and the local database works correctly.
- **Mocks:**
  - **Camera API:** Mocked to return a static URI string simulating a captured photo.
  - **OCR Service:** The Vision API call is intercepted and mocked to return a predefined JSON response containing sample time clock text. This prevents tests from being flaky due to network issues and avoids unnecessary API costs.
  - **Local Database:** An in-memory SQLite database or a mocked AsyncStorage instance is used to verify data persistence without affecting the developer's actual local data.

### 3. Manual E2E Validation
- **Goal:** Ensure the app works smoothly on actual devices.
- **Approach:** Periodic builds deployed via Expo Go to physical iOS and Android devices. Testers take photos of real, printed time clock receipts under various lighting conditions to validate the robustness of the OCR pipeline and the user experience.

## Running Tests
To run the automated test suite locally, use the following command:

```bash
npm test
# or
yarn test
```
