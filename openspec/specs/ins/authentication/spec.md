# INS Authentication Specification

## Purpose

Signing in to the Import Notification Service, and what an unauthenticated user reaching one of its pages gets instead.

## Requirements

### Requirement: Any INS page requires the user to be signed in, and returns them to the page they were headed to
**ID**: REQ-INS-AUTH-001
The system MUST redirect an unauthenticated user to sign in before showing the address book or any page within the Import Notification Service, and MUST return them to the exact page they were trying to reach once they sign in.

#### Scenario: The address book list renders once signed in
**ID**: SCN-INS-AUTH-001-A
- **GIVEN** the user is signed in
- **WHEN** they open the address book
- **THEN** it shows the address book list, with no error

#### Scenario: Opening a page past the list unauthenticated requires signing in first
**ID**: SCN-INS-AUTH-001-B
- **GIVEN** the user is not signed in, and holds a link to a page past the address book's own list page
- **WHEN** they open that page
- **THEN** they land on the sign-in page
- **WHEN** they sign in
- **THEN** they arrive at that same page, not the address book list

### Requirement: The INS sign-in session lives alongside the animals and plants services' own, in one browser
**ID**: REQ-INS-AUTH-002
The system MUST keep the Import Notification Service's sign-in session in a cookie of its own, so that a user signed in to the live animals service, the Import Notification Service and the high-risk plants service in one browser stays signed in to all three, and signing in to one MUST NOT end the session another holds.

#### Scenario: Signing in to animals, then INS, then plants keeps all three sessions
**ID**: SCN-INS-AUTH-002-A
- **GIVEN** a browser signed in to none of the services
- **WHEN** the user signs in to the live animals service, then the Import Notification Service, then the high-risk plants service
- **THEN** each service's dashboard opens again without asking them to sign in
- **AND** the browser holds a separate sign-in cookie for each of the three services
