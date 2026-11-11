# Service Navigation Specification (INS)

## Purpose

The navigation offered on every signed-in page of the Import Notification Service, and which item it marks as current. Where the Address book item leads is governed by `ins/address-book`, and signing out by `ins/authentication`; this specifies only the items, their order and the current item.

## Requirements

### Requirement: The navigation offers four items in a fixed order
**ID**: REQ-INS-NAV-001
The system MUST offer four items in the service navigation on every signed-in page, in this order: Dashboard, Address book, Manage account, Log out.

#### Scenario: A signed-in user sees the four items in order
**ID**: SCN-INS-NAV-001-A
- **GIVEN** the user is signed in
- **WHEN** they view any page
- **THEN** the navigation offers, in order, Dashboard, Address book, Manage account and Log out

#### Scenario: Following Dashboard from the address book opens the dashboard
**ID**: SCN-INS-NAV-001-B
- **GIVEN** the user is signed in and on the address book
- **WHEN** they follow Dashboard in the navigation
- **THEN** the dashboard is shown

### Requirement: The navigation marks the item for the section the user is in
**ID**: REQ-INS-NAV-002
The system MUST mark Dashboard as the current item on the dashboard and on the notification type question, and Address book as the current item on the address book and on every page under it. It MUST mark no item as current on any other page, and MUST NOT mark Manage account or Log out as current.

#### Scenario: Dashboard is the current item on the dashboard
**ID**: SCN-INS-NAV-002-A
- **GIVEN** the user is on the dashboard
- **WHEN** they view the navigation
- **THEN** Dashboard is the current item

#### Scenario: Dashboard is the current item on the notification type question
**ID**: SCN-INS-NAV-002-B
- **GIVEN** the user is on the notification type question
- **WHEN** they view the navigation
- **THEN** Dashboard is the current item

#### Scenario: Address book is the current item on the address book and an address's own pages
**ID**: SCN-INS-NAV-002-C
- **GIVEN** the user is on the address book or on an address's add, view, edit or delete page
- **WHEN** they view the navigation
- **THEN** Address book is the current item

#### Scenario: No item is current on a page outside both sections
**ID**: SCN-INS-NAV-002-D
- **GIVEN** the user is on a page that is neither in the dashboard nor in the address book, such as an error page
- **WHEN** they view the navigation
- **THEN** no item is the current item
