# Service Navigation Specification

## Purpose

The persistent navigation offered on every page of the service, and which section it marks as current. Signing out and showing no signed-in identity are governed by `live-animals/authentication`; this specifies only that the navigation offers the route to it. The Templates item leads to Manage templates, specified in `live-animals/notification-templates`.

## Requirements

### Requirement: The navigation offers the same five items throughout the service
**ID**: REQ-NAV-001
The system MUST offer five items in the service navigation on every page a signed-in user sees, in this order: Dashboard, Templates, Address book, Manage account and Log out, and MUST offer none to a visitor who is not signed in.

#### Scenario: The navigation lists its five items on the dashboard
**ID**: SCN-NAV-001-A
- **GIVEN** the user is signed in
- **WHEN** they view the dashboard
- **THEN** the navigation offers, in order, Dashboard, Templates, Address book, Manage account and Log out

#### Scenario: A visitor who is not signed in is offered no navigation items
**ID**: SCN-NAV-001-B
- **GIVEN** the visitor is not signed in
- **WHEN** a page of the service is shown
- **THEN** the service name is shown
- **AND** no navigation item is offered

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

### Requirement: The navigation marks Templates as the current section on every templates page
**ID**: REQ-NAV-004
The system MUST mark the Templates item as the current section on Manage templates and every page under it, and MUST NOT mark Dashboard or Address book there; elsewhere Templates MUST NOT be marked.

#### Scenario: Templates is marked current on Manage templates
**ID**: SCN-NAV-004-A
- **GIVEN** the user is signed in
- **WHEN** they open Manage templates
- **THEN** Templates is marked as the current section
- **AND** neither Dashboard nor Address book is marked

#### Scenario: Templates is not marked current on the dashboard
**ID**: SCN-NAV-004-B
- **GIVEN** the user is on the dashboard
- **WHEN** they view the navigation
- **THEN** Dashboard is marked as the current section
- **AND** Templates is not

#### Scenario: Templates is marked current while creating a template
**ID**: SCN-NAV-004-C
- **GIVEN** the user is creating a template
- **WHEN** the template name page or "Origin of the import" for the template is shown
- **THEN** Templates is marked as the current section
- **AND** Dashboard is not

### Requirement: The Templates item opens Manage templates
**ID**: REQ-NAV-005
The system MUST open the Manage templates page when the user follows the Templates item.

#### Scenario: Following Templates opens Manage templates
**ID**: SCN-NAV-005-A
- **GIVEN** the user is signed in
- **WHEN** they follow Templates in the navigation
- **THEN** the page headed "Manage templates" is shown

### Requirement: The Address book item opens the Import Notification Service address book
**ID**: REQ-NAV-006
The system MUST open the Import Notification Service's address book when the user follows the Address book item.

#### Scenario: Following Address book opens the INS address book
**ID**: SCN-NAV-006-A
- **GIVEN** the user is signed in and on the live animals dashboard
- **WHEN** they follow Address book in the navigation
- **AND** they complete sign-in to the Import Notification Service if it asks
- **THEN** the Import Notification Service address book is shown
