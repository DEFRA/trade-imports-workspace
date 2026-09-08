# Service Navigation Specification

## Purpose

The persistent navigation offered on every page of the service, and which section it marks as current. Signing out and showing no signed-in identity are governed by `live-animals/authentication`; this specifies only that the navigation offers the route to it.

## Requirements

### Requirement: The navigation offers the same four items throughout the service
The system MUST offer four items in the service navigation on every page: a link to the dashboard, a link to the address book, an option to manage the account, and a way to sign out.

#### Scenario: The navigation lists its four items on the dashboard
- **GIVEN** the user is signed in
- **WHEN** they view the dashboard
- **THEN** the navigation offers a link to the dashboard, a link to the address book, an option to manage the account, and a way to sign out

### Requirement: The navigation marks the dashboard as the current section throughout, including inside a notification
The system MUST mark the dashboard item as the current section whenever the user is on the dashboard or anywhere inside a notification journey.

#### Scenario: The dashboard is marked current from the dashboard itself
- **GIVEN** the user is on the dashboard
- **WHEN** they view the navigation
- **THEN** the dashboard item is marked as the current section

#### Scenario: The dashboard stays marked current from inside a notification
- **GIVEN** the user is working on a notification
- **WHEN** they view the navigation
- **THEN** the dashboard item is still marked as the current section

### Requirement: The navigation offers a route back to the dashboard from inside a notification
The system MUST return the user to the dashboard when they follow the dashboard item from inside a notification.

#### Scenario: Following the dashboard item from inside a notification opens the dashboard
- **GIVEN** the user is working on a notification
- **WHEN** they follow the dashboard item in the navigation
- **THEN** the dashboard is shown
