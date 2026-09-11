# High-Risk Plants Authentication Specification

## Purpose

Signing in and out of the high-risk plants notification service, and what an unauthenticated or signed-in user can and cannot see.

## Requirements

### Requirement: Any page of the service requires the user to be signed in
**ID**: REQ-PLANTS-AUTH-001
The system MUST redirect an unauthenticated user to sign in before showing the dashboard or any page of an in-progress notification journey, and MUST return them to the exact page they were trying to reach once they sign in.

#### Scenario: Opening the dashboard unauthenticated requires signing in first
**ID**: SCN-PLANTS-AUTH-001-A
- **GIVEN** the user is not signed in
- **WHEN** they open the notification dashboard
- **THEN** they land on the sign-in page
- **WHEN** they sign in
- **THEN** they arrive at the notification dashboard

#### Scenario: Opening a page deeper in an in-progress journey unauthenticated requires signing in first
**ID**: SCN-PLANTS-AUTH-001-B
- **GIVEN** the user is not signed in, and holds a link to a page further into an in-progress notification journey than its entry page
- **WHEN** they open that page
- **THEN** they land on the sign-in page
- **WHEN** they sign in
- **THEN** they arrive at that same page, not the dashboard or the journey's entry page

### Requirement: Invalid sign-in credentials show one generic error, without saying which field was wrong
**ID**: REQ-PLANTS-AUTH-002
The system MUST reject sign-in with an invalid customer reference number or an invalid password with the same generic error message, MUST NOT reveal which of the two was wrong, and MUST keep the user on the sign-in page.

#### Scenario: An invalid customer reference number or an invalid password are both rejected the same way
**ID**: SCN-PLANTS-AUTH-002-A
- **GIVEN** the user is on the sign-in page
- **WHEN** they submit either an invalid customer reference number with a valid password, or a valid customer reference number with an invalid password
- **THEN** they remain on the sign-in page
- **AND** the same error is shown, asking for a valid 10-digit customer reference number and password

### Requirement: Signing out ends the session and requires signing in again to return
**ID**: REQ-PLANTS-AUTH-003
The system MUST show a sign-out confirmation once the user signs out, and MUST require signing in again before the dashboard can be reopened.

#### Scenario: Signing out shows a confirmation and locks the dashboard again
**ID**: SCN-PLANTS-AUTH-003-A
- **GIVEN** the user is signed in
- **WHEN** they sign out
- **THEN** a sign-out confirmation page is shown
- **WHEN** they then try to reopen the notification dashboard
- **THEN** they land on the sign-in page again

### Requirement: No signed-in user identity is shown anywhere in the service
**ID**: REQ-PLANTS-AUTH-004
The system MUST NOT display the signed-in user's identity (such as an email address) anywhere in the service once they are signed in.

#### Scenario: The dashboard shows no identity for the signed-in user
**ID**: SCN-PLANTS-AUTH-004-A
- **GIVEN** the user has just signed in
- **WHEN** they view the notification dashboard
- **THEN** no signed-in user identity is shown anywhere on the page
