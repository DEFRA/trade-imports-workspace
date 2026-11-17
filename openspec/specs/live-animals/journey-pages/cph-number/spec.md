# CPH Number Page Specification

## Purpose

**Maturity**: detailing

**Page**: cphNumber

Asks for the County Parish Holding number the consignment's commodities call for, entered as three separate boxes rather than one field. The page is titled "Add the county parish holding number (CPH)". It belongs to the consignment addresses section: it is opened from the consignment addresses page's 'Add a CPH number' link, from Overview and from a review Change link, and always returns to the consignment addresses page. It is not a step in the journey's order, cannot be opened for a consignment whose commodities do not call for the number, and ends with Save and continue alone on a draft and while the notification is being amended (`live-animals/journey-flow`'s REQ-FLOW-012 and REQ-FLOW-013). The page heading sits directly under the caption and the group of boxes carries a shorter legend, so the page has exactly one h1.

## Requirements

### Requirement: The page asks for the CPH number as three labelled, sized boxes, starting empty
**ID**: REQ-CPH-001
The system MUST ask the user for the CPH number as three separate boxes — county (2 digits), parish (3 digits), holding number (4 digits) — each visibly labelled and sized to its digit count, grouped under one legend and hint describing the whole number, and MUST leave every box empty when the page is first opened. The sizing shows the shape of the number and MUST NOT limit how many characters a box accepts.

#### Scenario: The page presents three labelled, sized boxes with nothing entered
**ID**: SCN-CPH-001-A
- **GIVEN** the user has reached the CPH number page without answering it before
- **WHEN** the page loads
- **THEN** it shows a county box, a parish box and a holding number box, each visibly labelled and sized to 2, 3 and 4 digits respectively
- **AND** all three boxes are empty

#### Scenario: The group carries one hint describing the whole number
**ID**: SCN-CPH-001-B
- **GIVEN** the user is on the CPH number page
- **WHEN** they read the group
- **THEN** one hint describes the whole CPH number, reading "For example 12/345/6789", not a separate hint per box

#### Scenario: Each box turns off the browser's saved values and asks for a digit keypad
**ID**: SCN-CPH-001-C
- **GIVEN** the user is on the CPH number page
- **WHEN** they look at the county, parish and holding boxes
- **THEN** none of the three offers the browser's own saved values
- **AND** a phone shows a digit keypad for each of the three

### Requirement: A CPH number entered across the three boxes is accepted, saved as nine digits, and split back on return
**ID**: REQ-CPH-002
The system MUST accept a complete, validly formatted CPH number entered across the three boxes, saving it without error as nine plain digits, and MUST show it split back into its three boxes when the user returns to the page.

#### Scenario: Entering a complete CPH number saves without error
**ID**: SCN-CPH-002-A
- **GIVEN** the user is on the CPH number page
- **WHEN** they fill all three boxes with a validly formatted CPH number and save and continue
- **THEN** the answer is saved and no error summary is shown

#### Scenario: Returning to the page splits the saved number back into its three boxes
**ID**: SCN-CPH-002-B
- **GIVEN** the user has saved a complete CPH number
- **WHEN** they return to the CPH number page
- **THEN** the county, parish and holding boxes each show their own part of the saved number

### Requirement: Saving the page with every box empty is accepted, leaving the number to be added before submission
**ID**: REQ-CPH-010
The system MUST accept a save of the CPH number page with every box left empty, showing no error, MUST clear any CPH number saved before, and MUST hold the gap at submission: the consignment addresses page's CPH section reads as incomplete until a number is added, and the review refuses to continue while it is missing.

#### Scenario: Saving every box empty is accepted and the section reads as incomplete
**ID**: SCN-CPH-010-A
- **GIVEN** the user is on the CPH number page with every box empty
- **WHEN** they save and continue
- **THEN** no error is shown
- **AND** the consignment addresses page's CPH section offers its add link again rather than showing a number

#### Scenario: Saving every box empty clears a number saved before
**ID**: SCN-CPH-010-B
- **GIVEN** the user has saved a CPH number before
- **WHEN** they empty every box and save and continue
- **THEN** the consignment addresses page's CPH section offers its add link again rather than showing the number that was saved

#### Scenario: The review refuses to continue while the CPH number is missing
**ID**: SCN-CPH-010-C
- **GIVEN** a notification whose commodities call for a CPH number and whose CPH section has no number added
- **WHEN** the user tries to continue from the review
- **THEN** the review refuses to continue, naming roles and addresses as outstanding

