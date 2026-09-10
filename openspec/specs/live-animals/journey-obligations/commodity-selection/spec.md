# Commodity Obligations Specification

## Purpose

What the commodities on a notification bring into play — the largest set of obligations in the journey, reaching each animal's identifiers, a line's package count, the County Parish Holding number and unweaned animals.

## Requirements

### Requirement: A commodity that calls for a County Parish Holding number brings it into play for the whole notification
**ID**: REQ-OB-COMMODITY-001
The system MUST ask the notification for a County Parish Holding number, as a mandatory answer, when any one of its commodity lines carries a commodity that calls for one, judged across every line rather than only the most recently added.

#### Scenario: Adding a commodity that calls for a CPH number brings it into play
**ID**: SCN-OB-COMMODITY-001-A
- **GIVEN** a notification whose commodity lines do not call for a County Parish Holding number
- **WHEN** the user adds a commodity line whose commodity does call for one
- **THEN** the County Parish Holding number is asked for, as a mandatory answer for the notification as a whole

#### Scenario: A notification with no such commodity is not asked for one
**ID**: SCN-OB-COMMODITY-001-B
- **GIVEN** a notification whose commodity lines carry no commodity calling for a County Parish Holding number
- **WHEN** the user works through the journey
- **THEN** the County Parish Holding number is not asked for

### Requirement: A commodity that requires unweaned-animal tracking brings that question into play for the whole notification
**ID**: REQ-OB-COMMODITY-002
The system MUST ask whether the consignment contains unweaned animals, as a mandatory answer, when any one of its commodity lines carries a cattle commodity, and MUST NOT ask it for any other commodity, including equine, sheep and goat.

#### Scenario: Adding a commodity requiring unweaned tracking brings the question into play
**ID**: SCN-OB-COMMODITY-002-A
- **GIVEN** a notification whose commodity lines carry no commodity requiring unweaned-animal tracking
- **WHEN** the user adds a line carrying a cattle commodity
- **THEN** the notification is asked whether it contains unweaned animals, as a mandatory answer

#### Scenario: A horse-only consignment is not asked about unweaned animals
**ID**: SCN-OB-COMMODITY-002-B
- **GIVEN** a notification whose only commodity line carries an equine commodity
- **WHEN** the user works through the journey
- **THEN** the notification is not asked whether it contains unweaned animals

### Requirement: Only a commodity that is counted in packages is asked for a number of packages
**ID**: REQ-OB-COMMODITY-003
The system MUST ask a commodity line for a number of packages, as an optional answer, only where that line's commodity is one counted in packages.

#### Scenario: A line whose commodity is counted in packages is asked for a package count
**ID**: SCN-OB-COMMODITY-003-A
- **GIVEN** the user has added a commodity line
- **WHEN** its commodity is one counted in packages
- **THEN** that line is asked for a number of packages, as an optional answer

### Requirement: A line's commodity decides which identifiers its animals are asked for, and a commodity can call for more than one
**ID**: REQ-OB-COMMODITY-004
The system MUST ask each animal on a commodity line only for the identifiers its commodity calls for — a microchip, a passport, a tattoo, an ear tag or a horse name — each as an optional answer, MUST NOT ask for an identifier the commodity does not call for, and MUST ask for every identifier a commodity calls for where it calls for more than one.

#### Scenario: A commodity calling for particular identifiers asks only for those
**ID**: SCN-OB-COMMODITY-004-A
- **GIVEN** the user is entering identification details for an animal on a commodity line
- **WHEN** that line's commodity calls for a microchip, a passport and a tattoo, but not an ear tag
- **THEN** the microchip, passport and tattoo are all asked for
- **AND** the ear tag is not asked for

#### Scenario: A commodity calling for two identifiers asks for both together
**ID**: SCN-OB-COMMODITY-004-B
- **GIVEN** the user is entering identification details for an animal on a commodity line
- **WHEN** that line's commodity calls for both a microchip and a horse name
- **THEN** both are asked for together

### Requirement: A commodity with no identifier of its own is asked for no identifier at all
**ID**: REQ-OB-COMMODITY-005
The system MUST NOT ask for any identifier — typed or free-text — for an animal whose commodity calls for none of the microchip, passport, tattoo, ear tag or horse name. There is no free-text fallback.

#### Scenario: A commodity with no specific identifier is asked for nothing
**ID**: SCN-OB-COMMODITY-005-A
- **GIVEN** the user is entering identification details for an animal on a commodity line
- **WHEN** that line's commodity calls for none of the specific identifiers
- **THEN** no identifier of any kind is asked for that animal

### Requirement: A commodity that requires a permanent address asks for one per animal
**ID**: REQ-OB-COMMODITY-006
The system MUST ask for a permanent address for each animal on a line whose commodity requires one, as a mandatory answer, and MUST NOT ask for it otherwise.

#### Scenario: A commodity requiring a permanent address asks for one for each animal
**ID**: SCN-OB-COMMODITY-006-A
- **GIVEN** the user is entering identification details for an animal on a commodity line
- **WHEN** that line's commodity requires a permanent address
- **THEN** a permanent address is asked for, as a mandatory answer for that animal

