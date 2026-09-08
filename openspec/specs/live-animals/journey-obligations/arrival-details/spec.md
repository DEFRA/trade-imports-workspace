# Arrival Obligations Specification

## Purpose

What the means of transport brings into play. Only an overland arrival calls for the countries the consignment travels through.

## Requirements

### Requirement: Only an overland means of transport calls for the transited countries
**ID**: REQ-OB-ARRIVAL-001
The system MUST ask which countries the consignment travels through when the means of transport is railway or road vehicle, as a mandatory answer, and MUST NOT ask for them under any other means.

#### Scenario: An overland means of transport asks for the transited countries
**ID**: SCN-OB-ARRIVAL-001-A
- **GIVEN** the user is answering how the consignment arrives
- **WHEN** they choose railway or road vehicle as the means of transport
- **THEN** the countries the consignment travels through are asked for, as a mandatory answer

#### Scenario: A means of transport that is not overland does not ask for them
**ID**: SCN-OB-ARRIVAL-001-B
- **GIVEN** the user is answering how the consignment arrives
- **WHEN** they choose a means of transport other than railway or road vehicle
- **THEN** the countries the consignment travels through are not asked for, and their task row is not shown

### Requirement: Changing away from an overland means discards the transited countries
**ID**: REQ-OB-ARRIVAL-002
The system MUST discard stored transited countries when the means of transport changes to one that is not overland, so that returning to an overland means asks afresh.

#### Scenario: Returning to an overland means asks for the countries again
**ID**: SCN-OB-ARRIVAL-002-A
- **GIVEN** the user has chosen an overland means of transport and saved transited countries
- **WHEN** they change the means to one that is not overland, and later change it back
- **THEN** the transited countries page shows no countries selected, and its task row shows the section incomplete until answered again
