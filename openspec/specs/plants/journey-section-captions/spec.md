# Section Captions Specification

## Purpose

The parts a high-risk plants notification is divided into as named to the user, shown above the heading of each question page so someone part-way through can tell where they are.

## Requirements

### Requirement: A question page names the part of the notification it belongs to, above its heading
**ID**: REQ-PLANTS-CAPTIONS-001
The system MUST show, above the heading of a question page, the name of the part of the notification that page belongs to. The parts named MUST be: About the consignment, Arrival, Destination, and Consignment parties.

#### Scenario: A question page is captioned with the part it belongs to
**ID**: SCN-PLANTS-CAPTIONS-001-A
- **GIVEN** the user is on a question page that belongs to a part of the notification
- **WHEN** the page is shown
- **THEN** the name of that part is shown immediately above the page's heading

#### Scenario: Every page of a part carries the same caption
**ID**: SCN-PLANTS-CAPTIONS-001-B
- **GIVEN** two question pages that belong to the same part of the notification
- **WHEN** the user visits each in turn
- **THEN** both are captioned with that part's name

### Requirement: The dashboard carries its own caption, unlike Overview
**ID**: REQ-PLANTS-CAPTIONS-002
The system MUST show a "Dashboard" caption immediately above the dashboard's own heading, even though Overview — reached once a notification exists — carries none.

#### Scenario: The dashboard is captioned, where Overview is not
**ID**: SCN-PLANTS-CAPTIONS-002-A
- **GIVEN** the user opens the dashboard
- **WHEN** the page is shown
- **THEN** a "Dashboard" caption is shown immediately above its heading
- **AND** this is unlike Overview, which is not captioned

### Requirement: The parts named in the caption are not the same grouping as the Overview sections
**ID**: REQ-PLANTS-CAPTIONS-003
The system MUST name the parts of the notification independently of the four numbered sections Overview groups its tasks under, and MUST NOT be assumed to match them. The caption separates Arrival and Destination, where Overview files both under "Arrival and destination", and it captions consignor and identification numbers as "Consignment parties", where Overview also lists the contact address under that numbered heading while the contact page itself carries no caption.

#### Scenario: A page's caption does not name the Overview section its task sits under
**ID**: SCN-PLANTS-CAPTIONS-003-A
- **GIVEN** the arrival-details page, whose task Overview lists under "Arrival and destination"
- **WHEN** the user opens that page
- **THEN** it is captioned "Arrival", not the name of the Overview section its task sits under

### Requirement: A page that is not part of the journey's questioning carries no caption
**ID**: REQ-PLANTS-CAPTIONS-004
The system MUST NOT caption a page that does not sit within a part of the notification — Overview, check your answers, the contact address page, the declaration and the confirmation open straight into their heading, and deleting a notification or cancelling an amendment are interruptions rather than steps.

#### Scenario: A page outside the questioning opens straight into its heading
**ID**: SCN-PLANTS-CAPTIONS-004-A
- **GIVEN** the user opens Overview, check your answers, the contact address page, the declaration or the confirmation
- **WHEN** the page is shown
- **THEN** no part name is shown above its heading
