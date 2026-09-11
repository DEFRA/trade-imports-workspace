# Transporter Obligations Specification

## Purpose

What choosing or adding a transporter brings into play. A transporter is chosen from one combined list holding both commercial and private records; adding a record not yet on the list asks its type first, to decide which form to fill in. The list page itself is `live-animals/journey-pages/transporter`; the type question and the two forms it leads to are `live-animals/journey-pages/transporter-type`, `commercial-transporter-details` and `private-transporter-details`.

## Requirements

### Requirement: A transporter is chosen from one combined list, not asked for by type first
**ID**: REQ-OB-TRANSPORTER-001
The system MUST ask the notification for one transporter, chosen from a single list holding every commercial and private transporter the service knows about, as a mandatory answer, and MUST NOT ask for a transporter's type before offering that list.

#### Scenario: The transporter list offers commercial and private transporters together
**ID**: SCN-OB-TRANSPORTER-001-A
- **GIVEN** the user has reached the transporter step
- **WHEN** the page loads
- **THEN** a single list is shown holding both commercial and private transporters
- **AND** no question about transporter type is asked before this list

### Requirement: Adding a transporter not on the list asks its type first, to decide which form to show
**ID**: REQ-OB-TRANSPORTER-002
The system MUST ask for the type of a transporter being added from the list — Commercial or Private — before showing the form for it, MUST show the commercial form only when Commercial is chosen and the private form only when Private is chosen, and MUST return the user to Overview once the add is complete. A record entered this way MUST NOT appear as a pick on the transporter list — it stands as the notification's own answer directly, reachable again only through the add route.

#### Scenario: Adding a commercial transporter asks its type, then the commercial form
**ID**: SCN-OB-TRANSPORTER-002-A
- **GIVEN** the user selects "Add a transporter" from the transporter list
- **WHEN** they choose "Commercial"
- **THEN** the commercial transporter form is shown, not the private one

#### Scenario: Adding a private transporter asks its type, then the private form
**ID**: SCN-OB-TRANSPORTER-002-B
- **GIVEN** the user selects "Add a transporter" from the transporter list
- **WHEN** they choose "Private"
- **THEN** the private transporter details form is shown, not the commercial one

#### Scenario: Completing an add returns to Overview, and the record does not join the list
**ID**: SCN-OB-TRANSPORTER-002-C
- **GIVEN** the user has filled in and saved a transporter added this way
- **WHEN** the save completes
- **THEN** they arrive at Overview, not the transporter list
- **WHEN** they later reopen the transporter list
- **THEN** the added record is not shown there as a pick, and nothing on the list is checked

#### Scenario: The type question returns to the list rather than forward
**ID**: SCN-OB-TRANSPORTER-002-D
- **GIVEN** the user is on the type question reached from "Add a transporter"
- **WHEN** they use the back link
- **THEN** they return to the transporter list

### Requirement: Changing the add-detour's type discards the record the previous type held
**ID**: REQ-OB-TRANSPORTER-003
The system MUST discard a commercial transporter entered through the add route when the type is changed to Private, and a private transporter entered through the add route when the type is changed to Commercial, so returning to the earlier type asks afresh.

#### Scenario: Returning to Commercial after adding as Private shows an empty commercial form
**ID**: SCN-OB-TRANSPORTER-003-A
- **GIVEN** the user has added a commercial transporter through the add route
- **WHEN** they add a transporter again, choose "Private" and save, then add again and choose "Commercial"
- **THEN** the commercial transporter form is shown empty, not the previously entered details

#### Scenario: Returning to Private after adding as Commercial shows an empty private form
**ID**: SCN-OB-TRANSPORTER-003-B
- **GIVEN** the user has added a private transporter through the add route
- **WHEN** they add a transporter again, choose "Commercial" and save, then add again and choose "Private"
- **THEN** the private transporter details form is shown empty, not the previously entered details