### Requirement: Each box is validated on its own length and digits, and every wrong box is named at once
**ID**: REQ-CPH-004
Except where REQ-CPH-008 splits a whole number typed into the county box, the system MUST reject a box that is not exactly its required number of digits, and separately reject one containing a non-digit character, each with an error naming that specific box, MUST preserve every box's typed value, and MUST report every box that is wrong at the same time rather than one at a time. The error MUST mark the group as a whole rather than each box individually.

#### Scenario: A box of the wrong length is named, keeping every value typed
**ID**: SCN-CPH-004-A
- **GIVEN** the user has filled all three boxes but one is the wrong length
- **WHEN** they save and continue
- **THEN** an error names that box's length requirement
- **AND** following it focuses that box, still holding what was typed
- **AND** every other box still shows what was typed

#### Scenario: A box left blank while others are filled is named specifically
**ID**: SCN-CPH-004-B
- **GIVEN** the user has filled two of the three boxes and left one blank
- **WHEN** they save and continue
- **THEN** an error names the blank box specifically, not the CPH number as a whole

#### Scenario: A box containing a non-digit character is named, keeping what was typed
**ID**: SCN-CPH-004-C
- **GIVEN** the user has typed a non-digit character into one box
- **WHEN** they save and continue
- **THEN** an error explains that box accepts only digits
- **AND** following it focuses that box, still holding what was typed

#### Scenario: Every wrong box is named at once, not one at a time
**ID**: SCN-CPH-004-D
- **GIVEN** the user has entered a wrong-length value in more than one box
- **WHEN** they save and continue
- **THEN** an error is shown naming each wrong box

#### Scenario: The error marks the group, not the individual boxes
**ID**: SCN-CPH-004-E
- **GIVEN** the user has submitted the page with one or more boxes wrong
- **WHEN** the error is shown
- **THEN** one error message is attached to the group as a whole
- **AND** every box in the group is styled to show it is in error

#### Scenario: A county box that does not hold nine digits is named per box, keeping what was typed
**ID**: SCN-CPH-004-F
- **GIVEN** the county box holds something other than nine digits once spaces and slashes are removed, such as 1234, and the parish and holding boxes are empty
- **WHEN** the user saves and continues
- **THEN** an error names each box that is wrong or missing
- **AND** every box still shows what was typed

### Requirement: A whole CPH number entered in the county box is kept and saved
**ID**: REQ-CPH-008
The system MUST keep every character typed or pasted into a box, and when the county box holds a whole CPH number of nine digits, written bare or with spaces or slashes, and the parish and holding boxes are empty, MUST save it as the nine digits in the same way as a number entered across the three boxes. This MUST work with JavaScript off.

#### Scenario: Typing all nine digits straight through keeps every digit
**ID**: SCN-CPH-008-A
- **GIVEN** the user is on the CPH number page
- **WHEN** they type 123456789 straight through into the county box
- **THEN** the county box shows all nine digits

#### Scenario: A whole number in the county box is saved as nine digits
**ID**: SCN-CPH-008-B
- **GIVEN** the county box holds 123456789, 12/345/6789 or 12 345 6789 and the parish and holding boxes are empty
- **WHEN** the user saves and continues
- **THEN** the number is saved as 123456789
- **AND** the consignment addresses page shows 123456789 in its CPH section

#### Scenario: Pasting the whole number saves it the same as typing it
**ID**: SCN-CPH-008-C
- **GIVEN** the user pastes 12/345/6789 into the county box
- **WHEN** they save and continue
- **THEN** the number is saved as 123456789

### Requirement: Focus is never moved between the boxes automatically
**ID**: REQ-CPH-009
The system MUST NOT move focus from one CPH box to another while the user types, pastes or presses Backspace, with JavaScript on or off.

#### Scenario: Filling a box leaves focus in it
**ID**: SCN-CPH-009-A
- **GIVEN** the user is on the CPH number page
- **WHEN** they fill the county box
- **THEN** focus stays in the county box

#### Scenario: Backspace in an empty box leaves focus in it
**ID**: SCN-CPH-009-B
- **GIVEN** the user is on the CPH number page with the parish box empty and focused
- **WHEN** they press Backspace
- **THEN** focus stays in the parish box

### Requirement: Help explaining what a CPH number is stays collapsed until opened
**ID**: REQ-CPH-005
The system MUST show a collapsed expander above the CPH boxes offering to explain what a CPH number is, and MUST reveal its explanation, including where to find the number and a link to GOV.UK guidance on checking it, only once the user opens it.

