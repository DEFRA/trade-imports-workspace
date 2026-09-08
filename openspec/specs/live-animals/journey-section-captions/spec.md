# Section Captions Specification

## Purpose

The parts a notification is divided into as named to the user, shown above the heading of each question page so someone part-way through can tell where they are.

## Requirements

### Requirement: A question page names the part of the notification it belongs to, above its heading
The system MUST show, above the heading of a question page, the name of the part of the notification that page belongs to. The parts named MUST be: About the consignment, Commodity details, Consignment parties, Movement, Transport and arrival, Add a new transporter, and Documents.

#### Scenario: A question page is captioned with the part it belongs to
- **GIVEN** the user is on a question page that belongs to a part of the notification
- **WHEN** the page is shown
- **THEN** the name of that part is shown immediately above the page's heading

#### Scenario: Every page of a part carries the same caption
- **GIVEN** two question pages that belong to the same part of the notification
- **WHEN** the user visits each in turn
- **THEN** both are captioned with that part's name

### Requirement: The dashboard carries its own caption, unlike Overview
The system MUST show a "Dashboard" caption immediately above the dashboard's own heading, even though Overview — reached once a notification exists — carries none.

#### Scenario: The dashboard is captioned, where Overview is not
- **GIVEN** the user opens the dashboard
- **WHEN** the page is shown
- **THEN** a "Dashboard" caption is shown immediately above its heading
- **AND** this is unlike Overview, which is not captioned

### Requirement: The parts named in the caption are not the same grouping as the Overview sections
The system MUST name the parts of the notification independently of the six numbered sections Overview groups its tasks under, and MUST NOT be assumed to match them. The caption's parts are finer: it keeps animal identification with the other consignment questions, where Overview files it with the commodity work, and it separates arrival, transit and adding a transporter, where Overview puts them together.

#### Scenario: A page's caption does not name the Overview section its task sits under
- **GIVEN** the animal identification page, whose task Overview lists under its commodity details section
- **WHEN** the user opens that page
- **THEN** it is captioned "About the consignment", not the name of the Overview section its task sits under

### Requirement: A page that is not part of the journey's questioning carries no caption
The system MUST NOT caption a page that does not sit within a part of the notification — Overview, check your answers, the contact address page, the declaration and the confirmation open straight into their heading, and deleting a notification or cancelling an amendment are interruptions rather than steps.

#### Scenario: A page outside the questioning opens straight into its heading
- **GIVEN** the user opens Overview, check your answers, the contact address page, the declaration or the confirmation
- **WHEN** the page is shown
- **THEN** no part name is shown above its heading
