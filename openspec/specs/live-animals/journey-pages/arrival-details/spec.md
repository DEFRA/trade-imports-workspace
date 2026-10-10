# Arrival Details Page Specification

## Purpose

Asks how and when the consignment arrives at its port of entry, and confines the arrival date to the window the service accepts. The page is titled "Arrival details". Only the means of transport must be chosen before the page goes on; the other answers can be left for later.

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
The system MUST offer the whole list of ports as soon as the user opens the port of entry field, before anything is typed, and MUST filter it by a port's code as well as by its name, and MUST list every port the reference data service serves, airports first, then seaports, then rail ports, each group A to Z by name ignoring letter case and reading non-breaking and doubled spaces as single spaces.

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

#### Scenario: Every port the reference data service serves is offered, in its order
**ID**: SCN-ARRIVAL-002-D
- **GIVEN** the user is on the arrival details page
- **WHEN** the port list is read in full
- **THEN** it holds every port the reference data service serves, each reading "<port name> - <port code>", for example "Port of Dover - GB DVR", in the order the service serves them

#### Scenario: Ports are listed airports first, then seaports, then rail ports, each A to Z by name
**ID**: SCN-ARRIVAL-002-E
- **GIVEN** the user is on the arrival details page
- **WHEN** the port list is read in full
- **THEN** every airport comes before every seaport, and every seaport before every rail port
- **AND** within each group the ports run A to Z by name, a name in capitals sorting among the names that start with the same letter, and a name with a non-breaking or doubled space sorting where the same name with single spaces would

### Requirement: Choosing a port submits and keeps its code
**ID**: REQ-ARRIVAL-003
The system MUST submit the chosen port's code rather than the text the user typed, MUST show the chosen port in the search field as "<port name> - <port code>", and MUST still hold that code when the user returns to the page.

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
- **THEN** the search field shows that port as "<port name> - <port code>", for example "Port of Dover - GB DVR"

### Requirement: The port field works without client-side JavaScript
**ID**: REQ-ARRIVAL-004
The system MUST keep an ordinary, labelled port list underneath the searchable field, so a user without JavaScript can still choose a port, MUST have each port in that list read "<port name> - <port code>", and MUST have that underlying list carry the code the page submits.

#### Scenario: An ordinary port list remains available beneath the searchable field
**ID**: SCN-ARRIVAL-004-A
- **GIVEN** the user is on the arrival details page
- **WHEN** the page is examined without relying on the searchable field
- **THEN** an ordinary port list is present, carrying the code that is submitted
- **AND** the list is labelled as the port of entry question
- **AND** each port in it reads "<port name> - <port code>"

### Requirement: A complete set of arrival details is accepted
**ID**: REQ-ARRIVAL-005
The system MUST accept the arrival details once every required answer is given, saving them without error.

#### Scenario: Answering every arrival question saves without error
**ID**: SCN-ARRIVAL-005-A
- **GIVEN** the user is on the arrival details page
- **WHEN** they answer every arrival question and save and continue
- **THEN** the answers are saved and no error summary is shown

### Requirement: Saving without a means of transport is refused
**ID**: REQ-ARRIVAL-006
The system MUST refuse Save and continue on the arrival details page while no means of transport is chosen, saving nothing, showing 'Select a means of transport to the port of entry' in the error summary, linked to the means of transport question, and above that question, which is shown in its error style; the page's title MUST start 'Error: ' and the other answers entered MUST be shown back.

#### Scenario: Saving with no means of transport shows an error on that question
**ID**: SCN-ARRIVAL-006-A
- **GIVEN** the user is on the arrival details page with no means of transport chosen
- **WHEN** they save and continue
- **THEN** an error summary headed "There is a problem" is shown, with "Select a means of transport to the port of entry" linked to the means of transport question
- **AND** the message is shown above the means of transport question, which is shown in its error style
- **AND** the page title starts "Error: "
- **AND** they remain on the arrival details page

#### Scenario: The other answers are shown back and nothing is saved
**ID**: SCN-ARRIVAL-006-B
- **GIVEN** the user has chosen a port of entry and an arrival date but no means of transport
- **WHEN** they save and continue
- **THEN** the port of entry and arrival date are still shown on the page
- **AND** when they leave and return to the page on the same notification, neither answer was saved

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

### Requirement: Only the means of transport is needed to continue
**ID**: REQ-ARRIVAL-011
The system MUST let the user save and continue once a means of transport is chosen, even with the arrival date, port of entry, transport identification and transport document reference left blank.

#### Scenario: A means of transport alone lets the page go on
**ID**: SCN-ARRIVAL-011-A
- **GIVEN** the user has chosen a means of transport and left the arrival date, port of entry, transport identification and document reference blank
- **WHEN** they save and continue
- **THEN** the next page is shown and no error summary is shown

### Requirement: The port search is hinted and shows a placeholder
**ID**: REQ-ARRIVAL-012
The system MUST hint the port of entry with "Select where the transporter will enter with the consignment. Start typing to search by port or airport name or code." and MUST show "Select a port" in the search while no port is chosen.

#### Scenario: The port search reads as Design Release 2.1 words it
**ID**: SCN-ARRIVAL-012-A
- **GIVEN** the user is on the arrival details page with no port chosen
- **WHEN** the page loads
- **THEN** the port of entry hint reads "Select where the transporter will enter with the consignment. Start typing to search by port or airport name or code."
- **AND** the port search shows "Select a port"

### Requirement: Means of transport is offered as Air, Rail, Road and Sea, and kept as its code
**ID**: REQ-ARRIVAL-013
The system MUST offer the means of transport as "Air", "Rail", "Road" and "Sea", in that order, after "Select one", and MUST keep the choice in the notification as AIRPLANE, RAILWAY, ROAD_VEHICLE or VESSEL respectively.

#### Scenario: The means of transport options read Air, Rail, Road and Sea
**ID**: SCN-ARRIVAL-013-A
- **GIVEN** the user is on the arrival details page
- **WHEN** the page loads
- **THEN** the means of transport options read "Select one", "Air", "Rail", "Road", "Sea" in that order

#### Scenario: Each option is kept as the code other services read
**ID**: SCN-ARRIVAL-013-B
- **GIVEN** the user is on the arrival details page
- **WHEN** they choose Air, Rail, Road or Sea and save
- **THEN** the notification keeps AIRPLANE, RAILWAY, ROAD_VEHICLE or VESSEL respectively

### Requirement: The transport identification hint opens "Enter one of the following:"
**ID**: REQ-ARRIVAL-014
The system MUST open the transport identification hint with "Enter one of the following:" followed by the list of flight number, train number, road vehicle registration number, and vessel name (for ferries, also the road vehicle registration number).

#### Scenario: The transport identification hint leads with its instruction
**ID**: SCN-ARRIVAL-014-A
- **GIVEN** the user is on the arrival details page
- **WHEN** the page loads
- **THEN** the transport identification hint opens with "Enter one of the following:"
- **AND** it lists flight number, train number, road vehicle registration number, and vessel name (for ferries, also the road vehicle registration number)

### Requirement: Each arrival question is set in the medium label size
**ID**: REQ-ARRIVAL-015
The system MUST set each of the five arrival questions (arrival date, port of entry, means of transport, transport identification and transport document reference) in the GOV.UK medium label size.

#### Scenario: The arrival questions read at medium size
**ID**: SCN-ARRIVAL-015-A
- **GIVEN** a user on the arrival details page
- **WHEN** the page loads
- **THEN** the arrival date, port of entry, means of transport, transport identification and transport document reference questions are each set in the medium label size
