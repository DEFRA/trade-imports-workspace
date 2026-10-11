# Notification Templates Specification

## Purpose

Lets a signed-in importer or agent keep notification templates — saved sets of notification answers — and manage them from the Manage templates page. A user's templates are their own and are kept between sessions; the page's place in the service navigation is in `live-animals/service-navigation`. While a template is being created, the Overview is the template's task list. A template being created ends on the template review, the notification review in template mode, whose Save template saves it. Saving a template confirms it once with a success banner and lists it first.

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

#### Scenario: Of two templates saved one after the other, the later is listed first
**ID**: SCN-TEMPLATES-003-D
- **GIVEN** the user started a template, then started a second, saved the second and then saved the first
- **WHEN** their templates are listed
- **THEN** the first-started template is listed above the second

#### Scenario: A saved template is still listed after signing out and back in
**ID**: SCN-TEMPLATES-003-E
- **GIVEN** the user has saved a template
- **WHEN** they sign out, sign back in and open Manage templates
- **THEN** the template is listed

#### Scenario: Another user neither sees nor opens a user's template
**ID**: SCN-TEMPLATES-003-F
- **GIVEN** a user has saved a template
- **WHEN** another signed-in user opens Manage templates
- **THEN** the template is not listed
- **AND** opening the template's address does not show the template

#### Scenario: A saved template is never listed among the user's notifications
**ID**: SCN-TEMPLATES-003-G
- **GIVEN** the user has saved a template
- **WHEN** they open their notification dashboard
- **THEN** the template is not listed among their notifications

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

### Requirement: While a template is being created, the Overview is the template's task list
**ID**: REQ-TEMPLATES-008
The template's Overview MUST show the heading "Overview", a grey "Template" tag with the template's name in place of the draft status and reference, the "Your commodities" totals for animals and packages (0 and 0 before any are entered) and the list heading "Template tasklist".

#### Scenario: The template's Overview shows the Template tag and name and the Template tasklist
**ID**: SCN-TEMPLATES-008-A
- **GIVEN** the user is creating a template
- **WHEN** the template's Overview is shown
- **THEN** the heading "Overview" is shown
- **AND** a "Template" tag and the template's name are shown in place of the draft status and the notification reference
- **AND** the "Your commodities" totals read 0 animals and 0 packages
- **AND** the list is headed "Template tasklist", not "Notification tasklist"

### Requirement: The template's task list has five sections and no documents
**ID**: REQ-TEMPLATES-009
The template's task list MUST group the tasks under "1. About the consignment", "2. Description of the goods", "3. Transport and arrival", "4. Consignment parties" and "5. Contact address", with no Documents section and no "Upload documents" task, and nothing on the page MUST link to Upload documents or the declaration.

#### Scenario: The template's task list has five sections and no Documents
**ID**: SCN-TEMPLATES-009-A
- **GIVEN** the user is creating a template
- **WHEN** the template's Overview is shown
- **THEN** the sections read "1. About the consignment", "2. Description of the goods", "3. Transport and arrival", "4. Consignment parties" and "5. Contact address"
- **AND** no Documents section and no "Upload documents" task is shown
- **AND** nothing on the page links to Upload documents or the declaration

### Requirement: The template's tasks are the notification's tasks
**ID**: REQ-TEMPLATES-010
The template's task list MUST show the notification task list's own tasks, titles and hints for the same answers, each tagged "Complete" in green when answered and "To do" in blue otherwise, and each opening its question page for the template.

#### Scenario: The template's tasks are the notification's tasks, tagged Complete or To do, each opening within the template
**ID**: SCN-TEMPLATES-010-A
- **GIVEN** the user is creating a template and has answered Origin of the import and "What are you importing?"
- **WHEN** the template's Overview is shown
- **THEN** it lists the tasks the notification task list lists for the same answers, apart from "Upload documents"
- **AND** the answered tasks are tagged "Complete" and the others "To do"
- **AND** the "Roles and addresses" task alone carries its hint, as on the notification task list
- **AND** each task opens its question page for the template

### Requirement: The template's task list ends with Review template and Return to manage templates
**ID**: REQ-TEMPLATES-011
The template's task list MUST end with a primary "Review template" button to the template review and a secondary "Return to manage templates" button to Manage templates, and MUST NOT offer "Save template".

