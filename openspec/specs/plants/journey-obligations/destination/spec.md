# Destination Obligations Specification

## Purpose

What every high-risk plants notification owes for its place of destination.

## Requirements

### Requirement: A place of destination is mandatory for every commodity type
**ID**: REQ-PLANTS-OB-DESTINATION-001
The system MUST ask every notification for a place of destination, as a mandatory answer, whatever its commodity type and whether or not the consignment has already arrived.

#### Scenario: A notification of any commodity type is asked for a place of destination
**ID**: SCN-PLANTS-OB-DESTINATION-001-A
- **GIVEN** a notification of any commodity type
- **WHEN** the user reaches the destination section
- **THEN** a place of destination is asked for, as a mandatory answer
