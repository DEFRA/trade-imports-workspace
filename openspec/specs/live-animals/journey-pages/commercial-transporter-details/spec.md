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
The system MUST save the transporter's details together as a single record once every mandatory field is given, MUST go on to Upload documents on Save and continue, and MUST show the saved values again in the form when they return to it through the add route.

#### Scenario: Completing the details saves them and goes on to Upload documents
**ID**: SCN-COMMERCIAL-TRANS-002-A
- **GIVEN** the user is on the commercial transporter details page with every mandatory field entered
- **WHEN** they save and continue
- **THEN** Upload documents is shown

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

### Requirement: A saved commercial transporter joins the transporter list, already chosen
**ID**: REQ-COMMERCIAL-TRANS-006
The system MUST add a commercial transporter saved from this page to the transporter list and have it chosen for the notification, and MUST leave its saved details unchanged when the list is saved again.

#### Scenario: The transporter just added is the checked row on the list and survives saving the list
**ID**: SCN-COMMERCIAL-TRANS-006-A
- **GIVEN** the user has saved a complete set of commercial transporter details
- **WHEN** they open the transporter list
- **THEN** a row for that transporter is shown with its radio checked
- **WHEN** they save the list with "Save and return to overview", without changing the choice
- **THEN** they return to Overview, and the commercial transporter form still shows the saved authorisation number

### Requirement: The back link returns to the transporter type question
**ID**: REQ-COMMERCIAL-TRANS-007
The system MUST return the user to the transporter type question when they follow the back link from the commercial transporter details page.

#### Scenario: The back link opens the transporter type question
**ID**: SCN-COMMERCIAL-TRANS-007-A
- **GIVEN** the user is on the commercial transporter details page
- **WHEN** they follow the back link
- **THEN** the transporter type question is shown

### Requirement: A valid save of a commercial transporter shows Upload documents
**ID**: REQ-COMMERCIAL-TRANS-008
The system MUST show Upload documents after a valid save of the commercial transporter details page, the back link there opening the transporter list.

#### Scenario: A valid save from the form shows Upload documents, whose back link opens the transporter list
**ID**: SCN-COMMERCIAL-TRANS-008-A
- **GIVEN** the user opened the commercial transporter details form from the transporter type question and filled it in
- **WHEN** they select "Save and continue"
- **THEN** Upload documents is shown
- **AND** its back link opens the transporter list

#### Scenario: A valid save from a Change link on the transporter list shows Upload documents, whose back link opens the transporter list
**ID**: SCN-COMMERCIAL-TRANS-008-B
- **GIVEN** the user reached the commercial transporter details form from the review's Change link and filled it in
- **WHEN** they select "Save and continue"
- **THEN** Upload documents is shown
- **AND** its back link opens the transporter list