#### Scenario: The template's task list ends with Review template and Return to manage templates
**ID**: SCN-TEMPLATES-011-A
- **GIVEN** the user is creating a template
- **WHEN** the template's Overview is shown
- **THEN** it ends with the primary button "Review template" and the secondary button "Return to manage templates"
- **AND** "Return to manage templates" opens Manage templates
- **AND** no "Save template" button is offered

### Requirement: 'What are you importing?' is asked in template mode and returns to the template's task list
**ID**: REQ-TEMPLATES-012
While a template is being created, "What are you importing?" MUST show the "Template" tag and the template's name and MUST have a Back link to Origin of the import. It MUST offer "Save and continue", "Save and return to overview" and a "Cancel and return to overview" link to the template's task list, and "Save and continue" MUST return to the template's task list.

#### Scenario: What are you importing? in template mode shows the Template tag, Back to Origin and all three controls
**ID**: SCN-TEMPLATES-012-A
- **GIVEN** the user is creating a template and has answered Origin of the import
- **WHEN** "What are you importing?" is shown
- **THEN** a "Template" tag and the template's name are shown
- **AND** the Back link goes to Origin of the import
- **AND** "Save and continue", "Save and return to overview" and the link "Cancel and return to overview" are offered
- **AND** the link goes to the template's task list

#### Scenario: Saving What are you importing? returns to the template's task list
**ID**: SCN-TEMPLATES-012-B
- **GIVEN** the user is creating a template and has chosen a species on "What are you importing?"
- **WHEN** they select "Save and continue"
- **THEN** the template's task list is shown

### Requirement: The template review is titled "Review your template" and shows no errors
**ID**: REQ-TEMPLATES-013
"Review template" MUST open the review page with the browser title "Review your template - Import notification service - GOV.UK" and the heading "Review your template" under the "Template" tag and the template's name, and MUST show no error summary and no error on any card, however much of the template is answered.

#### Scenario: Review template opens Review your template under the Template tag and name, with no errors
**ID**: SCN-TEMPLATES-013-A
- **GIVEN** the user is creating a template and is on its task list
- **WHEN** they select "Review template"
- **THEN** the page is titled "Review your template" with the browser title "Review your template - Import notification service - GOV.UK"
- **AND** a "Template" tag and the template's name are shown
- **AND** no error summary and no card error is shown

### Requirement: The template review shows the template task list's five sections
**ID**: REQ-TEMPLATES-014
The template review MUST show "1. About the consignment", "2. Description of the goods", "3. Transport and arrival", "4. Consignment parties" and "5. Contact address", the template task list's sections, with no uploaded documents section and no "Arrival date at port of entry" row, and MUST read "Not applicable" for every unanswered row.

#### Scenario: The template review shows five sections, no documents or arrival date, and Not applicable for unanswered rows
**ID**: SCN-TEMPLATES-014-A
- **GIVEN** the user is creating a template and has answered only some questions
- **WHEN** they open the template review
- **THEN** the five sections of the template's task list are shown, in order
- **AND** no uploaded documents section and no "Arrival date at port of entry" row is shown
- **AND** every unanswered row reads "Not applicable"

### Requirement: The template review shows the rows the template's commodity asks for
**ID**: REQ-TEMPLATES-015
For cattle, the "Additional animal details" card MUST hold "Certified for" and "Includes unweaned animals", the "Roles and addresses" card MUST add "County parish holding (CPH) number", there MUST be no identification details card, and the card under "Main reason for import" MUST hold the single row "Reason for import" while no reason is chosen.

#### Scenario: A cattle template's review shows the cattle rows and one main reason row
**ID**: SCN-TEMPLATES-015-A
- **GIVEN** the user is creating a template for cattle
- **WHEN** they open the template review
- **THEN** "Additional animal details" holds "Certified for" and "Includes unweaned animals"
- **AND** "Roles and addresses" holds "County parish holding (CPH) number"
- **AND** no identification details card is shown
- **AND** the card under "Main reason for import" holds the single row "Reason for import"

### Requirement: The template review's Back link returns to the template's task list
**ID**: REQ-TEMPLATES-016
The template review MUST have a Back link that opens the template's task list.

#### Scenario: Back from the template review opens the template's task list
**ID**: SCN-TEMPLATES-016-A
- **GIVEN** the user is on the template review
- **WHEN** they select the Back link
- **THEN** the template's task list is shown

### Requirement: The template review's Change links open each question page for the template in progress
**ID**: REQ-TEMPLATES-017
Each card's Change link MUST open its question page for the template being created, showing the "Template" tag and the controls that page shows while a template is created: "Save and continue" alone on Origin of the import, and "Save and continue", "Save and return to overview" and "Cancel and return to overview" to the template's task list on the contact address page. A page MUST NOT offer a bare "Save and return" or "Cancel".

