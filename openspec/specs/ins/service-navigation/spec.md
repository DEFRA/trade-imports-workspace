# Service Navigation Specification (INS)

## Purpose

The navigation the Import Notification Service offers on every page, where its items lead and which it marks as current. The Address book pages are in `ins/address-book`; Manage templates is a live animals page (`live-animals/notification-templates`).

## Requirements

### Requirement: The navigation offers five items in a fixed order
**ID**: REQ-INS-NAV-001
The system MUST offer Dashboard, Templates, Address book, Manage account and Log out, in that order, in the service navigation to a signed-in user, and MUST offer none to a visitor who is not signed in.

#### Scenario: The navigation lists its five items on the dashboard
**ID**: SCN-INS-NAV-001-A
- **GIVEN** the user is signed in
- **WHEN** they view the dashboard
- **THEN** the navigation offers, in order, Dashboard, Templates, Address book, Manage account and Log out

#### Scenario: A visitor who is not signed in is offered no navigation items
**ID**: SCN-INS-NAV-001-B
- **GIVEN** the visitor is not signed in
- **WHEN** a page of the service is shown
- **THEN** the service name is shown
- **AND** no navigation item is offered

### Requirement: The Templates item opens Manage templates in the live animals service
**ID**: REQ-INS-NAV-002
The system MUST open the page headed "Manage templates" in the live animals journey when the user follows the Templates item.

#### Scenario: Following Templates opens Manage templates
**ID**: SCN-INS-NAV-002-A
- **GIVEN** the user is signed in
- **WHEN** they follow Templates in the navigation
- **THEN** the page headed "Manage templates" is shown

### Requirement: The navigation marks Dashboard, Templates or Address book as current on its own pages
**ID**: REQ-INS-NAV-003
The system MUST mark Dashboard as the current section on the dashboard and Address book as the current section on the address book and its pages, and MUST mark Templates as the current section on the type question while a template is being created. It MUST NOT mark Templates anywhere else in this service, since Manage templates is not part of it.

#### Scenario: Dashboard is marked current on the dashboard and Templates is not
**ID**: SCN-INS-NAV-003-A
- **GIVEN** the user is on the dashboard
- **WHEN** they view the navigation
- **THEN** Dashboard is marked as the current section
- **AND** Templates is not

#### Scenario: Address book is marked current on the address book and Templates is not
**ID**: SCN-INS-NAV-003-B
- **GIVEN** the user is on the address book
- **WHEN** they view the navigation
- **THEN** Address book is marked as the current section
- **AND** neither Templates nor Dashboard is

#### Scenario: Templates is marked current while creating a template
**ID**: SCN-INS-NAV-003-C
- **GIVEN** the user is on the type question after choosing to create a template
- **WHEN** they view the navigation
- **THEN** Templates is marked as the current section
- **AND** Dashboard is not
