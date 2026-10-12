# Notification Templates Specification

## Purpose

Lets a signed-in importer or agent keep notification templates — saved sets of notification answers — and manage them from the Manage templates page. A user's templates are their own and are kept between sessions; the page's place in the service navigation is in `live-animals/service-navigation`. While a template is being created, the Overview is the template's task list. A template being created ends on the template review, the notification review in template mode, whose Save template saves it. Saving a template confirms it once with a success banner and lists it first. Once saved, a template has its own page showing its answers in the review's cards, from which it can be used or deleted; a template the user cannot open returns them to Manage templates. A saved template's sections are changed from its page, one at a time, and saving returns to the page with a success banner; a template never holds an arrival date. Using a template starts a new draft notification from the template's answers.

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
- **AND** opening the template's address shows Manage templates, without the template

#### Scenario: A saved template is never listed among the user's notifications
**ID**: SCN-TEMPLATES-003-G
- **GIVEN** the user has saved a template
- **WHEN** they open their notification dashboard
- **THEN** the template is not listed among their notifications

#### Scenario: A template changed after saving is listed first
**ID**: SCN-TEMPLATES-003-H
- **GIVEN** the user has saved two templates
- **AND** they change a section of the older one and save the change
- **WHEN** their templates are listed
- **THEN** the changed template is listed first

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

### Requirement: A saved template's page is titled with its name under the caption Templates
**ID**: REQ-TEMPLATES-022
"View template" MUST open the template's page, headed with the template's title ("Untitled template" when it was saved with no name) under the caption "Templates", with the browser title "<title> - Import notification service - GOV.UK".

#### Scenario: View template opens the template's page
**ID**: SCN-TEMPLATES-022-A
- **GIVEN** the user has saved a template named "Weekly cattle"
- **WHEN** they select "View template" on its card
- **THEN** the page is headed "Weekly cattle" under the caption "Templates"
- **AND** the browser title is "Weekly cattle - Import notification service - GOV.UK"

### Requirement: The template's page shows the date it was created
**ID**: REQ-TEMPLATES-023
The page MUST show "Date created: <d Month yyyy>" with the day the template was saved, or the day one of its sections was last changed and saved.

#### Scenario: The page shows the day the template was saved
**ID**: SCN-TEMPLATES-023-A
- **GIVEN** the user saved a template today
- **WHEN** they open its page
- **THEN** it shows "Date created:" followed by today's date, written with the month in full

#### Scenario: Changing a section resets the date created
**ID**: SCN-TEMPLATES-023-B
- **GIVEN** the user has opened a saved template's page
- **WHEN** they change a section and save the change
- **THEN** the page shows "Date created:" followed by the day of that save

### Requirement: The template's page offers Use template and Delete, and no Edit
**ID**: REQ-TEMPLATES-024
The page MUST offer a primary "Use template" button that submits a form and a red warning "Delete" button, and MUST NOT offer an "Edit" button or link.

#### Scenario: The page offers Use template and Delete but no Edit
**ID**: SCN-TEMPLATES-024-A
- **GIVEN** the user has opened a saved template's page
- **WHEN** the page is shown
- **THEN** it offers a primary button "Use template" that submits a form
- **AND** it offers a red warning button "Delete"
- **AND** it offers no "Edit" button or link

### Requirement: The template's page goes Back to Manage templates
**ID**: REQ-TEMPLATES-025
The page MUST offer a Back link to Manage templates.

#### Scenario: Back goes to Manage templates
**ID**: SCN-TEMPLATES-025-A
- **GIVEN** the user has opened a saved template's page
- **WHEN** they select Back
- **THEN** Manage templates is shown

### Requirement: The template's page shows its answers in the review's cards
**ID**: REQ-TEMPLATES-026
The page MUST list the template's answers in the notification review's cards, under "1. About the consignment" to "5. Contact address", with no documents section and no arrival date, each card with one Change link that opens that card's question page for the template.

