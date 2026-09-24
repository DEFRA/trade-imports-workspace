# Service Navigation Specification

## Purpose

The persistent navigation offered on every page of the service, and which section it marks as current. Signing out and showing no signed-in identity are governed by `live-animals/authentication`; this specifies only that the navigation offers the route to it.
When more than one obligation set is served from the same app, dashboard and service-name destinations are evaluated for the set the user is in.

## Requirements

### Requirement: The navigation offers the same four items throughout the service
**ID**: REQ-NAV-001
The system MUST offer four items in the service navigation on every page: a link to the dashboard, a link to the address book, an option to manage the account, and a way to sign out.

#### Scenario: The navigation lists its four items on the dashboard
**ID**: SCN-NAV-001-A
- **GIVEN** the user is signed in
- **WHEN** they view the dashboard
- **THEN** the navigation offers a link to the dashboard, a link to the address book, an option to manage the account, and a way to sign out

### Requirement: The navigation marks the dashboard as the current section throughout, including inside a notification
**ID**: REQ-NAV-002
The system MUST mark the dashboard item as the current section whenever the user is on the dashboard or anywhere inside a notification journey.

#### Scenario: The dashboard is marked current from the dashboard itself
**ID**: SCN-NAV-002-A
- **GIVEN** the user is on the dashboard
- **WHEN** they view the navigation
- **THEN** the dashboard item is marked as the current section

#### Scenario: The dashboard stays marked current from inside a notification
**ID**: SCN-NAV-002-B
- **GIVEN** the user is working on a notification
- **WHEN** they view the navigation
- **THEN** the dashboard item is still marked as the current section

### Requirement: The navigation offers a route back to the dashboard from inside a notification
**ID**: REQ-NAV-003
The system MUST return the user to the dashboard when they follow the dashboard item from inside a notification.

#### Scenario: Following the dashboard item from inside a notification opens the dashboard
**ID**: SCN-NAV-003-A
- **GIVEN** the user is working on a notification
- **WHEN** they follow the dashboard item in the navigation
- **THEN** the dashboard is shown

### Requirement: Dashboard navigation stays on the current set's URL prefix
**ID**: REQ-NAV-004
When the live-animals set is mounted under its own URL prefix, the system MUST make the dashboard item (and the service name link) target that set's dashboard URL, not the site root alone, and MUST keep the user on that prefix when they follow the dashboard item from inside a notification.

#### Scenario: Following the dashboard item from inside a notification stays on the set prefix
**ID**: SCN-NAV-004-A
- **GIVEN** the user is working on a live-animals notification under that set's URL prefix
- **WHEN** they follow the dashboard item in the navigation
- **THEN** they arrive at the live-animals dashboard rather than the service root

#### Scenario: Following the service name from inside a notification stays on the set prefix
**ID**: SCN-NAV-004-B
- **GIVEN** the user is working on a live-animals notification under that set's URL prefix
- **WHEN** they follow the service name link in the header
- **THEN** they arrive at the live-animals dashboard rather than the service root
