# Transporter Selection Page Specification

## Purpose

Asks which commercial transporter is carrying the consignment, chosen from those already known to the service. The page is titled "Search for an approved commercial transporter".

## Requirements

### Requirement: The page asks which transporter is carrying the consignment, with none chosen in advance
The system MUST ask the user to choose the transporter carrying the consignment, listing the transporters available with each one's address and approval number, offering a save-and-continue action, and MUST leave every transporter unchosen when the page is first opened.

#### Scenario: The page presents its list with no transporter preselected
- **GIVEN** the user has reached the transporter selection page without answering it before
- **WHEN** the page loads
- **THEN** it asks which transporter is carrying the consignment, listing each available transporter with its address and approval number, and a save-and-continue action
- **AND** no transporter is shown as chosen

### Requirement: A chosen transporter is accepted and kept on return
The system MUST accept a chosen transporter, saving it without error, and MUST show it still chosen when the user returns to the page.

#### Scenario: Choosing a transporter saves without error
- **GIVEN** the user is on the transporter selection page
- **WHEN** they choose a transporter and save and continue
- **THEN** the answer is saved and no error summary is shown

#### Scenario: The chosen transporter is still shown selected on return
- **GIVEN** the user has chosen a transporter and saved
- **WHEN** they return to the transporter selection page
- **THEN** that transporter is still shown as chosen