#### Scenario: The answers are listed in five numbered sections with a Change link on each card
**ID**: SCN-TEMPLATES-026-A
- **GIVEN** the user has opened a saved template's page
- **WHEN** the page is shown
- **THEN** the sections are "1. About the consignment", "2. Description of the goods", "3. Transport and arrival", "4. Consignment parties" and "5. Contact address"
- **AND** no uploaded documents are shown
- **AND** every card has a Change link that opens the question page of that card for the template

#### Scenario: A template saved after answering every section shows every saved answer
**ID**: SCN-TEMPLATES-026-B
- **GIVEN** the user answered every section of a live animals template and saved it
- **WHEN** they open its page
- **THEN** it shows the country and region of origin, internal reference, commodity code, common name and species, the number of animals and packages, the reason for import, the purpose in the market, certified for and unweaned animals
- **AND** it shows the port of entry, means of transport, transport identification and transport document reference
- **AND** it shows the transporter's name, address, country, approval number and type, the animal identification details and the CPH number
- **AND** no arrival date at the port of entry is shown

### Requirement: A template the user cannot open returns them to Manage templates
**ID**: REQ-TEMPLATES-027
Opening the page of a template that does not exist, or of another user's template, or any of its question pages, MUST show Manage templates.

#### Scenario: A template that does not exist shows Manage templates
**ID**: SCN-TEMPLATES-027-A
- **GIVEN** no template has the address the user opens
- **WHEN** they open it
- **THEN** Manage templates is shown

#### Scenario: Another user's template shows Manage templates
**ID**: SCN-TEMPLATES-027-B
- **GIVEN** another user has saved a template
- **WHEN** the signed-in user opens that template's address
- **THEN** Manage templates is shown, without the template

#### Scenario: Changing a template the user cannot open shows Manage templates
**ID**: SCN-TEMPLATES-027-C
- **GIVEN** no template has the address the user opens, or another user has saved the template
- **WHEN** they follow the address of one of its question pages from a Change link
- **THEN** Manage templates is shown, without the template

### Requirement: A Change link on a saved template's page opens that section's question page for the template, ready to edit
**ID**: REQ-TEMPLATES-028
The question page MUST show the template's answers, MUST leave an unanswered optional field empty, MUST end with the single button "Save and return" and a "Cancel" link to the template's page with none of "Save and continue", "Save and return to overview" or "Cancel and return to overview", and its Back link MUST open the template's page.

#### Scenario: Change opens the section prefilled, ending with Save and return and Cancel
**ID**: SCN-TEMPLATES-028-A
- **GIVEN** the user has opened a saved template's page
- **WHEN** they select "Change" on the import details card
- **THEN** Origin of the import is shown with the template's answers
- **AND** an unanswered optional field is empty
- **AND** "Save and return" is the only submit button
- **AND** the link "Cancel" goes to the template's page
- **AND** none of "Save and continue", "Save and return to overview" or "Cancel and return to overview" is offered

#### Scenario: Back returns to the template's page
**ID**: SCN-TEMPLATES-028-B
- **GIVEN** the user has opened a section of a saved template with a Change link
- **WHEN** they follow Back
- **THEN** the template's page is shown

### Requirement: Save and return updates the template and confirms it on the template's page
**ID**: REQ-TEMPLATES-029
Selecting "Save and return" MUST update the template and no draft notification, MUST open the template's page showing the new answer and a GOV.UK success notification banner with the role alert, titled "Success" and headed "<template name> has been updated" ("Template has been updated" for a template with no name), MUST show the banner once and never dismiss it itself, with or without JavaScript, and MUST work for every section the page links to.

#### Scenario: Saving a changed section shows the new answer and the Success banner
**ID**: SCN-TEMPLATES-029-A
- **GIVEN** the user has opened a section of a saved template named "Weekly cattle" with a Change link
- **WHEN** they change an answer and select "Save and return"
- **THEN** the template's page is shown with the new answer
- **AND** a success banner with the role alert is shown, titled "Success" and headed "Weekly cattle has been updated"

