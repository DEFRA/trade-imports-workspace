# Permanent Address Page Specification

## Purpose

Asks, for each animal on the notification that needs one, whether it lives at the place of destination or at a new address, one card per animal. Reached only from the consignment addresses page's permanent address section, for a consignment carrying a cat, dog or ferret. The page is titled "Permanent address", and it ends with Save and continue alone on a draft and while the notification is being amended (`live-animals/journey-flow`'s REQ-FLOW-012 and REQ-FLOW-013).

## Requirements

### Requirement: The page's chrome names the journey section and returns to the consignment addresses page
**ID**: REQ-PERM-ADDR-001
The system MUST caption the page "Consignment parties", head it "Permanent address", title the browser tab "Permanent address - Import notification service - GOV.UK", and MUST return the user, when they follow the back link, to the consignment addresses page.

#### Scenario: The page shows its caption, heading and browser title, and returns to the consignment addresses page
**ID**: SCN-PERM-ADDR-001-A
- **GIVEN** the user has followed "Add a permanent address" from the consignment addresses page
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
The system MUST save the page's answers and return to the consignment addresses page when the primary save control is pressed.

#### Scenario: Saving returns to the consignment addresses page
**ID**: SCN-PERM-ADDR-007-A
- **GIVEN** the user is on the permanent address page
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
The system MUST send the user straight to the consignment addresses page, saving nothing, when the notification carries no commodity line whose commodity and species pair needs a permanent address, or when it does but no animal on that line has been identified yet.

#### Scenario: A consignment with no cat, dog or ferret line is sent to the consignment addresses page
**ID**: SCN-PERM-ADDR-010-A
- **GIVEN** a notification with no cat, dog or ferret commodity line
- **WHEN** the user opens the permanent address page's address directly
- **THEN** they are sent to the consignment addresses page

### Requirement: The page has no serious or critical accessibility violations
**ID**: REQ-PERM-ADDR-011
The system MUST show the permanent address page with no serious or critical accessibility violations, both as first opened and with a card's new-address fields revealed.

#### Scenario: The page and its revealed state have no serious or critical accessibility violations
**ID**: SCN-PERM-ADDR-011-A
- **GIVEN** the user is on the permanent address page
- **WHEN** it is checked as first opened, and again with a card's "Enter a new address" fields revealed
- **THEN** neither state has a serious or critical accessibility violation
