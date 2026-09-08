# Check Your Answers Page Specification

## Purpose

The page on which a whole notification is read back before submission, and read again once submitted. The page is titled "Check your answers".

## Requirements

### Requirement: Check-your-answers numbers its own sections over only what it renders, omitting anything unanswered
The system MUST group the page under numbered section headings of its own, numbered in sequence across only the sections that have something to show, and MUST NOT render a heading for a section with nothing entered. This numbering is the page's own: it MUST NOT be assumed to match the Overview page's, which numbers all six sections whether or not they hold answers.

#### Scenario: Check-your-answers numbers only the sections it renders
- **GIVEN** the user has answered every section of a notification except documents
- **WHEN** they view check-your-answers
- **THEN** the numbered section headings read "1. About the consignment", "2. Movement" and "3. Addresses", numbered in sequence over the sections shown rather than carrying the Overview page's numbers
- **AND** no Documents heading is shown, since none were uploaded

#### Scenario: Commodity and consignment detail appear within a section, not as numbered sections
- **GIVEN** the user is viewing check-your-answers for a notification with commodities entered
- **WHEN** they read down the page
- **THEN** consignment details, commodity details and species appear as sub-headings inside a numbered section, not as numbered sections in their own right

#### Scenario: A fully answered notification's check-your-answers reflects every entered value
- **GIVEN** the user has answered every section of a notification except documents
- **WHEN** they view check-your-answers
- **THEN** each section shows cards of the entered values — for example the country of origin, the species and animal details entered, and the arrival details entered

#### Scenario: Check-your-answers lists every address role with its selected party
- **GIVEN** the user has selected a party for each of the notification's address roles — place of origin, consignor, consignee, importer, and place of destination
- **WHEN** they view check-your-answers
- **THEN** the roles-and-addresses card lists all of them, each showing the selected party's name and country

### Requirement: Anything not yet answered is shown as "Not provided", not as an error
The system MUST show "Not provided" against any field, or any party role, that has not yet been answered, and MUST NOT show an error for it — an error is reserved for a role whose linked address no longer resolves, not for one nobody has reached yet.

#### Scenario: An unanswered optional field reads Not provided
- **GIVEN** the user has answered only the entry page of a notification
- **WHEN** they view check-your-answers
- **THEN** the fields nobody has reached yet each read "Not provided"

#### Scenario: An unanswered party role reads Not provided, with no error shown
- **GIVEN** a new notification whose party roles have not yet been answered
- **WHEN** the user views check-your-answers
- **THEN** each unanswered role reads "Not provided", and no error is shown against it

### Requirement: A back link returns to Overview
The system MUST return the user to Overview when they follow the back link from check-your-answers.

#### Scenario: The back link opens Overview
- **GIVEN** the user is on check-your-answers
- **WHEN** they follow the back link
- **THEN** Overview is shown

### Requirement: A Change link returns to check-your-answers
The system MUST return the user to check-your-answers after saving an answer edited via its Change link, even where answering that question during the normal flow would continue to a different page.

#### Scenario: Editing an answer via Change returns to check-your-answers with the new value
- **GIVEN** the user is on check-your-answers
- **WHEN** they follow a Change link, edit the answer, and save it
- **THEN** they return to check-your-answers, showing the new value

### Requirement: A draft notification offers submission and none of the post-submission actions
The system MUST invite the user to submit a draft notification, offering a continue action, and MUST NOT offer copy-as-new, delete, or cancel-amendment while it is still a draft.

#### Scenario: The draft view invites submission and withholds the post-submission actions
- **GIVEN** a draft notification is open on check-your-answers
- **WHEN** the user views it
- **THEN** it invites them to submit the notification, offering a continue action
- **AND** no copy-as-new, delete, or cancel-amendment action is offered

### Requirement: Continuing from a ready draft notification moves on to the declaration
The system MUST take the user from a draft notification's check-your-answers to the declaration page when they continue, once every task is ready to submit.

#### Scenario: Continuing opens the declaration
- **GIVEN** a draft notification is open on check-your-answers, with every task ready
- **WHEN** the user continues
- **THEN** the declaration page opens

### Requirement: Continuing from a notification that is not yet ready returns to Overview instead
The system MUST NOT show an error when the user continues from check-your-answers while a task is still outstanding, and MUST instead return them to Overview.

#### Scenario: Continuing an incomplete notification returns to Overview without an error
- **GIVEN** a new notification is open on check-your-answers with a party role still unanswered
- **WHEN** the user continues
- **THEN** they are returned to Overview, without an error being shown

### Requirement: A submitted notification offers copy-as-new and delete
The system MUST offer copy-as-new and delete actions on the read-only view of a submitted notification, and MUST NOT offer cancel-amendment while no amendment is in progress.

#### Scenario: The submitted view offers the actions open to a submitted notification
- **GIVEN** a submitted notification is open on check-your-answers
- **WHEN** the user views it
- **THEN** copy-as-new and delete actions are offered, and no cancel-amendment action is shown

### Requirement: Copying a submitted notification from this page opens a new draft under its own reference
The system MUST open a new draft when the user copies a submitted notification from check-your-answers, carrying a newly minted reference number distinct from the original's.

#### Scenario: Copy as new opens a distinct new draft
- **GIVEN** a submitted notification is open on check-your-answers
- **WHEN** the user copies it as new
- **THEN** a new draft opens at Overview, carrying its own reference number, different from the original's