#### Scenario: A template with no name is confirmed as 'Template has been updated'
**ID**: SCN-TEMPLATES-029-B
- **GIVEN** the user has opened a section of a saved template with no name with a Change link
- **WHEN** they select "Save and return"
- **THEN** the banner is headed "Template has been updated"

#### Scenario: The banner is gone on reload
**ID**: SCN-TEMPLATES-029-C
- **GIVEN** the template's page is showing the banner for a section just saved
- **WHEN** the user reloads the page
- **THEN** the banner is not shown

#### Scenario: The banner shows and stays without JavaScript
**ID**: SCN-TEMPLATES-029-D
- **GIVEN** the user has JavaScript turned off
- **WHEN** they change a section of a saved template and select "Save and return"
- **THEN** the template's page shows the Success banner and it stays on the page

#### Scenario: Every section the page links to saves and returns to the template's page
**ID**: SCN-TEMPLATES-029-E
- **GIVEN** the user has opened a saved template's page with every section answered
- **WHEN** they follow each Change link on the page and select "Save and return"
- **THEN** each time the template's page is shown with the Success banner
- **AND** a new answer on the arrival details section is shown on the page

#### Scenario: Changing a template leaves the draft notifications unchanged
**ID**: SCN-TEMPLATES-029-F
- **GIVEN** the user has draft notifications on their dashboard
- **WHEN** they change a section of a saved template and select "Save and return"
- **THEN** the user's draft notifications on the dashboard are the same as before

### Requirement: Leaving a change without saving keeps the template's answers
**ID**: REQ-TEMPLATES-030
Following a Change link MUST store nothing until "Save and return" is selected.

#### Scenario: Cancel or Back after editing keeps the saved answer
**ID**: SCN-TEMPLATES-030-A
- **GIVEN** the user has opened a section of a saved template with a Change link and typed a new answer
- **WHEN** they follow "Cancel", or Back, instead of saving
- **THEN** the template's page is shown with the answer it had before
- **AND** no banner is shown

### Requirement: A template never holds an arrival date
**ID**: REQ-TEMPLATES-031
An arrival date answered on the arrival page while a template is created or changed MUST NOT be kept, so the template's page shows no arrival date and the arrival page opens with the date empty.

#### Scenario: An arrival date answered while creating is not kept
**ID**: SCN-TEMPLATES-031-A
- **GIVEN** the user answers the arrival details of a template, including an arrival date, and saves the template
- **WHEN** they open its page and change its arrival details
- **THEN** the template's page shows no arrival date
- **AND** the arrival date field is empty

#### Scenario: An arrival date answered while changing is not kept
**ID**: SCN-TEMPLATES-031-B
- **GIVEN** the user has opened the arrival details of a saved template with a Change link
- **WHEN** they enter an arrival date and select "Save and return"
- **THEN** the template's page shows no arrival date
- **AND** changing the arrival details again shows the arrival date field empty

### Requirement: Use template starts a new draft notification from the template
**ID**: REQ-TEMPLATES-032
Selecting "Use template" on a live animals template's card or on its page MUST create and save a new draft notification with a new reference, MUST open that notification's own task list, MUST name the template nowhere on it and MUST leave the user's other drafts unchanged; it MUST work without JavaScript.

#### Scenario: Use template on a card opens a new draft's Notification tasklist
**ID**: SCN-TEMPLATES-032-A
- **GIVEN** the user has saved a live animals template
- **WHEN** they select "Use template" on its card
- **THEN** the Overview of a new notification is shown, with the "Notification tasklist" and the status "Draft" and a new reference
- **AND** its sections are "1. About the consignment", "2. Description of the goods", "3. Transport and arrival", "4. Documents", "5. Consignment parties" and "6. Contact address"
- **AND** it ends with "Review and submit" and "Return to dashboard", which opens the live animals notification list
- **AND** nothing on it names the template

#### Scenario: Use template on the template's page starts another draft
**ID**: SCN-TEMPLATES-032-B
- **GIVEN** the user has used a template and has opened its page
- **WHEN** they select "Use template"
- **THEN** the Overview of another new notification is shown with a different reference

