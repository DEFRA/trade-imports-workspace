# INS Authentication Specification

## Purpose

Signing in to the Import Notification Service, and what an unauthenticated user reaching one of its pages gets instead. It also covers a hidden sign-in through the real Defra ID (IDM). That sign-in shows what IDM returns, and never signs anyone in to the service.

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

### Requirement: A hidden sign-in through the real Defra ID shows what it returned, and leaves the service's own sign-in alone
**ID**: REQ-INS-AUTH-003
The Import Notification Service MUST offer a sign-in through the real Defra ID (IDM) only when IDM is configured, and MUST NOT link to it from any other page. After that sign-in, the service MUST show what IDM returned. It MUST NOT let the IDM identity reach any other page of the service, which keeps its own sign-in and that sign-in's data.

#### Scenario: Without IDM configured, the IDM sign-in pages do not exist
**ID**: SCN-INS-AUTH-003-A
- **GIVEN** the service has no IDM discovery URL configured
- **WHEN** someone opens the IDM sign-in start page, its callback, its signed-in page or its signed-out page
- **THEN** each one answers page not found

#### Scenario: The start page's button starts the sign-in at IDM
**ID**: SCN-INS-AUTH-003-B
- **GIVEN** IDM is configured
- **WHEN** someone opens the IDM sign-in start page
- **THEN** it shows a button to sign in with Defra ID
- **WHEN** they choose the button
- **THEN** their browser goes to IDM's sign-in, naming the service's IDM client, its service ID and the CP-Dev sign-up and sign-in policy
- **AND** it asks IDM to return them to the callback IDM has registered for the service

#### Scenario: A completed IDM sign-in shows the ID token claims, the access token claims and the token response
**ID**: SCN-INS-AUTH-003-C
- **GIVEN** IDM has returned the user to the service with an ID token that verifies against IDM's published keys, client and issuer
- **WHEN** the signed-in page opens
- **THEN** it lists every ID token claim with its value
- **AND** it lists every access token claim, or says the access token is the ID token when the two are the same
- **AND** it shows the token response: the expiry, the scope, and whether a refresh token came back

#### Scenario: The IDM identity never reaches the rest of the service
**ID**: SCN-INS-AUTH-003-D
- **GIVEN** the user is signed in to the Import Notification Service through its own sign-in
- **WHEN** they complete the IDM sign-in
- **THEN** their service session is unchanged
- **AND** no service sign-in cookie is set or cleared

#### Scenario: An error from IDM shows a generic page with a link to try again
**ID**: SCN-INS-AUTH-003-E
- **GIVEN** IDM returns the user with an error, or with an ID token that does not verify
- **WHEN** they arrive back at the service
- **THEN** the page says the service is unable to sign them in, with a link to try again that opens the IDM sign-in start page
- **AND** it shows none of the error's details
- **AND** the error is logged in full

#### Scenario: The signed-in page with no IDM sign-in starts one
**ID**: SCN-INS-AUTH-003-F
- **GIVEN** the user has not completed an IDM sign-in in this browser session
- **WHEN** they open the IDM signed-in page
- **THEN** they are taken to the IDM sign-in start page

#### Scenario: The signed-out page needs no sign-in
**ID**: SCN-INS-AUTH-003-G
- **GIVEN** IDM is configured
- **WHEN** someone opens the page IDM returns to after signing out
- **THEN** it says they have signed out

#### Scenario: An error IDM sends to the signed-out page shows the generic page, not signed out
**ID**: SCN-INS-AUTH-003-H
- **GIVEN** IDM refuses a sign-in and returns the user to the signed-out page with an error
- **WHEN** they arrive back at the service
- **THEN** the page says the service is unable to sign them in, with a link to try again that opens the IDM sign-in start page
- **AND** it shows none of the error's details
- **AND** the error is logged in full
