# Arrival Details Page Specification

## Purpose

Asks how and when the consignment arrives at its port of entry, and confines the arrival date to the window the service accepts. The page is titled "Arrival details".

## Requirements

### Requirement: The page asks how and when the consignment arrives
**ID**: REQ-ARRIVAL-001
The system MUST ask the user for the port of entry, the means of transport, the transport's identification and its document reference, offering a save-and-continue action, and MUST leave those questions unanswered when the page is first opened.

#### Scenario: The page presents its questions unanswered
**ID**: SCN-ARRIVAL-001-A
- **GIVEN** the user has reached the arrival details page without answering it before
- **WHEN** the page loads
- **THEN** it asks for the port of entry, the means of transport, the transport's identification and its document reference, offering a save-and-continue action
- **AND** the port of entry and means of transport are unanswered

### Requirement: The port field offers every port before typing, and filters by name or code
**ID**: REQ-ARRIVAL-002
The system MUST offer the whole list of ports as soon as the user opens the port of entry field, before anything is typed, and MUST filter it by a port's code as well as by its name.

#### Scenario: Opening the port field offers the full list
**ID**: SCN-ARRIVAL-002-A
- **GIVEN** the user is on the arrival details page
- **WHEN** they open the port of entry field without typing anything
- **THEN** every port is offered

#### Scenario: Typing a port's code offers that port
**ID**: SCN-ARRIVAL-002-B
- **GIVEN** the user is on the arrival details page
- **WHEN** they type a port's code rather than its name
- **THEN** that port is offered for them to choose

#### Scenario: Typing text that matches no port shows a no-results message
**ID**: SCN-ARRIVAL-002-C
- **GIVEN** the user is on the arrival details page
- **WHEN** they type text that matches no port
- **THEN** a message tells them nothing matched

### Requirement: Choosing a port submits and keeps its code
**ID**: REQ-ARRIVAL-003
The system MUST submit the chosen port's code rather than the text the user typed, and MUST still hold that code when the user returns to the page.

#### Scenario: The chosen port's code is what the notification keeps
**ID**: SCN-ARRIVAL-003-A
- **GIVEN** the user is on the arrival details page
- **WHEN** they choose a port, complete the page and save it
- **THEN** the port's code is what the notification keeps
- **WHEN** they later return to the arrival details page
- **THEN** the port of entry still holds that code

#### Scenario: The chosen port is shown as its name and code together
**ID**: SCN-ARRIVAL-003-B
- **GIVEN** the user is on the arrival details page
- **WHEN** they choose a port
- **THEN** the search field shows that port's name followed by its code

### Requirement: The port field works without client-side JavaScript
**ID**: REQ-ARRIVAL-004
The system MUST keep an ordinary port list underneath the searchable field, so a user without JavaScript can still choose a port, and MUST have that underlying list carry the code the page submits.

#### Scenario: An ordinary port list remains available beneath the searchable field
**ID**: SCN-ARRIVAL-004-A
- **GIVEN** the user is on the arrival details page
- **WHEN** the page is examined without relying on the searchable field
- **THEN** an ordinary port list is present, carrying the code that is submitted

### Requirement: A complete set of arrival details is accepted
**ID**: REQ-ARRIVAL-005
The system MUST accept the arrival details once every required answer is given, saving them without error.

#### Scenario: Answering every arrival question saves without error
**ID**: SCN-ARRIVAL-005-A
- **GIVEN** the user is on the arrival details page
- **WHEN** they answer every arrival question and save and continue
- **THEN** the answers are saved and no error summary is shown

### Requirement: Saving the page empty is rejected
**ID**: REQ-ARRIVAL-006
The system MUST refuse to save the arrival details page when nothing has been answered, showing an error summary.

#### Scenario: Saving with nothing answered shows an error summary
**ID**: SCN-ARRIVAL-006-A
- **GIVEN** the user is on the arrival details page with nothing answered
- **WHEN** they save and continue
- **THEN** an error summary headed "There is a problem" is shown

### Requirement: The arrival date is confined to one week back and six months ahead
**ID**: REQ-ARRIVAL-007
The system MUST confine the arrival date to a window running from one week in the past to six months in the future, MUST offer that window as the range of the date picker, and MUST reject a date typed outside it with an error naming the allowed range, keeping the user on the page and saving nothing.