#### Scenario: The new notification shows the template's totals
**ID**: SCN-TEMPLATES-032-C
- **GIVEN** the user has saved a template with commodity numbers answered
- **WHEN** they use it
- **THEN** the notification's Overview shows the template's animal and package totals under "Your commodities"

#### Scenario: The new draft is listed and other drafts are unchanged
**ID**: SCN-TEMPLATES-032-D
- **GIVEN** the user has a draft notification and a saved template
- **WHEN** they use the template
- **THEN** the dashboard lists the new draft and the earlier one, both with the status "Draft"
- **AND** the earlier draft's answers and totals are as they were

#### Scenario: Use template works without JavaScript
**ID**: SCN-TEMPLATES-032-E
- **GIVEN** the user has JavaScript turned off and has opened a saved template's page
- **WHEN** they select "Use template"
- **THEN** the Overview of a new notification is shown with the "Notification tasklist"

### Requirement: A notification started from a template holds the template's answers, without an arrival date or documents
**ID**: REQ-TEMPLATES-033
A notification started from a template MUST hold the answers the template holds, except that it MUST hold no arrival date and no documents, and it MUST show no errors when first opened. It MUST hold each consignment party and the contact address as the template holds them, and where the template has no contact address its place of origin MUST be the contact address.

#### Scenario: A fully answered template's answers are carried into the notification
**ID**: SCN-TEMPLATES-033-A
- **GIVEN** the user has saved a template with every section answered
- **WHEN** they use it and open the review of the new notification
- **THEN** it shows the template's country of origin, region of origin, internal reference, commodities, species, numbers of animals and packages, animal identification, reason for import, port of entry, means of transport, transport identification, transport document reference and CPH number
- **AND** it shows the transporter's name, address, country, approval number and type

#### Scenario: Region of origin is carried as the template holds it
**ID**: SCN-TEMPLATES-033-G
- **GIVEN** the user has saved a template that answers whether the consignment has a region of origin code
- **WHEN** they use it and open 'Where is this consignment coming from?'
- **THEN** the region of origin answer is 'Yes' with the template's code when the template has one
- **AND** it is 'No' when the template has none

#### Scenario: No arrival date or documents are carried
**ID**: SCN-TEMPLATES-033-B
- **GIVEN** the user has saved a template with every section answered
- **WHEN** they use it
- **THEN** "Arrival details" and "Upload documents" read "To do" on the new notification's Overview
- **AND** the tasks the template answered read "Complete"

#### Scenario: Certified for falls back to Further keeping
**ID**: SCN-TEMPLATES-033-C
- **GIVEN** a template's "Certified for" answer is missing or is no longer offered
- **WHEN** the user uses the template
- **THEN** "Certified for" on the new notification is "Further keeping"

#### Scenario: The unweaned answer is No when the commodity asks it and the template has none
**ID**: SCN-TEMPLATES-033-D
- **GIVEN** a template's commodity asks whether the consignment contains unweaned animals and the template has no answer
- **WHEN** the user uses the template
- **THEN** the new notification's answer is "No"

#### Scenario: The purpose is carried only for Internal market
**ID**: SCN-TEMPLATES-033-E
- **GIVEN** a template holds a purpose in the internal market
- **WHEN** the user uses it and the template's reason for import is not "Internal market"
- **THEN** the new notification holds no purpose
- **AND** when the reason is "Internal market" the purpose is carried

#### Scenario: The new notification shows no errors when first opened
**ID**: SCN-TEMPLATES-033-F
- **GIVEN** the user has saved a template
- **WHEN** they use it
- **THEN** the new notification's Overview shows no error summary

#### Scenario: Each party and the contact address are carried
**ID**: SCN-TEMPLATES-033-H
- **GIVEN** the user has saved a template with a place of origin, consignor, consignee, importer, place of destination and contact address
- **WHEN** they use it and open the review of the new notification
- **THEN** the "Roles and addresses" card shows the template's place of origin, consignor, consignee, importer and place of destination
- **AND** the "Contact address for this consignment" card shows the template's contact address

