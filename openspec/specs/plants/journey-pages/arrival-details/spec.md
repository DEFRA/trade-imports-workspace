# Arrival Details Page Specification

## Purpose

Asks when the consignment arrives — and for potatoes, what time and where it lands. The page is titled "Arrival details".

## Requirements

### Requirement: The page asks for the arrival date under the sentence the notification's state chooses
**ID**: REQ-PLANTS-ARRIVAL-DETAILS-001
The system MUST ask for the arrival date under one of three labels: "Expected date of arrival" for potatoes; "Expected date of landing in Great Britain" when the consignment has not yet arrived; or "Date the consignment first arrived in Great Britain" when it has already arrived. The page MUST leave the date unanswered when first opened for that notification.

#### Scenario: A potatoes notification is asked for the expected date of arrival
**ID**: SCN-PLANTS-ARRIVAL-DETAILS-001-A
- **GIVEN** a potatoes notification has reached the arrival details
- **WHEN** the page loads
- **THEN** the date question is labelled "Expected date of arrival"

#### Scenario: A not-yet-arrived plants or wood notification is asked for the expected date of landing
**ID**: SCN-PLANTS-ARRIVAL-DETAILS-001-B
- **GIVEN** a plants or wood notification has answered that the consignment has not yet arrived
- **WHEN** the arrival details load
- **THEN** the date question is labelled "Expected date of landing in Great Britain"

#### Scenario: An already-arrived plants or wood notification is asked for the date it first arrived
**ID**: SCN-PLANTS-ARRIVAL-DETAILS-001-C
- **GIVEN** a plants or wood notification has answered that the consignment has already arrived
- **WHEN** the arrival details load
- **THEN** the date question is labelled "Date the consignment first arrived in Great Britain"

### Requirement: A potatoes notification also asks for the time and the place of landing
**ID**: REQ-PLANTS-ARRIVAL-DETAILS-002
The system MUST ask a potatoes notification for the expected time of arrival and the proposed place of landing alongside the date, and MUST offer the place of landing as a searchable port field.

#### Scenario: Potatoes see the time and the searchable place of landing
**ID**: SCN-PLANTS-ARRIVAL-DETAILS-002-A
- **GIVEN** a potatoes notification is on the arrival details
- **WHEN** the page loads
- **THEN** it asks for the expected time of arrival and the proposed place of landing
- **AND** the place of landing is a searchable field

### Requirement: The place-of-landing field offers ports by name or code and shows the chosen port as name and code together
**ID**: REQ-PLANTS-ARRIVAL-DETAILS-003
The system MUST let the user find a proposed place of landing by typing a port's name or code, MUST show the chosen port as its name and code together, and MUST submit and keep the port's code.

#### Scenario: Choosing a port shows its name and code and is kept on return
**ID**: SCN-PLANTS-ARRIVAL-DETAILS-003-A
- **GIVEN** a potatoes notification is on the arrival details
- **WHEN** they choose a port, complete the page and save it
- **THEN** the port field shows that port's name and code together
- **AND** returning to the page still holds that choice

### Requirement: A complete set of answers for the notification's state is accepted
**ID**: REQ-PLANTS-ARRIVAL-DETAILS-004
The system MUST accept the arrival details once every answer the notification owes on the page is given, saving them without error.

#### Scenario: Answering every potato arrival question saves without error
**ID**: SCN-PLANTS-ARRIVAL-DETAILS-004-A
- **GIVEN** a potatoes notification is on the arrival details
- **WHEN** they answer the date, time and place of landing and save and continue
- **THEN** the answers are saved and no error summary is shown

#### Scenario: Answering the date alone for plants or wood saves without error
**ID**: SCN-PLANTS-ARRIVAL-DETAILS-004-B
- **GIVEN** a plants or wood notification is on the arrival details
- **WHEN** they answer the arrival date and save and continue
- **THEN** the answer is saved and no error summary is shown

### Requirement: Saving the page empty is refused
**ID**: REQ-PLANTS-ARRIVAL-DETAILS-005
The system MUST refuse to save the arrival details when the required answers for the notification's state are missing, showing an error summary that names each missing answer, and MUST focus the date field when the user follows the date error.

#### Scenario: A blank potato page names the date, time and place of landing
**ID**: SCN-PLANTS-ARRIVAL-DETAILS-005-A
- **GIVEN** a potatoes notification is on the arrival details with nothing answered
- **WHEN** they save and continue
- **THEN** an error summary names the missing date, time and place of landing
- **WHEN** they follow the date error
- **THEN** the date field is focused

