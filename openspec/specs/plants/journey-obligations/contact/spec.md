# Contact Obligations Specification

## Purpose

What every high-risk plants notification owes for its consignment contact address, regardless of commodity type.

## Requirements

### Requirement: A consignment contact address is mandatory for every commodity type
**ID**: REQ-PLANTS-OB-CONTACT-001
The system MUST ask every notification for a consignment contact address, as a mandatory answer, whatever its commodity type. The obligation is not gated by commodity type.

#### Scenario: A potatoes notification is asked for a consignment contact
**ID**: SCN-PLANTS-OB-CONTACT-001-A
- **GIVEN** a notification whose commodity type is potatoes
- **WHEN** the user works through the journey
- **THEN** a consignment contact address is asked for, as a mandatory Overview task

#### Scenario: A plants-for-planting or wood-and-cut-trees notification is asked for a consignment contact
**ID**: SCN-PLANTS-OB-CONTACT-001-B
- **GIVEN** a notification whose commodity type is plants-for-planting or wood-and-cut-trees
- **WHEN** the user works through the journey
- **THEN** a consignment contact address is asked for, as a mandatory Overview task

### Requirement: An unanswered contact leaves the obligation unfulfilled
**ID**: REQ-PLANTS-OB-CONTACT-002
The system MUST treat a notification with no consignment contact address as not having fulfilled the contact obligation. Visiting the page and saving with nothing chosen MUST NOT count as answering it.

#### Scenario: Saving with nothing chosen does not fulfil the contact obligation
**ID**: SCN-PLANTS-OB-CONTACT-002-A
- **GIVEN** the user opens the consignment contact page and saves with no address chosen
- **WHEN** they return to Overview
- **THEN** the contact task remains not yet started