#### Scenario: Change opens Origin of the import and the contact address page for the template with their template-creation controls
**ID**: SCN-TEMPLATES-017-A
- **GIVEN** the user is on the template review
- **WHEN** they select "Change" on the import details card
- **THEN** Origin of the import is shown with the "Template" tag
- **AND** "Save and continue" is offered without "Save and return to overview"
- **WHEN** they return to the template review and select "Change" on the contact address card
- **THEN** the contact address page is shown with the "Template" tag
- **AND** "Save and continue", "Save and return to overview" and the link "Cancel and return to overview" are offered
- **AND** the link goes to the template's task list
- **AND** no bare "Save and return" and no bare "Cancel" is offered

### Requirement: Save template saves the template instead of going to the declaration
**ID**: REQ-TEMPLATES-018
The template review MUST end with the button "Save template", and selecting it MUST save the template, whatever is answered, and open Manage templates, where the template is now listed first and the count of templates is one higher. It MUST NOT open the declaration.

#### Scenario: Save template saves the template and opens Manage templates, which lists it
**ID**: SCN-TEMPLATES-018-A
- **GIVEN** the user is on the template review
- **WHEN** they select "Save template"
- **THEN** Manage templates is shown
- **AND** the template is listed there
- **AND** the declaration is not shown

#### Scenario: A part-answered template is saved, listed first and counted
**ID**: SCN-TEMPLATES-018-B
- **GIVEN** the user is on the review of a template with only some sections answered
- **WHEN** they select "Save template"
- **THEN** Manage templates is shown
- **AND** the template is the first one listed
- **AND** the count reads one more than before, such as "Show 1-1 of 1 results" for the user's first template

### Requirement: Saving a template shows a success banner on Manage templates once
**ID**: REQ-TEMPLATES-019
After Save template, Manage templates MUST show a GOV.UK success notification banner with the role alert, titled "Success" and headed "<template title> saved to templates". It MUST show only on the first Manage templates after the save, so it is gone on reload, and MUST NOT dismiss itself, with or without JavaScript.

#### Scenario: Manage templates confirms a saved template with a Success banner
**ID**: SCN-TEMPLATES-019-A
- **GIVEN** the user has just saved a template named "Weekly cattle"
- **WHEN** Manage templates is shown
- **THEN** a success banner with the role alert is shown, titled "Success"
- **AND** it is headed "Weekly cattle saved to templates"

#### Scenario: The banner is gone on reload
**ID**: SCN-TEMPLATES-019-B
- **GIVEN** Manage templates is showing the banner for a template just saved
- **WHEN** the user reloads the page
- **THEN** the banner is not shown

#### Scenario: The banner shows without JavaScript
**ID**: SCN-TEMPLATES-019-C
- **GIVEN** the user has JavaScript turned off
- **WHEN** they save a template
- **THEN** Manage templates shows the Success banner and it stays on the page

### Requirement: A template saved with no name is titled "Untitled template"
**ID**: REQ-TEMPLATES-020
A template saved with a blank name MUST be titled "Untitled template" on its card, and the banner MUST read "Untitled template saved to templates".

#### Scenario: A template saved with no name is listed first as Untitled template
**ID**: SCN-TEMPLATES-020-A
- **GIVEN** the user named a template with a blank name
- **WHEN** they save it
- **THEN** the banner reads "Untitled template saved to templates"
- **AND** the template is listed first, titled "Untitled template"

### Requirement: Each template is a card with its category, title, View template and Use template
**ID**: REQ-TEMPLATES-021
Each template MUST be a card labelled "Template <title>", showing the template's category ("Live animals" or "Germinal products") above its title as a level 3 heading, a "View template" link to the template's page and, beside it, a secondary "Use template" button that submits a form.

#### Scenario: A saved template's card shows its category, title, View template and Use template
**ID**: SCN-TEMPLATES-021-A
- **GIVEN** the user has saved a live animals template named "Weekly cattle"
- **WHEN** Manage templates is shown
- **THEN** a card labelled "Template Weekly cattle" is shown
- **AND** it shows the category "Live animals" above the title "Weekly cattle", a level 3 heading
- **AND** it offers the link "View template" to the template's page
- **AND** it offers a secondary button "Use template" that submits a form
