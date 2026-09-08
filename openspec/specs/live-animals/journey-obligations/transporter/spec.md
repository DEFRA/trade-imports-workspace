# Transporter Obligations Specification

## Purpose

What the type of transporter brings into play. The two transporter records are mutually exclusive: each type calls for one and rules out the other.

## Requirements

### Requirement: The transporter type decides which transporter record applies
The system MUST ask for a commercial transporter when the transporter type is Commercial and for private transporter details when it is Private, in each case as a mandatory answer, and MUST NOT ask for either under the other's type.

#### Scenario: Choosing Commercial asks for a commercial transporter only
- **GIVEN** the user is answering the transporter type
- **WHEN** they choose "Commercial"
- **THEN** a commercial transporter is asked for, as a mandatory answer
- **AND** private transporter details are not asked for

#### Scenario: Choosing Private asks for private transporter details only
- **GIVEN** the user is answering the transporter type
- **WHEN** they choose "Private"
- **THEN** private transporter details are asked for, as a mandatory answer
- **AND** a commercial transporter is not asked for

### Requirement: Changing the transporter type discards the record the previous type called for
The system MUST discard a stored commercial transporter when the type changes to Private, and stored private transporter details when it changes to Commercial, so that returning to the earlier type asks afresh.

#### Scenario: Returning to Commercial shows no transporter selected
- **GIVEN** the user has chosen "Commercial" and selected a transporter
- **WHEN** they change the type to "Private", and later change it back to "Commercial"
- **THEN** the commercial selection page shows no transporter selected

#### Scenario: Returning to Private shows an empty details form
- **GIVEN** the user has chosen "Private" and entered transporter details
- **WHEN** they change the type to "Commercial", and later change it back to "Private"
- **THEN** the private transporter details form is shown empty