#### Scenario: The help text stays hidden until the expander is opened
**ID**: SCN-CPH-005-A
- **GIVEN** the user is on the CPH number page
- **WHEN** the page loads
- **THEN** a collapsed expander offers to explain what a CPH number is, above the boxes
- **AND** its explanation is not visible
- **WHEN** the user opens the expander
- **THEN** the explanation, including where to find the number, becomes visible

#### Scenario: The help's second paragraph links to the GOV.UK guidance on checking a holding's details
**ID**: SCN-CPH-005-B
- **GIVEN** the user has opened the CPH number help
- **WHEN** they read its second paragraph
- **THEN** it reads "You can find your CPH number on documents from the Animal and Plant Health Agency (APHA) or by checking your holding details on GOV.UK."
- **AND** "checking your holding details on GOV.UK" links to the GOV.UK guidance on getting a county parish holding number, in the same tab

### Requirement: The back link always returns to the consignment addresses page, however the page was reached
**ID**: REQ-CPH-006
The system MUST return the user to the consignment addresses page when they follow the back link from the CPH number page, whether they arrived from the consignment addresses page's 'Add a CPH number' link, from Overview, from a Change link on the review, or by the page's own address.

#### Scenario: The back link returns to the consignment addresses page when the page was opened from Overview
**ID**: SCN-CPH-006-A
- **GIVEN** the user reached the CPH number page from Overview
- **WHEN** they follow the back link
- **THEN** the consignment addresses page is shown

#### Scenario: The back link returns to the consignment addresses page when entered from there
**ID**: SCN-CPH-006-B
- **GIVEN** the user reached the CPH number page from the consignment addresses page's 'Add a CPH number' link
- **WHEN** they follow the back link
- **THEN** the consignment addresses page is shown

#### Scenario: The back link returns to the consignment addresses page when the page was opened from a Change link
**ID**: SCN-CPH-006-C
- **GIVEN** the review of a draft notification
- **WHEN** the user follows the Change link that opens the CPH number page and then the back link
- **THEN** the consignment addresses page is shown

### Requirement: Saving the CPH number returns to the consignment addresses page, except where a required earlier answer is still missing
**ID**: REQ-CPH-007
The system MUST return the user to the consignment addresses page after they save the CPH number, whatever way the page was reached, except where a required earlier answer is still missing, in which case `live-animals/journey-flow`'s REQ-FLOW-005 applies and the page that asks for that answer is shown instead.

#### Scenario: Saving from the consignment addresses page's add link returns to it, showing the number
**ID**: SCN-CPH-007-A
- **GIVEN** the user opened the CPH number page from the consignment addresses page's 'Add a CPH number' link
- **WHEN** they save a valid CPH number
- **THEN** the consignment addresses page is shown
- **AND** the CPH section shows the nine digits

#### Scenario: Saving from a review Change link also returns to the consignment addresses page
**ID**: SCN-CPH-007-B
- **GIVEN** the user opened the CPH number page from a review Change link
- **WHEN** they save a valid CPH number
- **THEN** the consignment addresses page is shown

#### Scenario: Saving from Overview also returns to the consignment addresses page
**ID**: SCN-CPH-007-C
- **GIVEN** the user opened the CPH number page from Overview
- **WHEN** they save a valid CPH number
- **THEN** the consignment addresses page is shown

#### Scenario: Saving while the country of origin is still missing opens the page that asks for it instead
**ID**: SCN-CPH-007-D
- **GIVEN** the user is on the CPH number page and the notification does not yet have a country of origin saved
- **WHEN** they save a valid CPH number
- **THEN** the page asking for the country of origin is shown, not the consignment addresses page

### Requirement: The page cannot be opened for a consignment whose commodities do not call for the number
**ID**: REQ-CPH-011
The system MUST show the consignment addresses page instead of the CPH number page, and MUST save nothing, when the user opens or submits the CPH number page for a consignment whose commodities do not call for a CPH number, except where a required earlier answer is still missing, in which case `live-animals/journey-flow`'s REQ-FLOW-005 applies and the page that asks for that answer is shown instead.

#### Scenario: Opening the page for a consignment that does not call for the number shows the consignment addresses page
**ID**: SCN-CPH-011-A
- **GIVEN** a notification whose commodities do not call for a CPH number
- **WHEN** the user opens or submits the CPH number page by its own address
- **THEN** the consignment addresses page is shown instead
- **AND** nothing is saved
