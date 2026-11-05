# Notification Type Specification (INS)

## Purpose

Before any notification exists, the Import Notification Service asks what is being imported and hands the user to the journey that notifies it.

## Requirements

### Requirement: The notification type question asks what is being imported before any notification exists
**ID**: REQ-INS-NTYPE-001
The page MUST ask "What are you importing?" with five options and a single "Continue" button, none selected when it is opened to start a new notification, and MUST NOT create a notification, show a Draft tag or show a notification reference.

#### Scenario: The question shows its title, options and single Continue button
**ID**: SCN-INS-NTYPE-001-A
- **GIVEN** a signed-in user has chosen to start a new notification
- **WHEN** the question is shown
- **THEN** the browser title is "What are you importing? - Import notification service - GOV.UK"
- **AND** the heading is "What are you importing?" with the caption "About the consignment"
- **AND** the options are, in order, Live animals; Germinal products (semen, ova, embryos); Plants for planting; Potatoes (seed and ware); Wood products
- **AND** no hint is shown and no option is selected
- **AND** the page ends with a single "Continue" button, with no "Save and return to overview" and no cancel link

#### Scenario: Back returns to the home and no notification is created
**ID**: SCN-INS-NTYPE-001-B
- **GIVEN** the question is shown
- **WHEN** the user follows Back
- **THEN** the Import Notification Service home is shown
- **AND** no notification has been created

#### Scenario: The question shows no Draft tag and no reference
**ID**: SCN-INS-NTYPE-001-C
- **GIVEN** the question is shown
- **WHEN** the user reads the page
- **THEN** no Draft tag and no notification reference are shown

#### Scenario: The question shows the Alpha phase banner with an email feedback link
**ID**: SCN-INS-NTYPE-001-D
- **GIVEN** the question is shown
- **WHEN** the user reads the page
- **THEN** the "Alpha" phase banner shows "This is a new service. Help us improve it and give your feedback by email."
- **AND** the feedback link opens an email to the service desk

#### Scenario: Dashboard is the current service navigation item while the question is shown
**ID**: SCN-INS-NTYPE-001-E
- **GIVEN** the question is shown
- **WHEN** the user reads the service navigation
- **THEN** Dashboard is the current item

#### Scenario: Create new after a round trip from a notification shows nothing selected
**ID**: SCN-INS-NTYPE-001-F
- **GIVEN** the user has been taken from a live-animals notification back to the question
- **WHEN** they open the question again with Create new on the Import Notification Service home
- **THEN** no option is selected

### Requirement: Choosing what is being imported hands the user to the journey that notifies it
**ID**: REQ-INS-NTYPE-002
The system MUST, when the user chooses a type and continues, hand them to the journey that notifies it, opening the receiving service at the address configured for that environment: Live animals to a new live-animals draft, Germinal products to the germinal products start in the animals service, and a plants type to a new high-risk plants draft. It MUST NOT create a live-animals notification for any other choice.

#### Scenario: Live animals opens a new live-animals draft
**ID**: SCN-INS-NTYPE-002-A
- **GIVEN** the question is shown
- **WHEN** the user chooses Live animals and continues
- **THEN** a new live-animals draft is created and its "Origin of the import" page is shown
- **AND** the page shows the Draft tag and a new GBN-AG reference

#### Scenario: Germinal products opens the germinal products start
**ID**: SCN-INS-NTYPE-002-B
- **GIVEN** the question is shown
- **WHEN** the user chooses Germinal products (semen, ova, embryos) and continues
- **THEN** the user is sent to the germinal products start in the animals service
- **AND** no live-animals notification is created

#### Scenario: A plants type opens a new high-risk plants draft
**ID**: SCN-INS-NTYPE-002-C
- **GIVEN** the question is shown
- **WHEN** the user chooses Plants for planting, Potatoes (seed and ware) or Wood products and continues
- **THEN** a new high-risk plants draft is created and the high-risk plants journey's first page is shown
- **AND** no live-animals notification is created

### Requirement: The question picks a live-animals notification back up
**ID**: REQ-INS-NTYPE-005
The system MUST, when the question is reached from a live-animals notification's origin page, show Live animals selected, and on Continue with it kept MUST return the user to that notification's "Origin of the import" page with the same reference, creating no draft. Choosing another type MUST start that type's journey and leave the notification's reference, Draft status and answers unchanged.

