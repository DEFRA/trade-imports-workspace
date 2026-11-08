# Commercial Transporter Details Page Specification

## Purpose

Asks for the name, address and authorisation number of a commercial transporter that is not on the transporter list, keyed in by hand. A commercial transporter added this way can only be based in Northern Ireland, so the country is shown rather than asked. Reached only via "Add a transporter" from the transporter list, after choosing "Commercial" on the type question — not as a mandatory branch of the transport section itself. The page is titled "Add commercial transporter".

## Requirements

### Requirement: The page asks for the transporter's name, authorisation number and address, showing the country fixed to Northern Ireland
**ID**: REQ-COMMERCIAL-TRANS-001
The system MUST ask the user for the commercial transporter's name or organisation name, its transporter authorisation number, and a full address — address line 1, an optional address line 2, town or city, an optional county, postal or zip code, telephone number and email address — and MUST show the country as Northern Ireland rather than asking for it.

#### Scenario: The page presents its questions with the country fixed
**ID**: SCN-COMMERCIAL-TRANS-001-A
- **GIVEN** the user has chosen "Commercial" on the transporter type question reached from "Add a transporter"
- **WHEN** the page loads
- **THEN** it asks for a name or organisation name, a transporter authorisation number, address line 1, address line 2, a town or city, a county, a postcode or zip code, a telephone number and an email address
- **AND** the country field shows Northern Ireland, not a question to answer

### Requirement: A complete set of commercial transporter details is saved as one record and reloads into the form
**ID**: REQ-COMMERCIAL-TRANS-002
The system MUST save the transporter's details together as a single record once every mandatory field is given, MUST return the user to the transporter list with the saved transporter chosen, and MUST show the saved values again in the form when they return to it through the add route.

#### Scenario: Completing the details saves them and returns to the transporter list, chosen
**ID**: SCN-COMMERCIAL-TRANS-002-A
- **GIVEN** the user is on the commercial transporter details page with every mandatory field entered
- **WHEN** they save and continue
- **THEN** they return to the transporter list, with the saved transporter already chosen

#### Scenario: Returning to the page shows the saved details in the form
**ID**: SCN-COMMERCIAL-TRANS-002-B
- **GIVEN** the user has saved a complete set of commercial transporter details
- **WHEN** they return to the page through the add route
- **THEN** the name and authorisation number they saved are shown in the form

### Requirement: The page repeats the transporter list's authorisation guidance
**ID**: REQ-COMMERCIAL-TRANS-003
The system MUST show the same transporter-authorisation guidance on this page as `live-animals/journey-pages/transporter` states on the list (when it applies, that DAERA/APHA authorisation is required, that DAERA documents are valid and EU documents are not, and a link to further guidance), so a trader who reached this form without reading the list still sees it.

#### Scenario: The page carries the same authorisation guidance as the list
**ID**: SCN-COMMERCIAL-TRANS-003-A
- **GIVEN** the user has reached the commercial transporter details page
- **WHEN** the page loads
- **THEN** it states the same transporter-authorisation guidance the transporter list carries, including the link to further guidance

### Requirement: A blank mandatory field or an over-length one is rejected, preserving every other field entered
**ID**: REQ-COMMERCIAL-TRANS-004
The system MUST reject a save that leaves a mandatory field blank or gives a field longer than its maximum length, in each case linking the resulting error to and focusing the field at fault while preserving every other field already entered. An over-length value MUST be preserved so it can be edited down.

#### Scenario: A blank mandatory field blocks the save without losing the rest of the details
**ID**: SCN-COMMERCIAL-TRANS-004-A
- **GIVEN** the user has left one mandatory field blank
- **WHEN** they try to save
- **THEN** the save is blocked, an error links to and focuses that field, and every other field still shows what was entered

#### Scenario: An over-length field blocks the save with its value preserved
**ID**: SCN-COMMERCIAL-TRANS-004-B
- **GIVEN** the user has entered a value longer than a field's maximum length
- **WHEN** they try to save
- **THEN** the save is blocked, an error links to and focuses that field, and the over-length value is still shown

### Requirement: A completely blank commercial transporter record is accepted
**ID**: REQ-COMMERCIAL-TRANS-005
The system MUST accept the page being saved with every field left blank, without error, since adding a commercial transporter this way is itself optional until the trader starts filling it in.

#### Scenario: Saving the page with nothing entered succeeds
**ID**: SCN-COMMERCIAL-TRANS-005-A
- **GIVEN** the user is on the commercial transporter details page with every field blank
- **WHEN** they save and continue
- **THEN** the save succeeds without an error summary

### Requirement: A saved commercial transporter returns the user to the transporter list already chosen, and survives the list's own save
**ID**: REQ-COMMERCIAL-TRANS-006
The system MUST land the user who saves a commercial transporter on the transporter list with it already chosen for the notification, and MUST leave its saved details unchanged when the list is saved again.

#### Scenario: The save puts the trader straight on the list with the new transporter checked, surviving the list's own save
**ID**: SCN-COMMERCIAL-TRANS-006-A
- **GIVEN** the user has just saved a complete set of commercial transporter details
- **WHEN** the save lands
- **THEN** the transporter list is shown with that transporter's row checked, with no need to open the list separately to find it so
- **WHEN** they save the list without changing the choice
- **THEN** they return to Overview, and the commercial transporter form still shows the saved authorisation number

### Requirement: The page ends with exactly a primary save and a secondary cancel, which abandons the add and leaves an unchanged type's chosen transporter alone
**ID**: REQ-COMMERCIAL-TRANS-007
The system MUST end the page with exactly two controls: a primary "Save and continue" and a secondary "Cancel and return to dashboard". The secondary MUST discard whatever the form holds and take the user to the dashboard, wherever the notifications list lives.

#### Scenario: The page offers exactly the primary and the cancel control
**ID**: SCN-COMMERCIAL-TRANS-007-A
- **GIVEN** the user is on the commercial transporter details page
- **WHEN** the page loads
- **THEN** it ends with exactly "Save and continue" and a secondary "Cancel and return to dashboard", and offers no link back to the overview

#### Scenario: Cancelling with the stored type unchanged leaves the chosen transporter alone and shows no error
**ID**: SCN-COMMERCIAL-TRANS-007-B
- **GIVEN** the user already has a commercial transporter chosen, and reaches the commercial transporter details page with some or all fields filled in
- **WHEN** they choose "Cancel and return to dashboard"
- **THEN** no error is shown, no transporter is added, and they are taken to the dashboard
- **AND** the transporter they had chosen before the add began is still chosen on the transporter list

### Requirement: Values a refused save left behind are shown again until the form is saved or cancelled
**ID**: REQ-COMMERCIAL-TRANS-008
The system MUST remember the values a refused save entered, and MUST show them again in the form the next time the user opens it, until that form is saved or cancelled.

#### Scenario: Leaving a refused form and returning to it shows what was entered
**ID**: SCN-COMMERCIAL-TRANS-008-A
- **GIVEN** the user's save of the commercial transporter details was refused for a missing or invalid field
- **WHEN** they leave the page and later open it again
- **THEN** the values they had entered are shown in the fields, not the previously saved answer
