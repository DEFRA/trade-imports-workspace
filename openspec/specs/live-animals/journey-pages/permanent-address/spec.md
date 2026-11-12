# Permanent Address Page Specification

## Purpose

Asks, for each animal on the notification that needs one, whether it lives at the place of destination or at a new address, one card per animal. Reached only from the consignment addresses page's permanent address section, for a consignment carrying a cat, dog or ferret. The page is titled "Permanent address", and it ends with Save and continue alone on a draft and while the notification is being amended (`live-animals/journey-flow`'s REQ-FLOW-012 and REQ-FLOW-013). The page refuses an invalid new address and an unready place-of-destination choice, answering with the shared error-state title prefix (`live-animals/page-titles`).

## Requirements

### Requirement: The page's chrome names the journey section and returns to the consignment addresses page
**ID**: REQ-PERM-ADDR-001
While the page shows no errors, the system MUST caption the page "Consignment parties", head it "Permanent address" and title the browser tab "Permanent address - Import notification service - GOV.UK"; it MUST return the user, when they follow the back link, to the consignment addresses page. See REQ-PERM-ADDR-015 for the title's error-state prefix.

#### Scenario: The page shows its caption, heading and browser title, and returns to the consignment addresses page
**ID**: SCN-PERM-ADDR-001-A
- **GIVEN** the user has followed "Add a permanent address" from the consignment addresses page, and the page shows no errors
- **WHEN** the permanent address page loads
- **THEN** it is captioned "Consignment parties", headed "Permanent address" and titled "Permanent address - Import notification service - GOV.UK"
- **AND** following the back link returns to the consignment addresses page

### Requirement: The page warns that a false address is fraud
**ID**: REQ-PERM-ADDR-002
The system MUST warn the user, on the permanent address page, that providing a false address is an act of fraud.

#### Scenario: The permanent address page carries the fraud warning
**ID**: SCN-PERM-ADDR-002-A
- **GIVEN** the user is on the permanent address page
- **WHEN** the page loads
- **THEN** the warning "Providing a false address is an act of fraud" is shown

### Requirement: The page shows one card for each animal that needs a permanent address
**ID**: REQ-PERM-ADDR-003
The system MUST show one card for each animal, on a commodity line whose commodity and species pair needs a permanent address, that already has an identifier record, titled by its scientific name and a running number such as "Felis catus 1", in line and record order. A commodity line of a species that does not need a permanent address MUST get no card.

#### Scenario: A cat line of two animals and a ferret line of one get three cards, and a non-pet line on the same consignment gets none
**ID**: SCN-PERM-ADDR-003-A
- **GIVEN** a notification with a cat line of two identified animals, a ferret line of one identified animal and a cattle line
- **WHEN** the user opens the permanent address page
- **THEN** three cards are shown, titled "Felis catus 1", "Felis catus 2" and "Mustela putorius furo 1"
- **AND** no card is shown for the cattle line

### Requirement: Each card insets the identifiers already entered for that animal
**ID**: REQ-PERM-ADDR-004
The system MUST show, inside each card, the identifiers already entered for that animal as "label: value", such as "Microchip: MICROCHIP-1", one per entered identifier, leaving out any identifier the animal was not given.

#### Scenario: A card insets only the identifiers the animal carries
**ID**: SCN-PERM-ADDR-004-A
- **GIVEN** an animal with a microchip entered and no passport or tattoo
- **WHEN** the user views its card
- **THEN** the card insets "Microchip: MICROCHIP-1" alone

### Requirement: Each card asks whether the animal lives at the place of destination or at a new address
**ID**: REQ-PERM-ADDR-005
The system MUST ask, as each card's own radio group legend, "Select an address", offering "Same as the place of destination (POD)" and "Enter a new address", with neither selected when the page first opens. Once a place of destination has been given, the first option MUST be hinted with that address on one line, name first.

#### Scenario: Neither option is selected on first opening
**ID**: SCN-PERM-ADDR-005-A
- **GIVEN** an animal with no permanent address yet saved
- **WHEN** the user opens its card
- **THEN** neither "Same as the place of destination (POD)" nor "Enter a new address" is selected

#### Scenario: The first option is hinted with the place of destination on one line once one is given
**ID**: SCN-PERM-ADDR-005-B
- **GIVEN** a place of destination named "Riverside Holding Facility" at "East Farm Road, Leeds, LS25 3EB, United Kingdom"
- **WHEN** the user views a card
- **THEN** "Same as the place of destination (POD)" is hinted "Riverside Holding Facility, East Farm Road, Leeds, LS25 3EB, United Kingdom"

### Requirement: Choosing a new address reveals that animal's own address fields
**ID**: REQ-PERM-ADDR-006
The system MUST hint "Enter a new address" with "This is where they will stay after spending 48 hours at the place of destination.", and MUST reveal, only for the chosen animal, its own name or organisation name, address line 1, address line 2, town or city, county, postcode or Zip code, email address and phone number fields, in that order, asking no country, with the phone field hinted for the country code.

