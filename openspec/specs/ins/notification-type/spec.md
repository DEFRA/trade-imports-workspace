# Notification Type Specification (INS)

## Purpose

Before any notification exists, the Import Notification Service asks what is being imported and hands the user to the journey that notifies it.

## Requirements

### Requirement: The notification type question asks what is being imported before any notification exists
**ID**: REQ-INS-NTYPE-001
The page MUST ask "What are you importing?" with five unselected options and a single "Continue" button, and MUST NOT create a notification, show a Draft tag or show a notification reference.

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
- **THEN** the Import Notification Service home is shown with Dashboard as the current service-navigation item
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

### Requirement: Choosing what is being imported hands the user to the journey that notifies it
**ID**: REQ-INS-NTYPE-002
The system MUST, when the user chooses a type and continues, hand them to the journey that notifies it: Live animals to a new live-animals draft, Germinal products to the germinal products journey's start, and Plants for planting, Potatoes (seed and ware) or Wood products to a new high-risk plants draft. It MUST NOT create a live-animals notification for any other choice.

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
- **THEN** the germinal products journey's start is opened
- **AND** no live-animals notification is created

#### Scenario: A plants type opens a new high-risk plants draft
**ID**: SCN-INS-NTYPE-002-C
- **GIVEN** the question is shown
- **WHEN** the user chooses Plants for planting, Potatoes (seed and ware) or Wood products and continues
- **THEN** a new high-risk plants draft is created and the high-risk plants journey's first page is shown
- **AND** no live-animals notification is created

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
