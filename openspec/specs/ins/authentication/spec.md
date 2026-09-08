# INS Authentication Specification

## Purpose

Signing in to the Import Notification Service, and what an unauthenticated user reaching one of its pages gets instead.

## Requirements

### Requirement: Any INS page requires the user to be signed in, and returns them to the page they were headed to
The system MUST redirect an unauthenticated user to sign in before showing the address book or any page within the Import Notification Service, and MUST return them to the exact page they were trying to reach once they sign in.

#### Scenario: The address book list renders once signed in
- **GIVEN** the user is signed in
- **WHEN** they open the address book
- **THEN** it shows the address book list, with no error

#### Scenario: Opening a page past the list unauthenticated requires signing in first
- **GIVEN** the user is not signed in, and holds a link to a page past the address book's own list page
- **WHEN** they open that page
- **THEN** they land on the sign-in page
- **WHEN** they sign in
- **THEN** they arrive at that same page, not the address book list