#### Scenario: The question shows Live animals selected for a notification
**ID**: SCN-INS-NTYPE-005-A
- **GIVEN** the user follows Back from a live-animals notification's "Origin of the import" page
- **WHEN** the question is shown
- **THEN** Live animals is selected and no other option is

#### Scenario: Keeping Live animals returns to the same notification
**ID**: SCN-INS-NTYPE-005-B
- **GIVEN** the question is shown for a live-animals notification
- **WHEN** the user continues with Live animals still selected
- **THEN** that notification's "Origin of the import" page is shown with the same reference and the Draft tag
- **AND** the live animals notifications list holds no additional notification

#### Scenario: Choosing Plants for planting leaves the notification unchanged
**ID**: SCN-INS-NTYPE-005-C
- **GIVEN** the question is shown for a live-animals notification that holds answers
- **WHEN** the user chooses Plants for planting and continues
- **THEN** the high-risk plants journey's first page is shown
- **AND** the live-animals notification still has its reference, its Draft status and every answer it had

#### Scenario: Choosing Germinal products leaves the notification unchanged
**ID**: SCN-INS-NTYPE-005-D
- **GIVEN** the question is shown for a live-animals notification that holds answers
- **WHEN** the user chooses Germinal products (semen, ova, embryos) and continues
- **THEN** the user is sent to the germinal products start in the animals service
- **AND** the live-animals notification still has its reference, its Draft status and every answer it had

### Requirement: Continuing with nothing chosen is refused
**ID**: REQ-INS-NTYPE-003
The system MUST, when the user continues with nothing chosen, show the question again with an error summary and an inline error, both "Select what you are importing", and MUST prefix the browser title with "Error: ".

#### Scenario: Continuing with nothing chosen shows the error
**ID**: SCN-INS-NTYPE-003-A
- **GIVEN** the question is shown with no option chosen
- **WHEN** the user selects "Continue"
- **THEN** the page is shown again with an error summary titled "There is a problem" listing "Select what you are importing", linked to the first option
- **AND** the same message is shown on the options
- **AND** the browser title starts "Error: "

### Requirement: A user not yet signed in to the receiving service is signed in on the way
**ID**: REQ-INS-NTYPE-004
The system MUST, when the user chooses a type and continues while signed in to the Import Notification Service but not to the receiving service, sign them in to the receiving service on the way and take them to the same page as a user already signed in there. This MUST also hold on the way back from a live-animals notification's origin page to the question, and on the way from the question back to the notification's origin page.

#### Scenario: A user signed in to the Import Notification Service only is signed in to the animals service on the way
**ID**: SCN-INS-NTYPE-004-A
- **GIVEN** the user is signed in to the Import Notification Service and not to the animals service
- **WHEN** the user chooses Live animals and continues
- **THEN** the user is signed in to the animals service on the way
- **AND** the new draft's "Origin of the import" page is shown

#### Scenario: A user signed in to the Import Notification Service only is signed in to the high-risk plants service on the way
**ID**: SCN-INS-NTYPE-004-B
- **GIVEN** the user is signed in to the Import Notification Service and not to the high-risk plants service
- **WHEN** the user chooses Plants for planting and continues
- **THEN** the user is signed in to the high-risk plants service on the way without the browser blocking a step
- **AND** a new high-risk plants draft's first page is shown

#### Scenario: A user signed out of the Import Notification Service on the way back from a notification still reaches the question with Live animals selected
**ID**: SCN-INS-NTYPE-004-C
- **GIVEN** the user is signed in to the animals service and has been signed out of the Import Notification Service
- **WHEN** they follow Back from a live-animals notification's "Origin of the import" page
- **THEN** the user is signed in to the Import Notification Service on the way
- **AND** the question is shown with Live animals selected

#### Scenario: A user signed out of the animals service on the way back to a notification still reaches its origin page
**ID**: SCN-INS-NTYPE-004-D
- **GIVEN** the question is shown for a live-animals notification and the user has been signed out of the animals service
- **WHEN** they continue with Live animals still selected
- **THEN** the user is signed in to the animals service on the way
- **AND** that notification's "Origin of the import" page is shown