#### Scenario: Choosing Enter a new address reveals that animal's fields alone, in order, with no country field
**ID**: SCN-PERM-ADDR-006-A
- **GIVEN** a consignment with two animals needing a permanent address
- **WHEN** the user chooses "Enter a new address" on the first animal's card
- **THEN** that card alone reveals "Name or organisation name", "Address line 1", "Address line 2 (optional)", "Town or city", "County (optional)", "Postcode or Zip code", "Email address" then "Phone number", in that order
- **AND** no country field is shown
- **AND** the phone field is hinted "For international numbers include the country code"

### Requirement: Saving the permanent address page returns to the consignment addresses page
**ID**: REQ-PERM-ADDR-007
The system MUST save the page's answers and return to the consignment addresses page when the primary save control is pressed and every answer passes. See REQ-PERM-ADDR-015 for a refused save.

#### Scenario: Saving returns to the consignment addresses page
**ID**: SCN-PERM-ADDR-007-A
- **GIVEN** the user is on the permanent address page, with every card's answer passing
- **WHEN** they press the primary save control
- **THEN** they return to the consignment addresses page

### Requirement: Each animal's choice and address are stored and read back when the page reopens
**ID**: REQ-PERM-ADDR-008
The system MUST store, for each answered animal, which option was chosen and, for a hand-entered address, a county and a blank second address line in their own fields with country United Kingdom; reopening the page MUST show the stored option selected and, for a hand-entered address, every value back in its own field.

#### Scenario: An animal saved at the place of destination reopens with that option selected
**ID**: SCN-PERM-ADDR-008-A
- **GIVEN** an animal saved as living at the place of destination
- **WHEN** the permanent address page reopens
- **THEN** "Same as the place of destination (POD)" is selected for that animal

#### Scenario: A hand-entered address with a county and no second line reopens with each value in its own field and country United Kingdom
**ID**: SCN-PERM-ADDR-008-B
- **GIVEN** an animal saved with a hand-entered address giving a county and no address line 2
- **WHEN** the permanent address page reopens
- **THEN** "Enter a new address" is selected for that animal
- **AND** the county is shown in "County", the town in "Town or city" and the postcode in "Postcode or Zip code", each in its own field
- **AND** the stored record's country is United Kingdom

### Requirement: An animal left with neither option chosen is saved with no permanent address
**ID**: REQ-PERM-ADDR-009
The system MUST save the other animals when one is left with neither option chosen, storing no permanent address and no choice for that animal, and MUST NOT refuse the save.

#### Scenario: Leaving one animal unanswered saves the others and returns to the consignment addresses page
**ID**: SCN-PERM-ADDR-009-A
- **GIVEN** a consignment with two animals needing a permanent address
- **WHEN** the user answers one and leaves the other with neither option chosen, then saves
- **THEN** the answered animal's choice and address are stored
- **AND** the other animal has no permanent address and no choice stored
- **AND** the user returns to the consignment addresses page, which still offers to add a permanent address

### Requirement: A consignment with no animal needing a permanent address sends the page to the consignment addresses page
**ID**: REQ-PERM-ADDR-010
The system MUST send the user straight to the consignment addresses page, saving nothing, when the notification carries no commodity line whose commodity and species pair needs a permanent address. See REQ-PERM-ADDR-016 for a line that needs one with no animal identified yet.

#### Scenario: A consignment with no cat, dog or ferret line is sent to the consignment addresses page
**ID**: SCN-PERM-ADDR-010-A
- **GIVEN** a notification with no cat, dog or ferret commodity line
- **WHEN** the user opens the permanent address page's address directly
- **THEN** they are sent to the consignment addresses page

### Requirement: The page has no serious or critical accessibility violations
**ID**: REQ-PERM-ADDR-011
The system MUST show the permanent address page with no serious or critical accessibility violations, both as first opened, with a card's new-address fields revealed, and when a save has been refused.

#### Scenario: The page and its revealed state have no serious or critical accessibility violations
**ID**: SCN-PERM-ADDR-011-A
- **GIVEN** the user is on the permanent address page
- **WHEN** it is checked as first opened, and again with a card's "Enter a new address" fields revealed
- **THEN** neither state has a serious or critical accessibility violation

#### Scenario: The refused state has no serious or critical accessibility violations
**ID**: SCN-PERM-ADDR-011-B
- **GIVEN** a save refused on the permanent address page
- **WHEN** the refused page is checked
- **THEN** it has no serious or critical accessibility violation

### Requirement: Choosing a new address requires its own fields, with no format check and the shared over-long message
**ID**: REQ-PERM-ADDR-012
When a card chooses "Enter a new address", the system MUST require its name or organisation name, address line 1, town or city, postcode or Zip code, email address and phone number, refusing each with its own message when blank. Address line 2 and county MAY be blank. No format is checked for email, phone or postcode. A value past a field's character limit MUST be refused with the same over-long message the service's other address form shows for that field.

#### Scenario: A blank new address shows the six required messages on their own fields
**ID**: SCN-PERM-ADDR-012-A
- **GIVEN** a card with "Enter a new address" chosen and every field left blank
- **WHEN** the user saves
- **THEN** "Enter a name or organisation name", "Enter address line 1", "Enter a town or city", "Enter a postcode or Zip code", "Enter an email address" and "Enter a phone number" each show on their own field

