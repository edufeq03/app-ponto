# Product Requirements & Business Logic

This document details the core product requirements and the business logic implemented in App Ponto.

## Business Problem
In many corporate environments, specifically where the author previously worked, the internal tracking of employee hours (bank of hours) can be imprecise, obscure, or hard to reconcile. Employees usually receive printed paper receipts from electronic time clocks, but keeping track of them manually is tedious and error-prone. This creates friction and a lack of trust between the employee and the employer's HR system.

## The Solution
App Ponto empowers employees to effortlessly track their own hours. By simply taking a photo of the time clock receipt, the application automatically extracts the timestamp, calculates the hours worked for the day, and maintains a precise historical record.

## Key Product Requirements

### 1. Frictionless Data Entry
- **Requirement:** The user must not be required to manually type in dates and times.
- **Implementation:** Integration with the device camera and an OCR (Optical Character Recognition) service to scan and parse the standard format of Brazilian time clock receipts.

### 2. Privacy & Data Ownership
- **Requirement:** The employee's data must remain their own property and should not be uploaded to an external employer server.
- **Implementation:** The application is completely local. All data, including the extracted text and the history of hours, is stored on the device's local database.

### 3. Automatic Calculation
- **Requirement:** The app should calculate the daily balance automatically.
- **Implementation:** Once the entry and exit times are extracted from the receipt, the app calculates the total hours worked, subtracts the standard workday hours, and updates the net bank of hours.

## Future Product Evolutions
- Export functionality (PDF or CSV) to send to HR during disputes.
- Notification reminders for clocking in/out.
- Cloud synchronization via a personal account (e.g., Firebase) to prevent data loss if the device is lost, while still keeping data private from the employer.
