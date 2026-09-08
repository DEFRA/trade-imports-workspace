# Commodity Obligations Specification

## Purpose

What the commodities on a notification bring into play — the largest set of obligations in the journey, reaching each animal's identifiers, a line's package count, the County Parish Holding number and unweaned animals.

## Requirements

### Requirement: A commodity that calls for a County Parish Holding number brings it into play for the whole notification
The system MUST ask the notification for a County Parish Holding number, as a mandatory answer, when any one of its commodity lines carries a commodity that calls for one, judged across every line rather than only the most recently added.

#### Scenario: Adding a commodity that calls for a CPH number brings it into play
- **GIVEN** a notification whose commodity lines do not call for a County Parish Holding number
- **WHEN** the user adds a commodity line whose commodity does call for one
- **THEN** the County Parish Holding number is asked for, as a mandatory answer for the notification as a whole

#### Scenario: A notification with no such commodity is not asked for one
- **GIVEN** a notification whose commodity lines carry no commodity calling for a County Parish Holding number
- **WHEN** the user works through the journey
- **THEN** the County Parish Holding number is not asked for

### Requirement: A commodity that requires unweaned-animal tracking brings that question into play for the whole notification
The system MUST ask whether the consignment contains unweaned animals, as a mandatory answer, when any one of its commodity lines carries an equine, cattle, pig, sheep or goat commodity, and MUST NOT ask it otherwise.

#### Scenario: Adding a commodity requiring unweaned tracking brings the question into play
- **GIVEN** a notification whose commodity lines carry no commodity requiring unweaned-animal tracking
- **WHEN** the user adds a line carrying an equine, cattle, pig, sheep or goat commodity
- **THEN** the notification is asked whether it contains unweaned animals, as a mandatory answer

### Requirement: Only a commodity that is counted in packages is asked for a number of packages
The system MUST ask a commodity line for a number of packages, as an optional answer, only where that line's commodity is one counted in packages.

#### Scenario: A line whose commodity is counted in packages is asked for a package count
- **GIVEN** the user has added a commodity line
- **WHEN** its commodity is one counted in packages
- **THEN** that line is asked for a number of packages, as an optional answer

### Requirement: A line's commodity decides which identifiers its animals are asked for, and a commodity can call for more than one
The system MUST ask each animal on a commodity line only for the identifiers its commodity calls for — a microchip, a passport, a tattoo, an ear tag or a horse name — each as an optional answer, MUST NOT ask for an identifier the commodity does not call for, and MUST ask for every identifier a commodity calls for where it calls for more than one.

#### Scenario: A commodity calling for particular identifiers asks only for those
- **GIVEN** the user is entering identification details for an animal on a commodity line
- **WHEN** that line's commodity calls for a passport, a tattoo and an ear tag, but not a microchip
- **THEN** the passport, tattoo and ear tag are all asked for
- **AND** the microchip is not asked for

#### Scenario: A commodity calling for two identifiers asks for both together
- **GIVEN** the user is entering identification details for an animal on a commodity line
- **WHEN** that line's commodity calls for both a microchip and a horse name
- **THEN** both are asked for together

### Requirement: A commodity with no identifier of its own asks for a free-text description instead
The system MUST ask for identification details and a description, each as an optional answer, for an animal whose commodity calls for none of the microchip, passport, tattoo, ear tag or horse name, and MUST NOT ask for those free-text answers where the commodity calls for a specific identifier.

#### Scenario: A commodity with no specific identifier asks for the free-text answers
- **GIVEN** the user is entering identification details for an animal on a commodity line
- **WHEN** that line's commodity calls for none of the specific identifiers
- **THEN** identification details and a description are asked for instead

#### Scenario: A commodity with a specific identifier does not ask for the free-text answers
- **GIVEN** the user is entering identification details for an animal on a commodity line
- **WHEN** that line's commodity calls for a specific identifier
- **THEN** the free-text identification details and description are not asked for

### Requirement: A commodity that requires a permanent address asks for one per animal
The system MUST ask for a permanent address for each animal on a line whose commodity requires one, as a mandatory answer, and MUST NOT ask for it otherwise.

#### Scenario: A commodity requiring a permanent address asks for one for each animal
- **GIVEN** the user is entering identification details for an animal on a commodity line
- **WHEN** that line's commodity requires a permanent address
- **THEN** a permanent address is asked for, as a mandatory answer for that animal

