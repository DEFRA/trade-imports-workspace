# Private Transporter Details Page Specification

## Purpose

Asks for the name and address of a private transporter, keyed in by hand rather than chosen from the address book. Reached only via "Add a transporter" from the transporter list, after choosing "Private" on the type question — not as a mandatory branch of the transport section itself. The address itself is governed by `live-animals/addresses`. The page is titled "Add a private transporter" and carries no notification status strip.

## Requirements

### Requirement: The page asks for the transporter's name and full contact address, with two fields optional, closing at a Contact details heading with email before phone
**ID**: REQ-PRIVATE-TRANS-001
The system MUST show the private transporter's name or organisation name field as the first thing under the page's heading, and MUST ask for a full address — address line 1, an optional address line 2, town or city, an optional county, postal or zip code and country — then, under an "Enter contact details" heading, an email address followed by a telephone number, offering a save-and-continue action. The telephone field MUST hint that an international number should include its country code.

#### Scenario: The page presents its name and address questions, marking two fields optional
**ID**: SCN-PRIVATE-TRANS-001-A
- **GIVEN** the user has chosen the private transporter type and reached the private transporter details page
- **WHEN** the page loads
- **THEN** the name or organisation name field is the first thing under the page's heading
- **AND** it goes on to ask for address line 1, address line 2, a town or city, a county, a postal or zip code and a country, then under an "Enter contact details" heading an email address and a telephone number
- **AND** address line 2 and county are marked optional
- **AND** the telephone field hints that an international number should include its country code

#### Scenario: The contact details close the form, email before phone
**ID**: SCN-PRIVATE-TRANS-001-B
- **GIVEN** the user is on the private transporter details page
- **WHEN** the page loads
- **THEN** the address ends at country, then an "Enter contact details" heading introduces the email address field followed by the telephone number field

### Requirement: The Country select opens with the United Kingdom chosen and offers only country names, in alphabetical order
**ID**: REQ-PRIVATE-TRANS-008
The system MUST open the private transporter's Country select with the United Kingdom chosen, and MUST offer nothing but country names, listed in alphabetical order with the United Kingdom in its alphabetical place.

#### Scenario: The Country select opens on the United Kingdom among country names in alphabetical order
**ID**: SCN-PRIVATE-TRANS-008-A
- **GIVEN** the user reaches the private transporter details page
- **WHEN** the page loads
- **THEN** the Country select shows the United Kingdom chosen
- **AND** every option is a country name, listed in alphabetical order with the United Kingdom in its alphabetical place

### Requirement: A complete set of private transporter details is saved as one record and reloads into the form
**ID**: REQ-PRIVATE-TRANS-002
The system MUST save the transporter's name and address together as a single record once every mandatory field is given, MUST return the user to the transporter list with the saved transporter chosen, and MUST show the saved values again in the form when they return to the page.

#### Scenario: Completing the details saves them and returns to the transporter list, chosen
**ID**: SCN-PRIVATE-TRANS-002-A
- **GIVEN** the user is on the private transporter details page with the name entered
- **WHEN** they complete every mandatory address field and save and continue
- **THEN** they return to the transporter list, with the saved transporter already chosen

#### Scenario: Returning to the page shows the saved details in the form
**ID**: SCN-PRIVATE-TRANS-002-B
- **GIVEN** the user has saved a complete set of private transporter details
- **WHEN** they return to the private transporter details page
- **THEN** the name and country they saved are shown in the form

### Requirement: A saved private transporter returns the user to the transporter list already chosen, and survives the list's own save
**ID**: REQ-PRIVATE-TRANS-007
The system MUST land the user who saves a private transporter on the transporter list with it already chosen for the notification, and MUST leave its saved details unchanged when the list is saved again.

#### Scenario: The save puts the trader straight on the list with the new transporter checked, surviving the list's own save
**ID**: SCN-PRIVATE-TRANS-007-A
- **GIVEN** the user has just saved a complete set of private transporter details
- **WHEN** the save lands
- **THEN** the transporter list is shown with that transporter's row checked
- **WHEN** they save the list without changing the choice
- **THEN** they return to Overview, and the private transporter form still shows the saved name, country and email address

