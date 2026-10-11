# Check Your Answers Page Specification

## Purpose

The page on which a whole notification is read back before submission, and read again once submitted. The page is titled "Review your notification".

## Requirements

### Requirement: The review draws the same six numbered sections as Overview, in order, whatever the notification holds
**ID**: REQ-CYA-001
The system MUST group the page under the same six numbered section headings the Overview task list uses, MUST draw all six in that order however little the notification holds, and MUST stand every card directly under its section heading, with no subsection heading between them, titled one heading level below it. Which cards stand within a section MAY depend on the notification. The system MUST read each card's rows under the names the scenarios give.

#### Scenario: The review draws all six numbered sections in order
**ID**: SCN-CYA-001-A
- **GIVEN** the user has just started a notification and answered nothing beyond the entry page
- **WHEN** they view the review
- **THEN** the numbered section headings read "1. About the consignment", "2. Description of the goods", "3. Transport and arrival", "4. Uploaded documents", "5. Consignment addresses" and "6. Contact address", in that order

#### Scenario: Every card stands straight under its numbered section
**ID**: SCN-CYA-001-B
- **GIVEN** the user is viewing the review for a notification with commodities entered
- **WHEN** they read down the page
- **THEN** every card's title is a heading one level below its numbered section heading
- **AND** no subsection heading stands above a card: none of "Where is this consignment coming from?", "Commodity details", "Upload documents", "Roles and addresses" or "Contact address for this consignment" appears as a heading
- **AND** the first card in "1. About the consignment" is titled "Origin of import"
- **AND** the second card in "1. About the consignment" is titled "What are you importing?"

#### Scenario: With nothing uploaded, Uploaded documents holds a single Document 1 card reading Not applicable
**ID**: SCN-CYA-001-E
- **GIVEN** a notification with no documents uploaded
- **WHEN** the user views the review
- **THEN** "4. Uploaded documents" holds one card, titled "Document 1", whose only row, "Document reference", reads "Not applicable"
- **AND** the words "You have not added any documents yet." do not appear
- **AND** the card's header Change link still opens the upload documents page

#### Scenario: Each uploaded document reads back in its own card, naming the attached file
**ID**: SCN-CYA-001-R
- **GIVEN** a notification with two documents uploaded
- **WHEN** the user views the review
- **THEN** "4. Uploaded documents" holds one card per document, titled "Document 1" and "Document 2" in the order they were added
- **AND** each card reads "Document reference", "Document type", "Date of issue" and "Attachment", where "Attachment" is the uploaded file's name
- **AND** each card carries its own header Change link to the upload documents page

#### Scenario: A fully answered notification's check-your-answers reflects every entered value
**ID**: SCN-CYA-001-C
- **GIVEN** the user has answered every section of a notification except documents
- **WHEN** they view check-your-answers
- **THEN** each section shows cards of the entered values — for example the country of origin, the species and animal details entered, and the arrival details entered

#### Scenario: Check-your-answers lists every address role with its selected party
**ID**: SCN-CYA-001-D
- **GIVEN** the user has selected a party for each of the notification's address roles — place of origin, consignor, consignee, importer, and place of destination
- **WHEN** they view check-your-answers
- **THEN** the Addresses card, the one card under "5. Consignment addresses", lists all of them, each showing the selected party's name and country
- **AND** the card's one header Change link opens the roles and addresses page

#### Scenario: The reason and additional details answers read under their own names
**ID**: SCN-CYA-001-F
- **GIVEN** a notification with its import reason and additional details answered
- **WHEN** the user views the review
- **THEN** the reason answers stand on the card titled "Main import reason", its first row keyed "Main import reason", with the internal market purpose labelled "Purpose in the market", for Temporary admission horses, "Exit date" and "Port of exit" rows, and for Transit, "Exit border control post" and then "Destination country", with no "Port of exit" row
- **AND** the additional details answers, when there are any to show, stand on the card titled "Additional details" and read "Certified for" and, where the unweaned question was asked, "Includes unweaned animals"