#### Scenario: A new address giving only address line 2 and county is still refused for the six required fields
**ID**: SCN-PERM-ADDR-012-B
- **GIVEN** a card with "Enter a new address" chosen, address line 2 and county filled in and the other six fields left blank
- **WHEN** the user saves
- **THEN** the six required fields still show their messages
- **AND** address line 2 and county show no message

#### Scenario: A value past a field's character limit is refused naming that field and its limit
**ID**: SCN-PERM-ADDR-012-C
- **GIVEN** a card's county field holding one character past its limit
- **WHEN** the user saves
- **THEN** the field shows "County must be 100 characters or fewer"

#### Scenario: A malformed email, phone or postcode is saved as typed
**ID**: SCN-PERM-ADDR-012-D
- **GIVEN** a card with "Enter a new address" chosen and a present but malformed email, phone and postcode
- **WHEN** the user saves
- **THEN** the address is saved as typed

#### Scenario: A value at a field's character limit is saved with no message
**ID**: SCN-PERM-ADDR-012-E
- **GIVEN** a card's county field holding exactly its limit of characters
- **WHEN** the user saves
- **THEN** the value is saved and no message shows on the field

### Requirement: The error summary names the card's animal for an address field's refusal; the field itself does not
**ID**: REQ-PERM-ADDR-013
The system MUST name the card's animal, in the error summary entry for a refused address field, by joining that field's own message to the animal's title; the message shown on the field itself MUST name no animal.

#### Scenario: The summary names the animal while the field stays plain
**ID**: SCN-PERM-ADDR-013-A
- **GIVEN** a blank new address refused on the card titled "Felis catus 1"
- **WHEN** the user views the error summary and the field
- **THEN** the summary shows "Enter a name or organisation name for Felis catus 1" and "Enter address line 1 for Felis catus 1"
- **AND** the field itself shows "Enter address line 1"

### Requirement: Choosing the place of destination before the notification has one is refused, naming no animal
**ID**: REQ-PERM-ADDR-014
The system MUST refuse choosing "Same as the place of destination (POD)" before the notification has a place of destination, showing "Add a place of destination before you can continue" on that card's radio group and in an error summary titled "There is a problem", linked to the radios, naming no animal. Once the notification has a place of destination, the same choice MUST save.

#### Scenario: The choice is refused before a place of destination exists
**ID**: SCN-PERM-ADDR-014-A
- **GIVEN** a card choosing "Same as the place of destination (POD)" on a notification with no place of destination
- **WHEN** the user saves
- **THEN** "Add a place of destination before you can continue" shows on that card's radio group and in the error summary, naming no animal

#### Scenario: The same choice saves once a place of destination is given
**ID**: SCN-PERM-ADDR-014-B
- **GIVEN** a card choosing "Same as the place of destination (POD)" on a notification that has a place of destination
- **WHEN** the user saves
- **THEN** the choice is saved

### Requirement: A refused save keeps every card's answers, changes nothing, and answers with a 400 error-state title
**ID**: REQ-PERM-ADDR-015
When a save is refused, the system MUST keep every card's chosen option selected and a chosen "Enter a new address" open with what was typed, MUST change nothing on the notification, MUST answer with HTTP status 400 and MUST open the browser title with "Error: ".

#### Scenario: Every card keeps its chosen option and typed values
**ID**: SCN-PERM-ADDR-015-A
- **GIVEN** one card refused and a second card answered on the same save
- **WHEN** the page is shown again
- **THEN** both cards keep their own chosen option selected and their own typed values in their own fields
- **AND** nothing is written for either

#### Scenario: The refused page answers with status 400 and an error-prefixed title
**ID**: SCN-PERM-ADDR-015-B
- **GIVEN** a save that is refused
- **WHEN** the page is shown again
- **THEN** it answers with HTTP status 400
- **AND** the browser title opens with "Error: "

### Requirement: A line that needs a permanent address with no animal identified yet shows a message in place of the cards
**ID**: REQ-PERM-ADDR-016
When a commodity line needs a permanent address but no animal on it has been identified yet, the system MUST show no cards and instead show "Add the number of animals on consignment details before you can continue.", with "consignment details" linking to the consignment details page, still offering the save control; saving from there MUST leave the notification as it was and return to the consignment addresses page.

#### Scenario: The page shows the message and link in place of the cards
**ID**: SCN-PERM-ADDR-016-A
- **GIVEN** a commodity line that needs a permanent address with no animal identified on it yet
- **WHEN** the user opens the permanent address page
- **THEN** no card is shown
- **AND** "Add the number of animals on consignment details before you can continue." is shown, with "consignment details" linking to the consignment details page
- **AND** the save control still renders

#### Scenario: Saving from the message state changes nothing and returns to the consignment addresses page
**ID**: SCN-PERM-ADDR-016-B
- **GIVEN** the permanent address page is showing the message in place of the cards
- **WHEN** the user presses the save control
- **THEN** the notification is unchanged
- **AND** the user returns to the consignment addresses page
