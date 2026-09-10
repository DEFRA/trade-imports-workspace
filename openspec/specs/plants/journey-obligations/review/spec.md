# Review Obligations Specification

## Purpose

What must be complete before a high-risk plants notification can be reviewed and submitted, when continue from check-your-answers is blocked, and how lateness is judged and recorded at first submission.

## Requirements

### Requirement: Check and submit stays blocked until every prerequisite task is complete
**ID**: REQ-PLANTS-OB-REVIEW-001
The system MUST withhold the Check and submit task until every other task row on Overview is fulfilled, not applicable or optional, showing the row as cannot-start-yet with no link until then.

#### Scenario: Check and submit stays blocked until the final required row is complete
**ID**: SCN-PLANTS-OB-REVIEW-001-A
- **GIVEN** a notification has every section answered except the consignment contact
- **WHEN** the user views Overview
- **THEN** Check and submit reads "Cannot start yet" and offers no link
- **WHEN** they complete the contact and return to Overview
- **THEN** Check and submit is offered and opens check-your-answers

### Requirement: Continuing from check-your-answers while a task is still outstanding returns to Overview
**ID**: REQ-PLANTS-OB-REVIEW-002
The system MUST NOT take the user on to the declaration while a task is still outstanding, and MUST instead return them to Overview when they continue from check-your-answers.

#### Scenario: Continuing an incomplete notification returns to Overview
**ID**: SCN-PLANTS-OB-REVIEW-002-A
- **GIVEN** a notification is open on check-your-answers with a task still outstanding
- **WHEN** the user continues
- **THEN** they are returned to Overview

### Requirement: An origin that commodity lines no longer allow blocks continue, with a correction into origin
**ID**: REQ-PLANTS-OB-REVIEW-003
The system MUST refuse to continue from check-your-answers when the saved country of origin falls outside the narrowest scope of the notification's commodity lines, showing an error that links into the origin page under change context, and MUST leave the notification in draft. The origin scopes themselves are governed by `plants/journey-obligations/origin`.

#### Scenario: A saved country that a new ware-potato line disallows blocks continue with a link to origin
**ID**: SCN-PLANTS-OB-REVIEW-003-A
- **GIVEN** a draft notification has saved a French origin under seed potatoes
- **WHEN** the user adds a ware-potato commodity line and continues from check-your-answers
- **THEN** they remain on check-your-answers, still Draft
- **AND** an error summary offers a correction that opens origin under change context, naming the ware-potato countries

### Requirement: A previously selected party whose address no longer resolves blocks continue
**ID**: REQ-PLANTS-OB-REVIEW-004
The system MUST refuse to continue from check-your-answers when a party role that was previously answered no longer resolves to an address, showing an error that asks the user to select an address for that role. How the unresolved role is shown on the page itself is governed by `plants/journey-pages/check-your-answers`.

#### Scenario: A deleted place of destination blocks continue
**ID**: SCN-PLANTS-OB-REVIEW-004-A
- **GIVEN** a complete draft notification is open on check-your-answers
- **WHEN** the place-of-destination address is removed from the address book and the user continues
- **THEN** they remain on check-your-answers
- **AND** an error summary asks them to select an address for the place of destination

### Requirement: A late notification is still accepted, judged against the commodity type's timing window
**ID**: REQ-PLANTS-OB-REVIEW-005
The system MUST still accept a notification whose timing window has been missed, judging potatoes late when notified fewer than 2 days before the expected date of arrival, and judging plants for planting and wood late when notified more than 4 days after the date of arrival. How the draft warning and the submitted late banner are shown is governed by `plants/journey-pages/check-your-answers` and `plants/journey-pages/confirmation`.

#### Scenario: A potato notification inside the two-day window is accepted as late
**ID**: SCN-PLANTS-OB-REVIEW-005-A
- **GIVEN** a potato notification whose expected arrival is today or sooner than 2 days away
- **WHEN** the user submits it through check-your-answers and the declaration
- **THEN** the submission is accepted
- **AND** the confirmation and the read-only check-your-answers show it was made outside the required timing, quoting the potato rule

#### Scenario: A plants-for-planting notification more than four days after arrival is accepted as late
**ID**: SCN-PLANTS-OB-REVIEW-005-B
- **GIVEN** a plants-for-planting notification whose arrival was more than 4 days ago
- **WHEN** the user submits it through check-your-answers and the declaration
- **THEN** the submission is accepted
- **AND** the confirmation and the read-only check-your-answers show it was made outside the required timing, quoting the plants-and-wood rule

### Requirement: The late-or-on-time flag is recorded at first submission and kept across amendment
**ID**: REQ-PLANTS-OB-REVIEW-006
The system MUST record whether the notification was late or on time when it is first submitted, and MUST keep that recorded flag when an amendment is later resubmitted — even if the arrival date has since moved into or out of the timing window.

#### Scenario: An originally late notification stays marked late after the arrival date is amended on time
**ID**: SCN-PLANTS-OB-REVIEW-006-A
- **GIVEN** a notification was first submitted late
- **WHEN** the user amends the arrival date to one that would now be on time and resubmits
- **THEN** confirmation and the read-only check-your-answers still show the late banner
- **AND** the amended arrival date is shown on check-your-answers

#### Scenario: An originally on-time notification stays unmarked after the arrival date is amended late
**ID**: SCN-PLANTS-OB-REVIEW-006-B
- **GIVEN** a notification was first submitted on time
- **WHEN** the user amends the arrival date to one that would now be late and resubmits
- **THEN** confirmation and the read-only check-your-answers show no late banner
- **AND** the amended arrival date is shown on check-your-answers