### Requirement: The page ends with exactly a primary save and a secondary cancel, which abandons the add and leaves an unchanged type's chosen transporter alone
**ID**: REQ-PRIVATE-TRANS-005
The system MUST end the page with exactly two controls: a primary "Save and continue" and a secondary "Cancel and return to dashboard". The secondary MUST discard whatever the form holds and take the user to the dashboard, wherever the notifications list lives.

#### Scenario: The page offers exactly the primary and the cancel control
**ID**: SCN-PRIVATE-TRANS-005-A
- **GIVEN** the user is on the private transporter details page
- **WHEN** the page loads
- **THEN** it ends with exactly "Save and continue" and a secondary "Cancel and return to dashboard", and offers no link back to the overview

#### Scenario: Cancelling with the stored type unchanged leaves the chosen transporter alone and shows no error
**ID**: SCN-PRIVATE-TRANS-005-B
- **GIVEN** the user already has a transporter of the private type chosen, and reaches the private transporter details page with some or all fields filled in
- **WHEN** they choose "Cancel and return to dashboard"
- **THEN** no error is shown, no transporter is added, and they are taken to the dashboard
- **AND** the transporter they had chosen before the add began is still chosen on the transporter list

### Requirement: Values a refused save left behind are shown again until the form is saved or cancelled
**ID**: REQ-PRIVATE-TRANS-006
The system MUST remember the values a refused save entered, and MUST show them again in the form the next time the user opens it, until that form is saved or cancelled.

#### Scenario: Leaving a refused form and returning to it shows what was entered
**ID**: SCN-PRIVATE-TRANS-006-A
- **GIVEN** the user's save of the private transporter details was refused for a missing or invalid field
- **WHEN** they leave the page and later open it again
- **THEN** the values they had entered are shown in the fields, not the previously saved answer

### Requirement: A blank mandatory field, an over-length one, and an invalid country are each rejected in their own way
**ID**: REQ-PRIVATE-TRANS-003
The system MUST reject a blank mandatory field, a field over its maximum length, or a country not in the offered list, in each case linking the resulting error to and focusing the field at fault while preserving every other field already entered. An over-length value MUST be preserved so it can be edited down; an invalid country MUST instead leave the Country select showing the United Kingdom, the country it opens on, while the error names the country.

#### Scenario: A blank mandatory field blocks the save without losing the rest of the address
**ID**: SCN-PRIVATE-TRANS-003-A
- **GIVEN** the user has left one mandatory field blank in the private transporter's address
- **WHEN** they try to save
- **THEN** the save is blocked, an error links to and focuses that field, and every other field still shows what was entered

#### Scenario: An over-length field blocks the save with its value preserved
**ID**: SCN-PRIVATE-TRANS-003-B
- **GIVEN** the user has entered a value longer than a field's maximum length in the private transporter's address
- **WHEN** they try to save
- **THEN** the save is blocked, an error links to and focuses that field, and the over-length value is still shown

#### Scenario: An invalid country blocks the save and reopens the select on the United Kingdom, rather than preserving
**ID**: SCN-PRIVATE-TRANS-003-C
- **GIVEN** the user has entered a country not in the offered list for the private transporter's address, alongside valid values in every other field
- **WHEN** they try to save
- **THEN** the save is blocked, the error names the country, the Country select shows the United Kingdom, and every other field still shows what was entered

### Requirement: The private transporter form's mandatory fields are required outright, not only once another has been filled in
**ID**: REQ-PRIVATE-TRANS-004
The system MUST require the private transporter's mandatory fields from the moment the page opens, not only once the user has started filling the form in, and MUST refuse a save that leaves any blank — a wholly blank form included — keeping the user on the page with the error summary naming every missing field in the page's own field order.

#### Scenario: Saving a wholly blank form is refused, naming every required field in order
**ID**: SCN-PRIVATE-TRANS-004-A
- **GIVEN** the user is on the private transporter details page with every field blank
- **WHEN** they save and continue
- **THEN** the save is refused, the trader stays on the form, and the error summary lists the six required messages in the page's own field order