#### Scenario: A blank plants or wood page names the missing date
**ID**: SCN-PLANTS-ARRIVAL-DETAILS-005-B
- **GIVEN** a plants or wood notification is on the arrival details with nothing answered
- **WHEN** they save and continue
- **THEN** an error summary names the missing arrival date

### Requirement: An impossible date is rejected with its own error, distinct from a missing date
**ID**: REQ-PLANTS-ARRIVAL-DETAILS-006
The system MUST refuse a date that does not exist on the calendar with an error naming that the date is invalid, not that it is missing, and MUST preserve the value typed and the page's other answers.

#### Scenario: A date that names no day is refused and kept
**ID**: SCN-PLANTS-ARRIVAL-DETAILS-006-A
- **GIVEN** the user has answered the other arrival questions the notification owes
- **WHEN** they type a date that does not exist and save and continue
- **THEN** an error says the date is invalid, not that it is missing
- **AND** the date field still holds what was typed
- **AND** the other answers already given are still held

### Requirement: A future date is refused once the consignment has already arrived
**ID**: REQ-PLANTS-ARRIVAL-DETAILS-007
The system MUST refuse an arrival date after today when the consignment has already arrived, with an error saying the date cannot be in the future, and MUST NOT apply that future-date refusal when the consignment has not yet arrived or the notification is for potatoes.

#### Scenario: A future date is refused for an already-arrived consignment
**ID**: SCN-PLANTS-ARRIVAL-DETAILS-007-A
- **GIVEN** a plants or wood notification has answered that the consignment has already arrived
- **WHEN** they enter a future arrival date and save and continue
- **THEN** an error says the date the consignment arrived cannot be in the future

### Requirement: An invalid place of landing is rejected
**ID**: REQ-PLANTS-ARRIVAL-DETAILS-008
The system MUST refuse a proposed place of landing that is not one of the ports the service holds, showing an error against that field.

#### Scenario: A port the service does not hold is refused
**ID**: SCN-PLANTS-ARRIVAL-DETAILS-008-A
- **GIVEN** a potatoes notification has answered the date and time
- **WHEN** the submitted place of landing is not one of the offered ports
- **THEN** an error is shown against the place of landing

### Requirement: An invalid time is rejected, focusing the time field
**ID**: REQ-PLANTS-ARRIVAL-DETAILS-009
The system MUST refuse an expected time of arrival that is not on the 24-hour clock, and MUST focus the time field when the user follows the error.

#### Scenario: A time not on the 24-hour clock is refused
**ID**: SCN-PLANTS-ARRIVAL-DETAILS-009-A
- **GIVEN** a potatoes notification has answered the date and place of landing
- **WHEN** they enter a time that is not on the 24-hour clock and save and continue
- **THEN** an error is shown against the time
- **WHEN** they follow the error
- **THEN** the time field is focused

### Requirement: The page offers a full set of save controls and is reachable from Overview
**ID**: REQ-PLANTS-ARRIVAL-DETAILS-010
The system MUST offer save-and-continue, save-and-return-to-overview and cancel-and-return-to-overview on this page, MUST return the user to Overview when they follow the back link, and MUST reach the page from the Overview arrival task row when that row opens on the details.

#### Scenario: The page is reachable from the Overview arrival row for potatoes
**ID**: SCN-PLANTS-ARRIVAL-DETAILS-010-A
- **GIVEN** a potatoes notification on Overview
- **WHEN** they open the arrival task row
- **THEN** the arrival details page is shown

#### Scenario: Cancel and return to overview reaches Overview without saving
**ID**: SCN-PLANTS-ARRIVAL-DETAILS-010-B
- **GIVEN** the user is on the arrival details
- **WHEN** they enter a date and select cancel-and-return-to-overview
- **THEN** they reach Overview
- **AND** returning to the page shows the date empty

#### Scenario: The back link opens Overview
**ID**: SCN-PLANTS-ARRIVAL-DETAILS-010-C
- **GIVEN** the user is on the arrival details
- **WHEN** they follow the back link
- **THEN** Overview is shown

### Requirement: Completing the arrival details completes the arrival task row
**ID**: REQ-PLANTS-ARRIVAL-DETAILS-011
The system MUST show the Overview arrival task row as completed once the arrival details owed for the notification have been saved.

#### Scenario: Saving the potato answers completes the arrival row
**ID**: SCN-PLANTS-ARRIVAL-DETAILS-011-A
- **GIVEN** a potatoes notification has saved its date, time and place of landing
- **WHEN** the user opens Overview
- **THEN** the arrival task row reads completed
