# Parties Obligations Specification

## Purpose

What the commodity type brings into play for the consignor and identification numbers on a high-risk plants notification.

## Requirements

### Requirement: Plants for planting and wood and cut trees require a consignor; potatoes do not
**ID**: REQ-PLANTS-OB-PARTIES-001
The system MUST ask the notification for a consignor, as a mandatory answer, when the commodity type is plants-for-planting or wood-and-cut-trees, and MUST NOT ask for one when the commodity type is potatoes.

#### Scenario: A plants-for-planting or wood-and-cut-trees notification is asked for a consignor
**ID**: SCN-PLANTS-OB-PARTIES-001-A
- **GIVEN** a notification whose commodity type is plants-for-planting or wood-and-cut-trees
- **WHEN** the user reaches the parties section
- **THEN** a consignor is asked for, as a mandatory answer

#### Scenario: A potatoes notification is not asked for a consignor
**ID**: SCN-PLANTS-OB-PARTIES-001-B
- **GIVEN** a notification whose commodity type is potatoes
- **WHEN** the user works through the journey
- **THEN** no consignor is asked for, and the Overview hub shows no consignor task row

### Requirement: Plants for planting asks for a supplier identification number; potatoes ask for producer and crop numbers instead
**ID**: REQ-PLANTS-OB-PARTIES-002
The system MUST ask for a supplier identification number, as a mandatory answer, only when the commodity type is plants-for-planting, and MUST ask for a producer identification number and a crop identification number, each as a mandatory answer, only when the commodity type is potatoes. Wood-and-cut-trees asks for none of the three.

#### Scenario: Plants for planting asks for the supplier number only
**ID**: SCN-PLANTS-OB-PARTIES-002-A
- **GIVEN** a notification whose commodity type is plants-for-planting
- **WHEN** the user reaches identification numbers
- **THEN** the supplier identification number is asked for, as a mandatory answer
- **AND** the producer and crop identification numbers are not asked for

#### Scenario: Potatoes asks for producer and crop numbers, not supplier
**ID**: SCN-PLANTS-OB-PARTIES-002-B
- **GIVEN** a notification whose commodity type is potatoes
- **WHEN** the user reaches identification numbers
- **THEN** the producer and crop identification numbers are both asked for, each as a mandatory answer
- **AND** the supplier identification number is not asked for

#### Scenario: Wood and cut trees asks for none of the three numbers
**ID**: SCN-PLANTS-OB-PARTIES-002-C
- **GIVEN** a notification whose commodity type is wood-and-cut-trees
- **WHEN** the user reaches identification numbers
- **THEN** none of the supplier, producer or crop identification numbers is asked for

### Requirement: A consignment number is optional for every commodity type
**ID**: REQ-PLANTS-OB-PARTIES-003
The system MUST let the user give a consignment number for every commodity type, as an optional answer never blocked by commodity-type scope.

#### Scenario: The consignment number is offered whatever the commodity type
**ID**: SCN-PLANTS-OB-PARTIES-003-A
- **GIVEN** a notification of any commodity type
- **WHEN** the user reaches identification numbers
- **THEN** the consignment number is asked for, as an optional answer

### Requirement: Changing commodity type clears the answers that leave scope, but keeps the consignment number
**ID**: REQ-PLANTS-OB-PARTIES-004
The system MUST clear the consignor and whichever identification number answers no longer apply when the commodity type changes to one that does not call for them, MUST leave the Overview task rows for those answers unstarted again, and MUST NOT clear the consignment number, which survives any commodity-type change.

#### Scenario: Changing from a consignor-requiring type clears the consignor
**ID**: SCN-PLANTS-OB-PARTIES-004-A
- **GIVEN** a consignor has been chosen for a plants-for-planting or wood-and-cut-trees notification
- **WHEN** the commodity type is changed to potatoes
- **THEN** the consignor is no longer shown as chosen, and the consignor task row reads not yet started

#### Scenario: Changing identification-number scope clears the numbers that no longer apply
**ID**: SCN-PLANTS-OB-PARTIES-004-B
- **GIVEN** a supplier identification number has been saved for a plants-for-planting notification
- **WHEN** the commodity type is changed to potatoes and then back to plants-for-planting
- **THEN** the supplier identification number is empty again, not the value saved before the change away

#### Scenario: The consignment number survives a commodity-type change
**ID**: SCN-PLANTS-OB-PARTIES-004-C
- **GIVEN** a consignment number has been saved
- **WHEN** the commodity type is changed, in either direction
- **THEN** the consignment number is unchanged