#### Scenario: The contact address section holds one Contact address card
**ID**: SCN-CYA-001-H
- **GIVEN** a notification with a contact address chosen
- **WHEN** the user views the review
- **THEN** "6. Contact address" holds one card titled "Contact address" with a "Contact address" row showing the chosen address

#### Scenario: The arrival details card names the means of transport as the arrival page offers it
**ID**: SCN-CYA-001-G
- **GIVEN** a notification whose means of transport is road
- **WHEN** the user views the review
- **THEN** the "Means of transport to the port of entry" row reads "Road"
- **AND** an air arrival reads "Air"

#### Scenario: The Origin of import card reads the region of origin code and no 'required' row
**ID**: SCN-CYA-001-I
- **GIVEN** a notification with its origin answered
- **WHEN** the user views the review
- **THEN** the Origin of import card shows a "Region of origin code" row and no "Region of origin code required" row
- **AND** the row reads the code where one was needed, and "Not applicable" where it was not

#### Scenario: Transit countries read inside the Arrival details card
**ID**: SCN-CYA-001-J
- **GIVEN** a notification arriving by road or rail with transit countries added
- **WHEN** the user views the review
- **THEN** the Arrival details card keys its arrival date "Arrival date at destination"
- **AND** it holds a "Transit countries" subsection whose row "Countries that the consignment will travel through" lists the countries comma-separated in the order added
- **AND** that row has its own Change link, which opens the transit countries page
- **AND** no separate Transit countries card is shown

#### Scenario: The Transport details card always shows the transporter's five rows
**ID**: SCN-CYA-001-K
- **GIVEN** a notification on the review
- **WHEN** the user views the Transport details card
- **THEN** it shows "Name", "Address", "Country", "Approval number" and "Type", in that order, whether or not a transporter has been chosen
- **AND** an empty answer reads "Not applicable" on a finished card
- **AND** "Country" reads the country stored on the transporter's address

#### Scenario: The Additional details card shows only with rows, its Change link only while the page is in the journey
**ID**: SCN-CYA-001-L
- **GIVEN** a notification with no additional details rows to show
- **WHEN** the user views the review
- **THEN** no Additional details card is shown
- **GIVEN** a notification with additional details rows and the additional details page in its journey
- **WHEN** the user views the review
- **THEN** the Additional details card carries a Change link to that page
- **GIVEN** a notification with additional details rows but the additional details page not in its journey, or a read-only view
- **WHEN** the user views the review
- **THEN** the Additional details card is shown with no Change link

#### Scenario: The What are you importing? card reads the commodity selection back
**ID**: SCN-CYA-001-M
- **GIVEN** the user has chosen commodities
- **WHEN** they view the review
- **THEN** "1. About the consignment" holds "Origin of import", "What are you importing?" and "Main import reason", in that order
- **AND** the What are you importing? card shows "Commodity code", "Common name" and "Species"
- **AND** its Change link opens the commodity selection page

#### Scenario: Each commodity's code and name are read once, except where its species are listed individually
**ID**: SCN-CYA-001-N
- **GIVEN** the user has chosen two species of Cow and one of Fish
- **WHEN** they view the review
- **THEN** "Commodity code" reads "0102, 0301" and "Common name" reads "Cow, Fish"
- **GIVEN** the user has chosen a cat and a dog, which share commodity code 01061900
- **WHEN** they view the review
- **THEN** each species adds its own code and common name, so "Commodity code" reads "01061900, 01061900" and "Common name" reads "Cat, Dog"

#### Scenario: Species names read with every word capitalised
**ID**: SCN-CYA-001-O
- **GIVEN** the user has chosen the species Bos taurus
- **WHEN** they view the review
- **THEN** the "Species" row and the species block heading both read "Bos Taurus"

