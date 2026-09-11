# Arrival Obligations Specification

## Purpose

What commodity type and arrival status bring into play for when and how a high-risk plants consignment arrives.

## Requirements

### Requirement: Plants for planting and wood ask whether the consignment has arrived; potatoes do not
**ID**: REQ-PLANTS-OB-ARRIVAL-001
The system MUST ask whether the consignment has already arrived in Great Britain, as a mandatory answer, when the commodity type is plants-for-planting or wood-and-cut-trees, and MUST NOT ask that question when the commodity type is potatoes.

#### Scenario: A plants-for-planting or wood notification is asked whether it has arrived
**ID**: SCN-PLANTS-OB-ARRIVAL-001-A
- **GIVEN** a notification whose commodity type is plants-for-planting or wood-and-cut-trees
- **WHEN** the user reaches the arrival section
- **THEN** whether the consignment has already arrived is asked for, as a mandatory answer

#### Scenario: A potatoes notification is not asked whether it has arrived
**ID**: SCN-PLANTS-OB-ARRIVAL-001-B
- **GIVEN** a notification whose commodity type is potatoes
- **WHEN** the user continues from origin into the arrival section
- **THEN** they are not asked whether the consignment has arrived
- **AND** the Overview arrival task row opens on the arrival details

### Requirement: Every notification owes an arrival date
**ID**: REQ-PLANTS-OB-ARRIVAL-002
The system MUST ask every notification for an arrival date, as a mandatory answer, whatever its commodity type and whether or not it has already arrived.

#### Scenario: An arrival date is owed whatever the commodity type
**ID**: SCN-PLANTS-OB-ARRIVAL-002-A
- **GIVEN** a notification of any commodity type
- **WHEN** the user reaches the arrival details
- **THEN** an arrival date is asked for, as a mandatory answer

### Requirement: Only potatoes ask for the expected time and the proposed place of landing
**ID**: REQ-PLANTS-OB-ARRIVAL-003
The system MUST ask for the expected time of arrival and the proposed place of landing, each as a mandatory answer, only when the commodity type is potatoes, and MUST NOT ask for either when the commodity type is plants-for-planting or wood-and-cut-trees.

#### Scenario: A potatoes notification is asked for time and place of landing as well as the date
**ID**: SCN-PLANTS-OB-ARRIVAL-003-A
- **GIVEN** a notification whose commodity type is potatoes
- **WHEN** the user reaches the arrival details
- **THEN** the expected time of arrival and the proposed place of landing are asked for, each as a mandatory answer, alongside the date

#### Scenario: A plants or wood notification is asked for the date alone
**ID**: SCN-PLANTS-OB-ARRIVAL-003-B
- **GIVEN** a notification whose commodity type is plants-for-planting or wood-and-cut-trees
- **WHEN** the user reaches the arrival details
- **THEN** an arrival date is asked for
- **AND** neither the expected time nor the proposed place of landing is asked for

### Requirement: Changing the arrival-status answer keeps the arrival date
**ID**: REQ-PLANTS-OB-ARRIVAL-004
The system MUST keep an arrival date already given when the user changes whether the consignment has arrived, because every notification still owes a date and only the sentence it is asked under changes.

#### Scenario: Switching between arrived and not-yet-arrived keeps the date
**ID**: SCN-PLANTS-OB-ARRIVAL-004-A
- **GIVEN** a plants or wood notification has answered that the consignment has arrived and has saved an arrival date
- **WHEN** the user changes the answer to say it has not arrived yet
- **THEN** the arrival details still hold that date under the pre-arrival sentence

### Requirement: A late arrival date is accepted rather than refused
**ID**: REQ-PLANTS-OB-ARRIVAL-005
The system MUST accept an arrival date that falls more than four days before today for a consignment that has already arrived, saving it without error, so a late notification is recorded rather than blocked. How lateness is flagged on review and confirmation lives outside this capability.

#### Scenario: A date long past the four-day window is saved
**ID**: SCN-PLANTS-OB-ARRIVAL-005-A
- **GIVEN** a plants or wood notification has answered that the consignment has already arrived
- **WHEN** the user enters an arrival date more than four days in the past and saves
- **THEN** the date is accepted and the arrival task row completes

### Requirement: Changing commodity type clears the arrival answers that leave scope
**ID**: REQ-PLANTS-OB-ARRIVAL-006
The system MUST clear the arrival-status answer when the commodity type changes to potatoes, and MUST clear the expected time and proposed place of landing when the commodity type changes away from potatoes, so returning to a type that asks for them starts those answers again.

#### Scenario: Changing to potatoes clears the arrival-status answer
**ID**: SCN-PLANTS-OB-ARRIVAL-006-A
- **GIVEN** a plants-for-planting or wood notification has answered whether the consignment has arrived
- **WHEN** the commodity type is changed to potatoes
- **THEN** the arrival-status answer is no longer held

#### Scenario: Changing away from potatoes clears the time and place of landing
**ID**: SCN-PLANTS-OB-ARRIVAL-006-B
- **GIVEN** a potatoes notification has saved an expected time and a proposed place of landing
- **WHEN** the commodity type is changed to plants-for-planting or wood-and-cut-trees
- **THEN** the time and place of landing are no longer held
