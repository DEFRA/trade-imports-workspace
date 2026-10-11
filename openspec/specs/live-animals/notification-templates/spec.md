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
Templates MUST be stored by the service and kept between sessions, and the list MUST hold only templates the signed-in user has really saved, newest saved first, with no example templates, no template still being created and never another user's.

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

#### Scenario: A template still being created is not listed
**ID**: SCN-TEMPLATES-003-C
- **GIVEN** the user has named a template and not yet saved it
- **WHEN** their templates are listed
- **THEN** that template is not listed

### Requirement: Manage templates offers Create new template
**ID**: REQ-TEMPLATES-004
The page MUST offer a primary "Create new template" button that opens the question "What are you importing?", and following it MUST store nothing until a form in the journey is submitted.

#### Scenario: Create new template opens the type question
**ID**: SCN-TEMPLATES-004-A
- **GIVEN** the user is on Manage templates
- **WHEN** they select "Create new template"
- **THEN** the question "What are you importing?" is shown

#### Scenario: Leaving after following the button adds nothing
**ID**: SCN-TEMPLATES-004-B
- **GIVEN** the user followed "Create new template" and has submitted nothing
- **WHEN** they return to Manage templates
- **THEN** the count of templates is the same as before
- **AND** none of the user's draft notifications has changed

### Requirement: The template name page asks what the template is called
**ID**: REQ-TEMPLATES-005
The page MUST be titled "Enter template name" with the browser title "Enter template name - Import notification service - GOV.UK" and the caption "Create a new template", MUST ask one text question named by the heading with no hint, and MUST end with "Save and continue" and a "Cancel and return to manage templates" link to Manage templates. It MUST accept a blank name, MUST apply no length, character or duplicate-name rule, and MUST trim spaces around a name.

#### Scenario: The template name page shows its title, caption and controls
**ID**: SCN-TEMPLATES-005-A
- **GIVEN** the user has chosen a type for a new template
- **WHEN** the template name page is shown
- **THEN** the browser title is "Enter template name - Import notification service - GOV.UK"
- **AND** the caption "Create a new template" is shown above the heading "Enter template name"
- **AND** one text input is shown, named by the heading, with no hint
- **AND** the page offers "Save and continue" and the link "Cancel and return to manage templates"
- **AND** the link goes to Manage templates

#### Scenario: Back goes to the type question when a type has been chosen
**ID**: SCN-TEMPLATES-005-B
- **GIVEN** a type has been chosen for the template in progress
- **AND** the template name page is shown
- **WHEN** the user follows Back
- **THEN** the type question is shown

#### Scenario: Back goes to Manage templates when no type has been chosen
**ID**: SCN-TEMPLATES-005-E
- **GIVEN** no type has been chosen
- **AND** the template name page is shown
- **WHEN** the user follows Back
- **THEN** Manage templates is shown

#### Scenario: A blank or padded name moves on to Origin of the import
**ID**: SCN-TEMPLATES-005-C
- **GIVEN** the template name page is shown
- **WHEN** the user selects "Save and continue" with a blank name, or with a name padded with spaces
- **THEN** "Origin of the import" is shown with no error
- **AND** a padded name is shown without the surrounding spaces

#### Scenario: Going back shows the name entered, and a new template starts empty
**ID**: SCN-TEMPLATES-005-D
- **GIVEN** the user has named a template and reached "Origin of the import"
- **WHEN** they follow Back
- **THEN** the template name page shows the name already entered
- **AND** starting another new template shows the name empty

### Requirement: A template is answered on the same journey pages, in template mode
**ID**: REQ-TEMPLATES-006
A template MUST be answered on the same pages as a notification, with the same questions, hints and stored answers and each page's own answer checks, so that a change to a journey page shows in template mode. Each page MUST show a "Template" tag with the template's name above its section caption, and template mode MUST NOT offer the upload documents page or the declaration.

#### Scenario: A template page shows the Template tag and the template's name
**ID**: SCN-TEMPLATES-006-A
- **GIVEN** the user is answering a template
- **WHEN** a journey page is shown
- **THEN** a "Template" tag and the template's name are shown above the section caption

#### Scenario: A template asks the same questions as a notification
**ID**: SCN-TEMPLATES-006-B
- **GIVEN** the user is answering a template
- **WHEN** "Origin of the import" is shown
- **THEN** it asks the same questions with the same hints and guidance as it does for a notification

#### Scenario: A template page refuses a malformed answer
**ID**: SCN-TEMPLATES-006-C
- **GIVEN** the user is answering a template on "Origin of the import"
- **WHEN** they select "Save and continue" with a region code required but empty, a region code over 5 characters, or an internal reference over 58 characters
- **THEN** the page is shown again with an error summary
- **AND** the browser title starts "Error: "

#### Scenario: A template offers no upload documents or declaration
**ID**: SCN-TEMPLATES-006-D
- **GIVEN** the user is answering a template
- **WHEN** they try to open the upload documents page or the declaration for it
- **THEN** the page is not found
- **AND** the run through the pages skips the upload documents page

### Requirement: Starting and naming a template creates no notification
**ID**: REQ-TEMPLATES-007
The system MUST hold a template being created, with its chosen type and name, apart from the user's saved templates, MUST NOT list it on Manage templates until it is first saved, MUST NOT create a draft notification when a template is started or named, and MUST leave the user's draft notifications unchanged.

#### Scenario: Naming a template leaves the draft notifications unchanged
**ID**: SCN-TEMPLATES-007-A
- **GIVEN** the user has chosen a type and named a new template
- **WHEN** "Origin of the import" is shown for the template
- **THEN** no notification reference and no Draft tag are shown
- **AND** the user's draft notifications are the same as before