#### Scenario: One card per commodity, one block per species
**ID**: SCN-CYA-001-P
- **GIVEN** the user has chosen commodities and saved their numbers
- **WHEN** they view the review
- **THEN** "2. Description of the goods" holds one card per commodity, titled with the commodity name and its code, for example "Cow (0102)"
- **AND** inside it stands one block per species, headed with the species name
- **AND** each block shows "Number of animals" and, where packaging applies, "Number of packages (when required)", reading "Not applicable" when blank
- **AND** no block shows a "Commodity code", "Common name" or "Species" row
- **AND** the card's header Change link opens the consignment details page
- **AND** on an editable review the first row of each block has its own Change link to the consignment details page, while a read-only review has none

#### Scenario: Each species block reads its animals back under Identification details
**ID**: SCN-CYA-001-Q
- **GIVEN** a species whose animals' identifiers are saved
- **WHEN** the user views the review
- **THEN** its block shows a table headed "Identification details"
- **AND** the table's first column is "Animal", followed by one column per identifier the commodity asks for, an identifier not given reading "Not applicable"
- **AND** each row is labelled with the species name and the animal's number, for example "Bos taurus 1"
- **AND** on an editable review Identification details has its own Change link, which opens the identification page, while a read-only review has none
- **GIVEN** a species with no identifiers saved
- **THEN** its block shows no Identification details

### Requirement: A blank is written out as "Not applicable" on a settled card and marked missing on one still outstanding
**ID**: REQ-CYA-002
The system MUST draw a blank by its card, not its field: on a card with nothing further owed, as "Not applicable"; on a card still holding outstanding answers, as a row with no text in the missing style, "Missing" announced for a screen reader, alike for every blank row in that card, optional or not. The system MUST NOT raise a role error against a party role nobody has reached yet; that error is for a copied address breaking the address book's rules (REQ-ADDR-005).

#### Scenario: A blank row is written out on a settled card and marked missing on an outstanding one
**ID**: SCN-CYA-002-A
- **GIVEN** the user has answered only the entry page of a notification
- **WHEN** they view the review
- **THEN** a blank row on a card with nothing further owed reads "Not applicable"
- **AND** a blank row on a card still holding outstanding answers carries no text at all, with "Missing" announced in its place
- **AND** every blank row in that marked card is drawn the same way, the optional ones included

#### Scenario: An unanswered party role is marked missing, with no role error shown
**ID**: SCN-CYA-002-B
- **GIVEN** a new notification whose party roles have not yet been answered
- **WHEN** the user views the review
- **THEN** each unanswered role is marked missing, and no role error is raised against it

### Requirement: A back link returns to Overview
**ID**: REQ-CYA-003
The system MUST return the user to Overview when they follow the back link from check-your-answers.

#### Scenario: The back link opens Overview
**ID**: SCN-CYA-003-A
- **GIVEN** the user is on check-your-answers
- **WHEN** they follow the back link
- **THEN** Overview is shown

### Requirement: A Change link returns to check-your-answers
**ID**: REQ-CYA-004
The system MUST return the user to check-your-answers after saving an answer edited via its Change link, even where answering that question during the normal flow would continue to a different page. For a notification being amended, that save is the page's "Save and return".

#### Scenario: Editing an answer via Change returns to check-your-answers with the new value
**ID**: SCN-CYA-004-A
- **GIVEN** the user is on check-your-answers
- **WHEN** they follow a Change link, edit the answer, and save it
- **THEN** they return to check-your-answers, showing the new value

#### Scenario: Changing the contact address from its card returns to the review
**ID**: SCN-CYA-004-B
- **GIVEN** the user is on the review of a draft
- **WHEN** they follow the Contact address card's Change link, choose a contact address and save
- **THEN** the contact address page opens, and after saving they return to the review showing that address

#### Scenario: Changing documents from a document card returns to the review
**ID**: SCN-CYA-004-C
- **GIVEN** a notification with a document uploaded
- **WHEN** the user follows a document card's Change link and continues from the upload documents page
- **THEN** they are back on the review

### Requirement: A draft notification offers submission and none of the post-submission actions
**ID**: REQ-CYA-005
The system MUST invite the user to submit a draft notification, offering a continue action, and MUST NOT offer copy-as-new, delete, or cancel-amendment while it is still a draft.