#### Scenario: The date picker offers only the allowed window
**ID**: SCN-ARRIVAL-007-A
- **GIVEN** the user is on the arrival details page
- **WHEN** they view the arrival date picker
- **THEN** its earliest selectable date is one week in the past and its latest is six months in the future

#### Scenario: A date typed outside the window is rejected with an error naming the range
**ID**: SCN-ARRIVAL-007-B
- **GIVEN** the user has answered the other arrival questions
- **WHEN** they type an arrival date outside the allowed window and save and continue
- **THEN** an error summary headed "There is a problem" is shown, and an error against the arrival date says it must be between the earliest and latest allowed dates
- **AND** they remain on the arrival details page

#### Scenario: An impossible date is rejected with its own error, distinct from the out-of-window error
**ID**: SCN-ARRIVAL-007-C
- **GIVEN** the user has answered the other arrival questions
- **WHEN** they type a date that does not exist and save and continue
- **THEN** an error summary is shown naming that the date is invalid, not that it falls outside the allowed window
- **AND** the arrival date field is focused, still holding the impossible date typed
- **AND** the other arrival answers already given are still held

#### Scenario: The date picker's own calendar excludes the day before the window, and allows the boundary day itself
**ID**: SCN-ARRIVAL-007-D
- **GIVEN** the user opens the arrival date picker
- **WHEN** they navigate to the day immediately before the allowed window
- **THEN** that day is shown excluded and cannot be chosen
- **WHEN** they navigate to the earliest day of the allowed window and choose it
- **THEN** the arrival date field takes that boundary date

#### Scenario: A rejected arrival date is not kept
**ID**: SCN-ARRIVAL-007-E
- **GIVEN** the user has had an arrival date rejected for falling outside the allowed window
- **WHEN** they leave the page and return to it on the same notification
- **THEN** the arrival date does not hold the rejected value

### Requirement: The transport identification and document reference are each capped at 58 characters
**ID**: REQ-ARRIVAL-008
The system MUST reject a transport identification or document reference longer than 58 characters, with an error naming the field and its limit, and MUST preserve the value typed so it can be edited down.

#### Scenario: An over-length transport identification is rejected with the value preserved
**ID**: SCN-ARRIVAL-008-A
- **GIVEN** the user has answered the other arrival questions
- **WHEN** they type a transport identification longer than 58 characters and save and continue
- **THEN** an error is shown naming the transport identification and its limit
- **AND** the field is focused, still holding the value typed

#### Scenario: An over-length document reference is rejected with the value preserved
**ID**: SCN-ARRIVAL-008-B
- **GIVEN** the user has answered the other arrival questions
- **WHEN** they type a document reference longer than 58 characters and save and continue
- **THEN** an error is shown naming the document reference and its limit
- **AND** the field is focused, still holding the value typed

### Requirement: An invalid port or means of transport is rejected by clearing it, while the page's other answers are kept
**ID**: REQ-ARRIVAL-009
The system MUST reject a port of entry or means of transport that is not one of the offered options by clearing that answer, focusing it, and MUST keep every other answer already given on the page.

#### Scenario: An invalid port clears the port field, keeping the rest of the page
**ID**: SCN-ARRIVAL-009-A
- **GIVEN** the user has answered every arrival question
- **WHEN** the submitted port of entry is not one of the offered ports
- **THEN** an error is shown, the port field is focused and empty
- **AND** the page's other answers are still held

#### Scenario: An invalid means of transport clears the whole group, keeping the rest of the page
**ID**: SCN-ARRIVAL-009-B
- **GIVEN** the user has answered every arrival question
- **WHEN** the submitted means of transport is not one of the offered options
- **THEN** an error is shown, the means-of-transport group is focused with nothing checked
- **AND** the page's other answers, including the chosen port, are still held

### Requirement: The back link returns to Overview
**ID**: REQ-ARRIVAL-010
The system MUST return the user to Overview when they follow the back link from the arrival details page.

#### Scenario: The back link opens Overview
**ID**: SCN-ARRIVAL-010-A
- **GIVEN** the user is on the arrival details page
- **WHEN** they follow the back link
- **THEN** Overview is shown
