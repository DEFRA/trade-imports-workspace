# Transporter Page Specification

## Purpose

Lists every commercial and private transporter the service knows about, letting the user choose one for the consignment or add a new one. The page is titled "Transporter details". Which transporter is required, and what adding one asks, is governed by `live-animals/journey-obligations/transporter`.

## Requirements

### Requirement: The list shows every known transporter in headed columns, with a status tag
**ID**: REQ-TRANSPORTER-001
The system MUST list every transporter the service knows about, each row showing its name, address, approval number ("Not applicable" for a transporter with none), type, and a status tag — green for "Approved", magenta for "New" — under columns headed to match, alongside a radio to choose it.

#### Scenario: The list shows every transporter's key facts under the right column
**ID**: SCN-TRANSPORTER-001-A
- **GIVEN** the user has reached the transporter list
- **WHEN** the page loads
- **THEN** every known transporter is shown as a row under columns headed Name, Address, Approval number, Type and Status
- **AND** a transporter with no approval number reads "Not applicable" in that column

#### Scenario: An approved transporter is tagged green, a newly added one magenta
**ID**: SCN-TRANSPORTER-001-B
- **GIVEN** the transporter list is shown
- **WHEN** a row is for a transporter already approved
- **THEN** it carries a green "Approved" tag
- **WHEN** a row is for a transporter added but not yet approved
- **THEN** it carries a magenta "New" tag

### Requirement: The list can be searched by name, address, approval number, type or status, narrowing as the user types
**ID**: REQ-TRANSPORTER-002
The system MUST offer a labelled search over the transporter list, hinted with what it matches and run from a button named "Search". It MUST narrow the list to transporters matching the term by name, address, approval number, type or status, ignoring case and accents, as the user types when JavaScript is on, and MUST show a message rather than an empty table when nothing matches. A transporter with no approval number MUST be matched by the words its Approval number column shows.

#### Scenario: Searching narrows the list by name, address, approval number, type or status
**ID**: SCN-TRANSPORTER-002-A
- **GIVEN** the user is on the transporter list
- **WHEN** they search by a transporter's name, its address, its approval number, its type or its status
- **THEN** only the matching transporters are shown

#### Scenario: A search matching nothing says so, rather than showing an empty table
**ID**: SCN-TRANSPORTER-002-B
- **GIVEN** the user searches the transporter list for a term matching no transporter
- **WHEN** the results are shown
- **THEN** a message says nothing matched, not an empty table

#### Scenario: Typing narrows the list in place with bold matches and an announced count
**ID**: SCN-TRANSPORTER-002-C
- **GIVEN** the user is on the transporter list with JavaScript on
- **WHEN** they type the plain letters "garcia" into the search box
- **THEN** only the transporter named "García Livestock Transport SL" is shown, with the letters "García" in bold
- **AND** the page does not reload and the search box keeps focus
- **AND** the number of transporters shown is announced
- **WHEN** they press the "Search" button or Enter and then type a term matching another transporter
- **THEN** that transporter is shown

#### Scenario: A transporter chosen before filtering stays chosen when filtered out of view
**ID**: SCN-TRANSPORTER-002-D
- **GIVEN** the user has chosen a transporter on the list with JavaScript on
- **WHEN** they type a term that filters that transporter out of view and save
- **THEN** the transporter they chose is the one saved

#### Scenario: Without JavaScript the button or Enter narrows the list on the server
**ID**: SCN-TRANSPORTER-002-E
- **GIVEN** the user is on the transporter list with JavaScript off
- **WHEN** they enter a term and press the "Search" button or Enter
- **THEN** the list comes back narrowed to the matching transporters
- **AND** the search box still holds the term

#### Scenario: Searching for the words shown where a transporter has no approval number leaves exactly those transporters
**ID**: SCN-TRANSPORTER-002-F
- **GIVEN** the user is on the transporter list
- **WHEN** they search for the words the Approval number column shows for a transporter without one
- **THEN** only the transporters with no approval number are shown
- **WHEN** they search for a real approval number instead
- **THEN** only the transporter it belongs to is shown

### Requirement: The page explains that only a DAERA-authorised transporter is valid, not an EU-authorised one
**ID**: REQ-TRANSPORTER-003
The system MUST tell the user that a transporter authorisation issued by DAERA or APHA is required for transporting live vertebrate animals in, to, from or through Great Britain on journeys over 65 km as part of an economic activity, MUST tell them that documents issued by DAERA are valid for use in GB and that documents issued by any EU member state are not, and MUST offer a link to further guidance.

#### Scenario: The list carries the full authorisation guidance and a link to more detail
**ID**: SCN-TRANSPORTER-003-A
- **GIVEN** the user is on the transporter list
- **WHEN** they read the guidance
- **THEN** it states when a transporter authorisation is required, that DAERA authorisation is valid and EU authorisation is not
- **AND** a link is offered to further guidance

### Requirement: The list offers Add a transporter beside the search, above the transporter choices
**ID**: REQ-TRANSPORTER-004
The system MUST offer "Add a transporter" on the same row as the search, above the list and before the transporter choices in page order, and it MUST open "Choose a transporter type".

#### Scenario: Add a transporter sits beside the search and opens the transporter type question
**ID**: SCN-TRANSPORTER-004-A
- **GIVEN** the user is on the transporter list
- **WHEN** the page loads
- **THEN** "Add a transporter" is shown on the search row, above the list of transporters
- **AND** pressing Tab from the search box reaches the "Search" button, then "Add a transporter", then the transporter choices
- **WHEN** they choose "Add a transporter"
- **THEN** the "Choose a transporter type" page opens

### Requirement: The page names the choice once, above the search and the list
**ID**: REQ-TRANSPORTER-005
The system MUST show a heading "Select a transporter" above the search box and the transporter choices, and MUST offer the choices as one group with that same name for screen readers.

#### Scenario: The heading and the group share the one name
**ID**: SCN-TRANSPORTER-005-A
- **GIVEN** the user is on the transporter list
- **WHEN** the page loads
- **THEN** "Select a transporter" is shown once as a heading above the search box and the table
- **AND** the transporter choices are offered as one group named "Select a transporter"

### Requirement: The page has no serious or critical accessibility violations, in its plain state and with a refused pick
**ID**: REQ-TRANSPORTER-006
The system MUST show the transporter list with no serious or critical accessibility violations against the WCAG 2.0, 2.1 and 2.2 A and AA rules, both with nothing chosen and with a submitted pick that is not on the list refused.

#### Scenario: The list has no serious or critical accessibility violations, plain or with a refused pick
**ID**: SCN-TRANSPORTER-006-A
- **GIVEN** the user is on the transporter list with nothing chosen
- **WHEN** the page loads
- **THEN** the page has no serious or critical accessibility violations
- **WHEN** the user submits a transporter that is not on the list
- **THEN** the page, now showing the error summary and the in-fieldset error message, has no serious or critical accessibility violations