#### Scenario: The draft view invites submission and withholds the post-submission actions
**ID**: SCN-CYA-005-A
- **GIVEN** a draft notification is open on check-your-answers
- **WHEN** the user views it
- **THEN** it invites them to submit the notification, offering a continue action
- **AND** no copy-as-new, delete, or cancel-amendment action is offered

### Requirement: Continuing from a ready draft notification moves on to the declaration
**ID**: REQ-CYA-006
The system MUST take the user from a draft notification's check-your-answers to the declaration page when they continue, once every task is ready to submit.

#### Scenario: Continuing opens the declaration
**ID**: SCN-CYA-006-A
- **GIVEN** a draft notification is open on check-your-answers, with every task ready
- **WHEN** the user continues
- **THEN** the declaration page opens

#### Scenario: Transit countries are not owed for submission
**ID**: SCN-CYA-006-B
- **GIVEN** a draft arriving by road or rail with every task ready and no transit countries added
- **WHEN** the user views the review and continues
- **THEN** no "Complete transit countries" message or transit error is shown
- **AND** the declaration page opens

### Requirement: A draft notification that is not yet ready is refused on the review page, named card by card
**ID**: REQ-CYA-007
The system MUST refuse to continue from the review of a draft while any card still holds outstanding answers, MUST keep the user on the review page, and MUST show an error summary titled "There is a problem" naming every unfinished card, each entry linking to its card, which MUST itself be marked with the same words, except commodity details, which links to the first commodity card and marks none. The summary MUST stand as soon as the page is opened, and MUST take focus after a refused attempt.

#### Scenario: An unfinished review names every outstanding card and links to it
**ID**: SCN-CYA-007-A
- **GIVEN** a new notification is open on the review with cards still outstanding
- **WHEN** the user views the page
- **THEN** an error summary titled "There is a problem" names every unfinished card
- **AND** each entry links to the card it names, which is itself marked with the same words

#### Scenario: Continuing from an unfinished review is refused, keeping the user on the page
**ID**: SCN-CYA-007-B
- **GIVEN** a new notification is open on the review with cards still outstanding
- **WHEN** the user continues
- **THEN** they remain on the review page, the error summary is shown, and focus moves to it

#### Scenario: An unfinished card's message follows its title
**ID**: SCN-CYA-007-C
- **GIVEN** a new notification on the review with the origin, import reason and additional details still outstanding
- **WHEN** the user views the page
- **THEN** the messages, in the error summary and on the card, read "Complete origin of import", "Complete main import reason" and "Complete additional details"

#### Scenario: No commodity chosen marks the What are you importing? card
**ID**: SCN-CYA-007-D
- **GIVEN** a new notification on the review with no commodity chosen
- **WHEN** the user views the page
- **THEN** the error summary names "Complete what are you importing?", linking to the What are you importing? card, which is marked with the same words

#### Scenario: Unfinished commodity details are named without marking a commodity card
**ID**: SCN-CYA-007-E
- **GIVEN** a notification with a commodity chosen but its numbers not saved
- **WHEN** the user views the review
- **THEN** the error summary names "Complete commodity details", linking to the first commodity card
- **AND** no commodity card is marked as in error
- **GIVEN** a notification with no commodity chosen
- **WHEN** the user views the review
- **THEN** the same entry links to the "2. Description of the goods" heading

### Requirement: The review of a draft names each species of a multi-species consignment that is still short of its animals
**ID**: REQ-CYA-012
Where more than one chosen commodity asks for animal identifiers, the system MUST name in the error summary, straight after commodity details, each such species that has no animal identifier yet: "Enter the number of animals for <species>" while its number of animals is not given, otherwise "Enter at least 1 animal identifier for <species>", the species name in lower case. Each entry MUST link to that species' block, which MUST NOT be marked.