#### Scenario: With no contact address, the place of origin becomes the contact address
**ID**: SCN-TEMPLATES-033-I
- **GIVEN** the user has saved a template that has a place of origin and no contact address
- **WHEN** they use it and open the review of the new notification
- **THEN** the "Contact address for this consignment" card shows the template's place of origin

### Requirement: A template the user cannot use returns them to Manage templates
**ID**: REQ-TEMPLATES-034
Using a template that does not exist, has been deleted or is another user's MUST show Manage templates and MUST create no notification.

#### Scenario: A template that does not exist
**ID**: SCN-TEMPLATES-034-A
- **GIVEN** no template has the address the user's "Use template" form posts to
- **WHEN** the form is submitted
- **THEN** Manage templates is shown
- **AND** no notification is created

#### Scenario: Another user's template
**ID**: SCN-TEMPLATES-034-B
- **GIVEN** another user has saved a template and the signed-in user has its page open
- **WHEN** the signed-in user selects "Use template"
- **THEN** Manage templates is shown, without the template
- **AND** no notification is created

### Requirement: Each template card lists Commodity, Origin, Consignee and Consignor
**ID**: REQ-TEMPLATES-035
Each template card MUST list, below "View template" and "Use template" and in this order, "Commodity" (the common name of each of the template's commodities), "Origin" (the country of origin), "Consignee" (the consignee's name) and "Consignor" (the consignor's name), each reading "Not applicable" when the template has no answer.

#### Scenario: A part-answered template's card reads Not applicable for what it does not hold
**ID**: SCN-TEMPLATES-035-A
- **GIVEN** the user has saved a template that answers Origin and a commodity but names no consignee or consignor
- **WHEN** Manage templates is shown
- **THEN** the template's card lists "Commodity", "Origin", "Consignee" and "Consignor", in that order
- **AND** "Commodity" shows the commodity's common name and "Origin" shows the country of origin
- **AND** "Consignee" and "Consignor" read "Not applicable"

#### Scenario: A template's card names its commodity, origin, consignee and consignor
**ID**: SCN-TEMPLATES-035-B
- **GIVEN** the user has saved a template with a commodity, a country of origin, a consignee and a consignor
- **WHEN** Manage templates is shown
- **THEN** the template's card shows the commodity's common name, the country of origin, the consignee's name and the consignor's name against "Commodity", "Origin", "Consignee" and "Consignor"

#### Scenario: A template saved with nothing answered reads Not applicable for all four
**ID**: SCN-TEMPLATES-035-C
- **GIVEN** a saved template holds no answers
- **WHEN** Manage templates is shown
- **THEN** the template's card reads "Not applicable" for "Commodity", "Origin", "Consignee" and "Consignor"

### Requirement: A saved template's page shows each consignment party and the contact address
**ID**: REQ-TEMPLATES-036
A saved template's page MUST show, in its "Roles and addresses" card, the place of origin, consignor, consignee, importer and place of destination each as answered, by name, with the place of origin also showing its address. Its "Contact address for this consignment" card MUST show the contact address as answered or, where none was chosen, the place of origin.

#### Scenario: Each party and the contact address are shown as answered
**ID**: SCN-TEMPLATES-036-A
- **GIVEN** the user has saved a template with a place of origin, consignor, consignee, importer, place of destination and contact address
- **WHEN** they open the template's page
- **THEN** the "Roles and addresses" card shows each of the five parties by name, and the place of origin with its address
- **AND** the "Contact address for this consignment" card shows the contact address

#### Scenario: With no contact address chosen, the place of origin is shown as the contact address
**ID**: SCN-TEMPLATES-036-B
- **GIVEN** the user has saved a template that has a place of origin and no contact address
- **WHEN** they open the template's page
- **THEN** the "Contact address for this consignment" card shows the template's place of origin
- **AND** the "Roles and addresses" card reads "Not applicable" for a party the template does not hold
