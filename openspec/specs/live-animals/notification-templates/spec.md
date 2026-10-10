# Notification Templates Specification

## Purpose

Lets a signed-in importer or agent keep notification templates — saved sets of notification answers — and manage them from the Manage templates page. A user's templates are their own and are kept between sessions; the page's place in the service navigation is in `live-animals/service-navigation`.

## Requirements

### Requirement: The Manage templates page introduces the user's templates
**ID**: REQ-TEMPLATES-001
The page MUST be titled "Manage templates", with the browser title "Manage templates - Import notification service - GOV.UK", MUST show the line "Select, manage or create new notification templates" under its heading, MUST start with its heading with no Back link, and MUST show the Alpha phase banner whose feedback link goes to the service's feedback address.

#### Scenario: A signed-in user opens Manage templates
**ID**: SCN-TEMPLATES-001-A
- **GIVEN** the user is signed in
- **WHEN** they open Manage templates
- **THEN** the browser title reads "Manage templates - Import notification service - GOV.UK"
- **AND** the page heading reads "Manage templates"
- **AND** the line "Select, manage or create new notification templates" is shown under it

#### Scenario: Manage templates offers no Back link
**ID**: SCN-TEMPLATES-001-B
- **GIVEN** the user is signed in
- **WHEN** they open Manage templates
- **THEN** the page starts with its heading
- **AND** no Back link is offered

#### Scenario: Manage templates shows the Alpha phase banner
**ID**: SCN-TEMPLATES-001-C
- **GIVEN** the user is signed in
- **WHEN** they open Manage templates
- **THEN** the Alpha phase banner reads "This is a new service. Help us improve it and give your feedback by email."
- **AND** its feedback link goes to the same feedback email address the service's other pages use

### Requirement: The page lists the user's templates under "My templates" with a results count
**ID**: REQ-TEMPLATES-002
The page MUST list the user's saved templates under the heading "My templates", MUST show a results count reading "Show 0 of 0 results" when there are none and "Show 1-N of N results" for N templates, all on one page, and MUST offer no filter, search, "Sort by" control or pagination control.

#### Scenario: A user with no saved templates sees a zero count and an empty list
**ID**: SCN-TEMPLATES-002-A
- **GIVEN** the user has saved no templates
- **WHEN** they open Manage templates
- **THEN** the heading "My templates" is shown
- **AND** the count reads "Show 0 of 0 results"
- **AND** no template is listed and no empty-state message is shown

#### Scenario: Manage templates offers no filter, search, sort or pagination
**ID**: SCN-TEMPLATES-002-B
- **GIVEN** the user is signed in
- **WHEN** they open Manage templates
- **THEN** no filter, no search box, no "Sort by" control and no pagination control is offered

### Requirement: A user's templates are their own and are kept between sessions
**ID**: REQ-TEMPLATES-003
Templates MUST be stored by the service and kept between sessions, and the list MUST hold only templates the signed-in user has really saved, newest saved first, with no example templates and never another user's.

#### Scenario: A user who has never saved a template sees no examples
**ID**: SCN-TEMPLATES-003-A
- **GIVEN** the user has never saved a template
- **WHEN** their templates are listed
- **THEN** no template is listed

#### Scenario: Only the user's own templates are listed, newest first
**ID**: SCN-TEMPLATES-003-B
- **GIVEN** the user has saved two templates and another user has saved one
- **WHEN** the user's templates are listed
- **THEN** only the user's two templates are listed, the newer first
