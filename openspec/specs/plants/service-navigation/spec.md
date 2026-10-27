# Service Navigation Specification (plants)

## Purpose

The navigation the high-risk plants service offers on every page, where its items lead and which it marks as current. Plants has no templates of its own; its Templates item leads to the live animals service's Manage templates.

## Requirements

### Requirement: The navigation offers five items in a fixed order
**ID**: REQ-PLANTS-NAV-001
The system MUST offer Dashboard, Templates, Address book, Manage account and Log out, in that order, in the service navigation to a signed-in user, and MUST offer none to a visitor who is not signed in.

#### Scenario: The navigation lists its five items on the dashboard
**ID**: SCN-PLANTS-NAV-001-A
- **GIVEN** the user is signed in
- **WHEN** they view the dashboard
- **THEN** the navigation offers, in order, Dashboard, Templates, Address book, Manage account and Log out

#### Scenario: A visitor who is not signed in is offered no navigation items
**ID**: SCN-PLANTS-NAV-001-B
- **GIVEN** the visitor is not signed in
- **WHEN** a page of the service is shown
- **THEN** the service name is shown
- **AND** no navigation item is offered

### Requirement: The Templates item opens Manage templates in the live animals service
**ID**: REQ-PLANTS-NAV-002
The system MUST open the page headed "Manage templates" in the live animals journey when the user follows the Templates item.

#### Scenario: Following Templates opens Manage templates
**ID**: SCN-PLANTS-NAV-002-A
- **GIVEN** the user is signed in
- **WHEN** they follow Templates in the navigation
- **THEN** the page headed "Manage templates" is shown

### Requirement: The navigation marks Dashboard as current on the dashboard and inside a notification, and never Templates
**ID**: REQ-PLANTS-NAV-003
The system MUST mark Dashboard as the current section on the dashboard and anywhere inside a notification, and MUST NOT mark Templates, since no templates page is part of this service.

#### Scenario: Dashboard is marked current on the dashboard and Templates is not
**ID**: SCN-PLANTS-NAV-003-A
- **GIVEN** the user is on the dashboard
- **WHEN** they view the navigation
- **THEN** Dashboard is marked as the current section
- **AND** Templates is not

#### Scenario: Dashboard stays marked current inside a notification
**ID**: SCN-PLANTS-NAV-003-B
- **GIVEN** the user is working on a notification
- **WHEN** they view the navigation
- **THEN** Dashboard is marked as the current section
- **AND** Templates is not

### Requirement: The Dashboard and Address book items lead to the plants dashboard and the INS address book
**ID**: REQ-PLANTS-NAV-004
The system MUST open the high-risk plants dashboard when the user follows Dashboard, including from inside a notification, and MUST open the Import Notification Service's address book when they follow Address book.

#### Scenario: Following Dashboard from inside a notification opens the plants dashboard
**ID**: SCN-PLANTS-NAV-004-A
- **GIVEN** the user is working on a notification
- **WHEN** they follow Dashboard in the navigation
- **THEN** the plants dashboard is shown

#### Scenario: Following Address book opens the INS address book
**ID**: SCN-PLANTS-NAV-004-B
- **GIVEN** the user is signed in
- **WHEN** they follow Address book in the navigation
- **THEN** the Import Notification Service address book is shown
