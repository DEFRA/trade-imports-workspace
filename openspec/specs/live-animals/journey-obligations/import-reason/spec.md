# Import Reason Obligations Specification

## Purpose

What the reason for importing brings into play elsewhere in the notification: four further obligations, none asked unless the reason calls for it.

## Requirements

### Requirement: The reason for importing decides which four further obligations apply
**ID**: REQ-OB-IMPORT-REASON-001
The system MUST use the reason for importing to decide whether each of four further obligations applies — the purpose in the internal market, the destination country, the port of exit and the exit date. Each MUST be mandatory where it applies, and MUST NOT be asked for otherwise. Which reason calls for which is set out in the scenarios below.

#### Scenario: Internal market asks only for the purpose
**ID**: SCN-OB-IMPORT-REASON-001-A
- **GIVEN** the user is answering the reason for importing
- **WHEN** they choose "Internal market"
- **THEN** the purpose in the internal market is asked for, as a mandatory answer
- **AND** the destination country, port of exit and exit date are not asked for

#### Scenario: Transit asks for the destination country and the port of exit
**ID**: SCN-OB-IMPORT-REASON-001-B
- **GIVEN** the user is answering the reason for importing
- **WHEN** they choose "Transit"
- **THEN** the destination country and the port of exit are both asked for, as mandatory answers
- **AND** the purpose in the internal market and the exit date are not asked for

#### Scenario: Transhipment or onward travel asks only for the destination country
**ID**: SCN-OB-IMPORT-REASON-001-C
- **GIVEN** the user is answering the reason for importing
- **WHEN** they choose "Transhipment or onward travel"
- **THEN** the destination country is asked for, as a mandatory answer
- **AND** the purpose in the internal market, port of exit and exit date are not asked for

#### Scenario: Temporary admission of horses asks for the port of exit and the exit date
**ID**: SCN-OB-IMPORT-REASON-001-D
- **GIVEN** the user is answering the reason for importing
- **WHEN** they choose "Temporary admission of horses"
- **THEN** the port of exit and the exit date are both asked for, as mandatory answers
- **AND** the purpose in the internal market and the destination country are not asked for

#### Scenario: Any other reason asks for none of the four
**ID**: SCN-OB-IMPORT-REASON-001-E
- **GIVEN** the user is answering the reason for importing
- **WHEN** they choose a reason other than Internal market, Transit, Transhipment or onward travel, or Temporary admission of horses
- **THEN** none of the purpose, destination country, port of exit or exit date is asked for

### Requirement: Changing the reason discards the answers the previous reason called for
**ID**: REQ-OB-IMPORT-REASON-002
The system MUST discard the stored answers to the purpose, destination country, port of exit and exit date once a change of reason means they no longer apply.

#### Scenario: Changing the reason away and back asks the question afresh
**ID**: SCN-OB-IMPORT-REASON-002-A
- **GIVEN** the user has chosen "Internal market" and answered the purpose in the internal market
- **WHEN** they change the reason to one that does not call for the purpose, and later change it back to "Internal market"
- **THEN** the purpose is asked for again with nothing selected