#### Scenario: A species with no count is named by its number of animals
**ID**: SCN-CYA-012-A
- **GIVEN** a notification whose cow (Bos taurus) and cat (Felis catus) lines both ask for identifiers, with no numbers saved
- **WHEN** the user views the review
- **THEN** the error summary names "Enter the number of animals for bos taurus" and "Enter the number of animals for felis catus", each linking to that species' block

#### Scenario: A counted species with no identifier is named by its identifiers
**ID**: SCN-CYA-012-B
- **GIVEN** the same two species with their numbers saved and no identifier saved for either
- **WHEN** the user views the review
- **THEN** the error summary names "Enter at least 1 animal identifier for bos taurus" and "Enter at least 1 animal identifier for felis catus", straight after "Complete commodity details", each linking to that species' block
- **AND** a species with an identifier saved is not named

#### Scenario: A single species asking for identifiers is not named
**ID**: SCN-CYA-012-C
- **GIVEN** a notification where only one chosen commodity asks for animal identifiers, with none saved
- **WHEN** the user views the review
- **THEN** no "Enter at least 1 animal identifier for" or "Enter the number of animals for" entry is shown

### Requirement: A submitted notification offers copy-as-new and delete
**ID**: REQ-CYA-008
The system MUST offer copy-as-new and delete actions on the read-only view of a submitted notification, and MUST NOT offer cancel-amendment while no amendment is in progress, or a submit/continue action to submit it again.

#### Scenario: The submitted view offers the actions open to a submitted notification
**ID**: SCN-CYA-008-A
- **GIVEN** a submitted notification is open on check-your-answers
- **WHEN** the user views it
- **THEN** copy-as-new and delete actions are offered, and no cancel-amendment action is shown
- **AND** no submit or continue action is shown

### Requirement: Copying a submitted notification from this page opens a new draft under its own reference
**ID**: REQ-CYA-009
The system MUST open a new draft when the user copies a submitted notification from check-your-answers, carrying a newly minted reference number distinct from the original's.

#### Scenario: Copy as new opens a distinct new draft
**ID**: SCN-CYA-009-A
- **GIVEN** a submitted notification is open on check-your-answers
- **WHEN** the user copies it as new
- **THEN** a new draft opens at Overview, carrying its own reference number, different from the original's

### Requirement: An amendment that is not yet ready holds Continue without an error
**ID**: REQ-CYA-010
While a notification is being amended, the system MUST show the review with no error summary and no error message against any card or role, and MUST keep the user on the review, still amending and without opening the declaration, when they continue while any answer is incomplete or breaks its rules.

#### Scenario: An incomplete amendment's review shows no error
**ID**: SCN-CYA-010-A
- **GIVEN** a notification being amended whose arrival date has been cleared and saved
- **WHEN** the user opens the review
- **THEN** no error summary and no error message is shown

#### Scenario: Continuing from an incomplete amendment stays on the review without an error
**ID**: SCN-CYA-010-B
- **GIVEN** a notification being amended whose arrival date has been cleared and saved
- **WHEN** the user continues
- **THEN** they stay on the review with no error summary or error message
- **AND** the notification is still being amended
- **AND** the declaration is not opened

#### Scenario: Continuing from an amendment whose arrival date breaks its rule stays on the review without an error
**ID**: SCN-CYA-010-C
- **GIVEN** a notification being amended whose arrival date at port has been changed to more than 6 months ahead
- **WHEN** the user continues on the review
- **THEN** they stay on the review with no error summary or error message
- **AND** the notification is still being amended
- **AND** the declaration is not opened

### Requirement: A transited territory is named with its country on the review
**ID**: REQ-CYA-011
The system MUST show each transited country in the review's Transit countries subsection of the Arrival details card by the name the transited countries page lists it under, naming a territory "<territory> (<country>)".

#### Scenario: A transited territory reads with its country
**ID**: SCN-CYA-011-A
- **GIVEN** the notification's transited countries include a territory
- **WHEN** the review page is shown
- **THEN** the Transit countries subsection names it "<territory> (<country>)", for example "Canary Islands (Spain)"
