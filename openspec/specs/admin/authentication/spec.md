# Admin Authentication Specification

## Purpose

Signing in and out of the admin operator interface, and what it shows about the signed-in user.

## Requirements

### Requirement: Any admin page requires the user to be signed in
The system MUST redirect an unauthenticated user to sign in before showing the admin dashboard or any admin page, and MUST return them to the exact page they were trying to reach once they sign in.

#### Scenario: Opening the admin dashboard unauthenticated requires signing in first
- **GIVEN** the user is not signed in
- **WHEN** they open the admin dashboard
- **THEN** they land on the sign-in page
- **WHEN** they sign in
- **THEN** they arrive at the admin dashboard

#### Scenario: Opening a deeper admin page unauthenticated requires signing in first
- **GIVEN** the user is not signed in, and holds a link to an admin page other than the dashboard (for example, the notifications page)
- **WHEN** they open that page
- **THEN** they land on the sign-in page
- **WHEN** they sign in
- **THEN** they arrive at that same page, not the admin dashboard

### Requirement: Empty or invalid sign-in credentials show one generic error
The system MUST reject sign-in with empty or invalid credentials with the same generic error message, and MUST keep the user on the sign-in page.

#### Scenario: Empty credentials, or an empty password alone, are both rejected the same way
- **GIVEN** the user is on the sign-in page
- **WHEN** they submit with both fields empty, or with a valid customer reference number but an empty password
- **THEN** they remain on the sign-in page
- **AND** the same error is shown, asking for a valid 10-digit customer reference number and password

### Requirement: Signing out ends the session and requires signing in again to return
The system MUST show a sign-out confirmation once the user signs out, and MUST require signing in again before the admin dashboard can be reopened.

#### Scenario: Signing out shows a confirmation and locks the admin dashboard again
- **GIVEN** the user is signed into the admin interface
- **WHEN** they sign out
- **THEN** a sign-out confirmation page is shown
- **WHEN** they then try to reopen the admin dashboard
- **THEN** they land on the sign-in page again

### Requirement: The admin dashboard shows the signed-in user's identity
The system MUST display the signed-in user's identity on the admin dashboard, unlike the public-facing live-animals service, which deliberately shows none.

#### Scenario: The admin dashboard shows who is signed in
- **GIVEN** the user has just signed into the admin interface
- **WHEN** they view the admin dashboard
- **THEN** their signed-in identity is shown on the page
