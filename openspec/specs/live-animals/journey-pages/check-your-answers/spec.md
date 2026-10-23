# Check Your Answers Page Specification

## Purpose

The page on which a whole notification is read back before submission, and read again once submitted. The page is titled "Review your notification" while a notification is being amended, and "Review before re-submitting" once an amendment's answers differ from the submitted version. A draft's review and a submitted notification's view are headed and titled by its reference number, with its status as a tag, its date and the actions open to it in a header, and its import reference numbers. A submitted notification's view offers Amend this notification, Copy as new and Delete in its header, and shows its import reference numbers. While a template is being created the page is the template review, titled "Review your template", specified by live-animals/notification-templates (REQ-TEMPLATES-013 to REQ-TEMPLATES-018).

## Requirements

### Requirement: The review draws the same six numbered sections as Overview, in order, whatever the notification holds
**ID**: REQ-CYA-001
For a notification, the system MUST group the page under the same six numbered section headings the Overview task list uses, MUST draw all six in that order however little the notification holds, and MUST stand every card directly under its section heading, with no subsection heading between them, titled one heading level below it. Which cards stand within a section MAY depend on the notification. The system MUST read each card's rows under the names the scenarios give.

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
- **GIVEN** a draft, or a notification being amended, with no documents uploaded
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
- **AND** for a reason that asks none of the exit questions, such as Re-entry, the Main import reason card shows no "Destination country", "Exit date", "Port of exit" or "Exit border control post" row
- **AND** the additional details answers, when there are any to show, stand on the card titled "Additional details" and read "Certified for" and, where the unweaned question was asked, "Includes unweaned animals"

#### Scenario: The contact address section holds one Contact address card
**ID**: SCN-CYA-001-H
- **GIVEN** a notification with a contact address chosen
- **WHEN** the user views the review
- **THEN** "6. Contact address" holds one card titled "Contact address" with a "Contact address" row showing the chosen address

#### Scenario: Each copied address reads back as its name, address lines and country, with no telephone or email
**ID**: SCN-CYA-001-S
- **GIVEN** a notification whose consignment roles and contact address hold copied addresses with a telephone number and email address
- **WHEN** the user views the review
- **THEN** each role's row in the Addresses card, and the "Contact address" row, reads the name, then each non-empty address line, town or city, county and postcode, then the country, each on its own line
- **AND** a country of GB reads "United Kingdom"
- **AND** no telephone number or email address is shown, even for a copy refused for its contact details

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

#### Scenario: An overland arrival with no transit countries reads Not applicable, and other arrivals have no transit subsection
**ID**: SCN-CYA-001-T
- **GIVEN** a notification arriving by road or rail with no transit countries added and every task ready
- **WHEN** the user views the review
- **THEN** the Arrival details card still holds the "Transit countries" subsection, its row "Countries that the consignment will travel through" reading "Not applicable"
- **GIVEN** a notification arriving by sea or air
- **WHEN** the user views the review
- **THEN** the Arrival details card holds no "Transit countries" subsection

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

### Requirement: A blank is written out as "Not applicable" on a settled card and left blank on one still outstanding
**ID**: REQ-CYA-002
On a notification's review, the system MUST draw a blank by the card it sits in: "Not applicable" on a card with nothing further owed; visibly blank, with "Missing" announced for a screen reader, on a card still holding outstanding answers. It MUST treat every blank row in a marked card alike, optional or not, and MUST NOT raise a role error against a party role nobody has reached yet; REQ-ADDR-005 reserves that error for a copied address that breaks the address book's rules.

#### Scenario: A blank row is written out on a settled card and left blank on an outstanding one
**ID**: SCN-CYA-002-A
- **GIVEN** the user has answered only the entry page of a notification
- **WHEN** they view the review
- **THEN** a blank row on a card with nothing further owed reads "Not applicable"
- **AND** a blank row on a card still holding outstanding answers is visibly blank, with "Missing" announced in its place for a screen reader
- **AND** every blank row in that marked card is left blank in the same way, the optional ones included

#### Scenario: An unanswered party role is left blank, with no role error shown
**ID**: SCN-CYA-002-B
- **GIVEN** a new notification whose party roles have not yet been answered
- **WHEN** the user views the review
- **THEN** each unanswered role is left visibly blank with "Missing" announced for a screen reader, and no role error is raised against it

#### Scenario: A refused Continue leaves an unfinished card's blank answers blank, marked only by the card
**ID**: SCN-CYA-002-C
- **GIVEN** the user has answered only the entry page of a notification
- **WHEN** they choose Continue on the review and it is refused
- **THEN** each blank answer in an unfinished card is left blank with "Missing" announced for a screen reader, with no mark beside or under it
- **AND** the only visible marking on that card is its red left border and its "Complete" line, at desktop width and at phone width

### Requirement: A back link returns to Overview from an amendment's review, and to the notification list from a draft's review or a submitted notification's view
**ID**: REQ-CYA-003
The system MUST return the user to Overview when they follow the back link from the review of an amendment, and MUST take them to the live-animals notification list when they follow it from the review of a draft or from a submitted notification's view.

#### Scenario: A draft's review back link opens the notification list
**ID**: SCN-CYA-003-A
- **GIVEN** the user is on the review of a draft notification
- **WHEN** they follow the back link
- **THEN** the live-animals notification list is shown

#### Scenario: The submitted view's back link opens the notification list
**ID**: SCN-CYA-003-B
- **GIVEN** the user is on a submitted notification's view
- **WHEN** they follow the back link
- **THEN** the live-animals notification list is shown

#### Scenario: An amendment's review back link opens Overview
**ID**: SCN-CYA-003-C
- **GIVEN** the user is on the review of a notification being amended
- **WHEN** they follow the back link
- **THEN** Overview is shown

#### Scenario: The submitted view shown after an amendment is cancelled has a back link to the notification list
**ID**: SCN-CYA-003-D
- **GIVEN** the user has just cancelled an amendment and the submitted notification's view is shown with its cancelled message
- **WHEN** they follow the back link
- **THEN** the live-animals notification list is shown

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

### Requirement: A draft's review offers Copy as new and Delete in its header and ends with Continue
**ID**: REQ-CYA-005
The system MUST offer in a draft's review header a "Copy as new" button as the primary button and a red "Delete" that opens the notification's delete confirmation, and MUST end the review with "Continue" and no Delete beside it. It MUST NOT offer "Amend this notification" or cancel-amendment while the notification is a draft.

#### Scenario: The draft's review offers Copy as new and a red Delete in its header and ends with Continue
**ID**: SCN-CYA-005-A
- **GIVEN** a draft notification is open on check-your-answers
- **WHEN** the user views it
- **THEN** the header offers "Copy as new" and a red "Delete", in that order
- **AND** the page ends with "Continue" alone
- **AND** no "Amend this notification" or cancel-amendment action is offered

#### Scenario: Delete on a draft opens the delete confirmation
**ID**: SCN-CYA-005-B
- **GIVEN** a draft notification is open on check-your-answers
- **WHEN** the user selects "Delete"
- **THEN** the delete confirmation for that notification opens

#### Scenario: Copy as new on a draft's review opens a distinct new draft
**ID**: SCN-CYA-005-C
- **GIVEN** a draft notification is open on check-your-answers
- **WHEN** the user selects "Copy as new"
- **THEN** a new draft opens at Overview, carrying its own reference number, different from the original's

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
**ID**: REQ-CYA-021
Where more than one chosen commodity asks for animal identifiers, the system MUST name in the error summary, straight after commodity details, each such species that has no animal identifier yet: "Enter the number of animals for <species>" while its number of animals is not given, otherwise "Enter at least 1 animal identifier for <species>", the species name in lower case. Each entry MUST link to that species' block, which MUST NOT be marked.

#### Scenario: A species with no count is named by its number of animals
**ID**: SCN-CYA-021-A
- **GIVEN** a notification whose cow (Bos taurus) and cat (Felis catus) lines both ask for identifiers, with no numbers saved
- **WHEN** the user views the review
- **THEN** the error summary names "Enter the number of animals for bos taurus" and "Enter the number of animals for felis catus", each linking to that species' block

#### Scenario: A counted species with no identifier is named by its identifiers
**ID**: SCN-CYA-021-B
- **GIVEN** the same two species with their numbers saved and no identifier saved for either
- **WHEN** the user views the review
- **THEN** the error summary names "Enter at least 1 animal identifier for bos taurus" and "Enter at least 1 animal identifier for felis catus", straight after "Complete commodity details", each linking to that species' block
- **AND** a species with an identifier saved is not named

#### Scenario: A single species asking for identifiers is not named
**ID**: SCN-CYA-021-C
- **GIVEN** a notification where only one chosen commodity asks for animal identifiers, with none saved
- **WHEN** the user views the review
- **THEN** no "Enter at least 1 animal identifier for" or "Enter the number of animals for" entry is shown

### Requirement: A submitted notification's view offers Amend this notification, Copy as new and Delete in its header
**ID**: REQ-CYA-008
On a submitted notification's view, the system MUST offer in its header a primary "Amend this notification" button, a "Copy as new" button (the primary button when Amend is not offered) and a red "Delete" button. Amend and Copy as new MUST each submit a form. The view MUST NOT offer cancel-amendment or a submit action, and a draft's review MUST NOT offer Amend.

#### Scenario: The submitted view offers the actions open to a submitted notification
**ID**: SCN-CYA-008-A
- **GIVEN** a submitted notification is open on check-your-answers
- **WHEN** the user views it
- **THEN** "Amend this notification", "Copy as new" and a red "Delete" are offered in that order, "Copy as new" as a secondary button
- **AND** no cancel-amendment action is shown
- **AND** no submit or continue action is shown

#### Scenario: Amend this notification starts an amendment
**ID**: SCN-CYA-008-B
- **GIVEN** a submitted notification's view
- **WHEN** the user chooses "Amend this notification"
- **THEN** Overview opens with the notification's status "Amend"

#### Scenario: Delete opens the delete confirmation
**ID**: SCN-CYA-008-C
- **GIVEN** a submitted notification's view
- **WHEN** the user chooses "Delete"
- **THEN** the delete confirmation opens

#### Scenario: A draft's review offers no Amend this notification
**ID**: SCN-CYA-008-D
- **GIVEN** a draft notification's review
- **WHEN** the user views it
- **THEN** no "Amend this notification" button is shown

#### Scenario: A submitted notification that cannot be amended offers Copy as new as its primary button
**ID**: SCN-CYA-008-E
- **GIVEN** a submitted notification that cannot be amended is open on check-your-answers
- **WHEN** the user views it
- **THEN** no "Amend this notification" button is shown
- **AND** "Copy as new" is the primary button, followed by a red "Delete"

### Requirement: Copying a submitted notification from this page opens a new draft under its own reference
**ID**: REQ-CYA-009
The system MUST open a new draft when the user copies a submitted notification from check-your-answers, carrying a newly minted reference number distinct from the original's.

#### Scenario: Copy as new opens a distinct new draft
**ID**: SCN-CYA-009-A
- **GIVEN** a submitted notification is open on check-your-answers
- **WHEN** the user copies it as new
- **THEN** a new draft opens at Overview, carrying its own reference number, different from the original's

### Requirement: The review marks the uploaded-documents card while a document is still being scanned or was found infected, and refuses to continue while it is
**ID**: REQ-CYA-010
The system MUST mark the uploaded-documents card on a draft's review while any stored document is still being scanned or has been found infected — putting the infected message ahead of the still-scanning one — and MUST refuse to continue from the review while either is so, returning the user to the review with that error shown.

#### Scenario: Continuing while a document is still being scanned is refused, marking the uploaded-documents card on the review
**ID**: SCN-CYA-010-A
- **GIVEN** a ready draft notification is open on the review, and one of its documents is still being scanned
- **WHEN** the user continues
- **THEN** they are returned to the review, which marks the uploaded-documents card as still being scanned

#### Scenario: An infected document marks the uploaded-documents card in preference to one still scanning
**ID**: SCN-CYA-010-B
- **GIVEN** a ready draft notification is open on the review, and one of its documents has been found infected while another is still being scanned
- **WHEN** the user continues
- **THEN** they are returned to the review, which marks the uploaded-documents card as holding an infected document, not as still being scanned

### Requirement: Continuing is refused if the notification has changed since the review was shown
**ID**: REQ-CYA-011
The system MUST refuse to continue from the review to the declaration if the notification has changed since that review was shown — in another tab or by another user — and MUST return the user to the review showing the notification as it now stands, under a message that it has been updated since they opened it.

#### Scenario: A change made in another tab after the review was shown sends the user back to the review
**ID**: SCN-CYA-011-A
- **GIVEN** a ready draft notification is open on the review
- **AND** the notification is then changed in another tab
- **WHEN** the user continues from the review they already have open
- **THEN** the review is shown again with the changed answer, under a message that the notification has been updated since they opened it
- **AND** the declaration is not shown

### Requirement: An amendment that is not yet ready opens without an error and refuses Continue with one
**ID**: REQ-CYA-012
While a notification is being amended, the system MUST show the review with no error summary and no error message when it is opened, and MUST refuse Continue while any answer is incomplete or breaks its rules, keeping the user on the review, still amending and without opening the declaration, under an error summary titled "There is a problem" that names each reason and takes focus, as a draft's refused Continue does.

#### Scenario: An incomplete amendment's review opens with no error
**ID**: SCN-CYA-012-A
- **GIVEN** a notification being amended whose arrival date has been cleared and saved
- **WHEN** the user opens the review
- **THEN** no error summary and no error message is shown

#### Scenario: Continuing from an incomplete amendment stays on the review, naming what is missing
**ID**: SCN-CYA-012-B
- **GIVEN** a notification being amended whose arrival date has been cleared and saved
- **WHEN** the user continues
- **THEN** they stay on the review, under an error summary titled "There is a problem" that names the arrival details and takes focus
- **AND** the notification is still being amended
- **AND** the declaration is not opened

#### Scenario: Continuing from an amendment whose arrival date breaks its rule stays on the review, naming it
**ID**: SCN-CYA-012-C
- **GIVEN** a notification being amended whose arrival date at port has been changed to more than 6 months ahead
- **WHEN** the user continues on the review
- **THEN** they stay on the review, under an error summary that names the arrival details
- **AND** the notification is still being amended
- **AND** the declaration is not opened

### Requirement: A transited territory is named with its country on the review
**ID**: REQ-CYA-020
The system MUST show each transited country in the review's Transit countries subsection of the Arrival details card by the name the transited countries page lists it under, naming a territory "<territory> (<country>)".

#### Scenario: A transited territory reads with its country
**ID**: SCN-CYA-020-A
- **GIVEN** the notification's transited countries include a territory
- **WHEN** the review page is shown
- **THEN** the Transit countries subsection names it "<territory> (<country>)", for example "Canary Islands (Spain)"

### Requirement: An amendment's review ends with Continue, Cancel amend and Delete
**ID**: REQ-CYA-022
While a notification is being amended, the system MUST end the review with "Continue", which goes on to resubmission, a secondary "Cancel amend" button that opens the cancel-amendment confirmation, and a red "Delete" that opens the delete confirmation. The status bar on this page MUST NOT also offer "Cancel amend".

#### Scenario: The amendment review ends with three controls and no status bar Cancel amend
**ID**: SCN-CYA-022-A
- **GIVEN** a notification being amended is open on the review
- **WHEN** the user reads the end of the page
- **THEN** it ends with "Continue", a secondary "Cancel amend" button and a red "Delete" button
- **AND** the status bar offers no "Cancel amend"

#### Scenario: Cancel amend opens the cancel-amendment confirmation
**ID**: SCN-CYA-022-B
- **GIVEN** a notification being amended is open on the review
- **WHEN** the user selects "Cancel amend"
- **THEN** the cancel-amendment confirmation opens

#### Scenario: Delete opens the delete confirmation
**ID**: SCN-CYA-022-C
- **GIVEN** a notification being amended is open on the review
- **WHEN** the user selects "Delete"
- **THEN** the delete confirmation for that notification opens

### Requirement: An amendment's review says it is re-submitting once an answer changes
**ID**: REQ-CYA-014
The system MUST head and title an amendment's review "Review your notification" when it is opened, and "Review before re-submitting" once any notification answer differs from the submitted version. A change to the uploaded documents alone MUST NOT count as a changed answer.

#### Scenario: An unchanged amendment reads Review your notification
**ID**: SCN-CYA-014-A
- **GIVEN** a notification being amended with no answer changed
- **WHEN** the user opens the review
- **THEN** the page heading and browser title read "Review your notification"

#### Scenario: A changed answer retitles the review
**ID**: SCN-CYA-014-B
- **GIVEN** a notification being amended
- **WHEN** the user changes the internal reference and selects "Save and return"
- **THEN** the review heading and browser title read "Review before re-submitting"

#### Scenario: Adding a document alone leaves the heading unchanged
**ID**: SCN-CYA-014-C
- **GIVEN** a notification being amended
- **WHEN** the user adds a document and opens the review
- **THEN** the review heading still reads "Review your notification"

### Requirement: A submitted notification's view is headed by its reference and status, and dated
**ID**: REQ-CYA-015
A submitted notification's view MUST be headed and titled by its reference number instead of "Review your notification", with its status as a tag (REQ-CYA-018 for action required) and no status bar, and MUST show the UK day it was submitted under the heading, unchanged on every later visit. An amendment's review MUST keep its heading, title (REQ-CYA-014) and status bar; a draft's is headed per REQ-CYA-019.

#### Scenario: The submitted view is headed by its reference with a Submitted tag
**ID**: SCN-CYA-015-A
- **GIVEN** a notification that has been submitted
- **WHEN** the user opens its view
- **THEN** the page heading is the notification's reference number
- **AND** a "Submitted" tag stands beside it
- **AND** no status bar is shown

#### Scenario: The submitted view is titled by its reference
**ID**: SCN-CYA-015-B
- **GIVEN** a notification that has been submitted
- **WHEN** the user opens its view
- **THEN** the browser title reads "<reference> - Import notification service - GOV.UK"
- **AND** the review of an amendment is still titled "Review your notification"

#### Scenario: The submitted view shows the date it was submitted
**ID**: SCN-CYA-015-C
- **GIVEN** a notification submitted at 23:30 UTC on 21 July 2026
- **WHEN** the user opens its view
- **THEN** under the heading it reads "Date submitted: 22 July 2026"

#### Scenario: The date submitted reads the same on a later visit
**ID**: SCN-CYA-015-D
- **GIVEN** a submitted notification's view
- **WHEN** the user opens it again later
- **THEN** "Date submitted:" shows the same day

### Requirement: Opening the view of a notification that does not exist goes to the notification list
**ID**: REQ-CYA-016
The system MUST send the user to the live-animals notification list when they open the view of a notification that does not exist.

#### Scenario: An unknown notification's view opens the notification list
**ID**: SCN-CYA-016-A
- **GIVEN** no notification has the reference GBN-AG-00-000000
- **WHEN** the user opens that notification's view
- **THEN** the live-animals notification list is shown

### Requirement: A submitted notification's view and a draft's review show the import reference numbers as text to copy
**ID**: REQ-CYA-017
On a submitted notification's view or a draft's review, the system MUST show a section headed "Import reference numbers" with the warning "You must use the correct reference and code on the customs declaration or your consignment will be delayed.", a "Notification reference" row with the notification's reference and a "Customs document code" row reading "C640". Each value MUST be plain text the user can select and copy with JavaScript on or off, and no "Copy" button is shown.

#### Scenario: The submitted view shows the notification reference and customs document code
**ID**: SCN-CYA-017-A
- **GIVEN** a notification that has been submitted
- **WHEN** the user opens its view
- **THEN** an "Import reference numbers" section shows the warning "You must use the correct reference and code on the customs declaration or your consignment will be delayed."
- **AND** it holds a "Notification reference" row reading the notification's reference and a "Customs document code" row reading "C640"

#### Scenario: The import reference numbers read as plain text without JavaScript
**ID**: SCN-CYA-017-B
- **GIVEN** JavaScript is off
- **WHEN** the user opens a submitted notification's view
- **THEN** both import reference values are shown as text
- **AND** no "Copy" button is shown

#### Scenario: A draft's review shows its import reference numbers
**ID**: SCN-CYA-017-C
- **GIVEN** a draft notification's review
- **WHEN** the user views it
- **THEN** the "Import reference numbers" section shows its warning, a "Notification reference" row reading the reference and a "Customs document code" row reading "C640"
- **AND** no "Copy" button is shown

### Requirement: A notification submitted without its health certificate is shown as Submitted action required
**ID**: REQ-CYA-018
A notification submitted with no ITAHC or health certificate MUST be shown as "Submitted action required": read-only, tagged so, with the same header actions as "Submitted", ending with "Continue", which starts an amendment and opens the hub. A certificate counts only once its virus scan has passed, and a veterinary health certificate never does. It MUST show the warning "You need to upload a health certificate" only when that is the only outstanding item.

#### Scenario: Submitting without a health certificate shows Submitted action required
**ID**: SCN-CYA-018-A
- **GIVEN** a notification submitted with no document
- **WHEN** the user opens its view
- **THEN** it is tagged "Submitted action required"
- **AND** it shows the warning "You need to upload a health certificate"
- **AND** it offers no Change links

#### Scenario: Submitting with an ITAHC shows Submitted
**ID**: SCN-CYA-018-B
- **GIVEN** a notification submitted with an ITAHC
- **WHEN** the user opens its view
- **THEN** it is tagged "Submitted"
- **AND** it shows no warning

#### Scenario: With nothing uploaded, the documents section asks for a valid health certificate
**ID**: SCN-CYA-018-C
- **GIVEN** a notification submitted with no document
- **WHEN** the user opens its view
- **THEN** "4. Uploaded documents" shows "Upload a valid health certificate" and no document cards
- **AND** no error summary is shown

#### Scenario: The header offers Amend this notification, Copy as new and Delete
**ID**: SCN-CYA-018-D
- **GIVEN** a notification submitted without its health certificate
- **WHEN** the user opens its view
- **THEN** the header offers "Amend this notification", "Copy as new" and "Delete"

#### Scenario: Continue starts an amendment and opens Overview
**ID**: SCN-CYA-018-E
- **GIVEN** a notification submitted without its health certificate
- **WHEN** the user chooses "Continue"
- **THEN** Overview opens with the notification's status "Amend"
- **AND** this works without JavaScript

#### Scenario: Another document does not stand in for the health certificate
**ID**: SCN-CYA-018-F
- **GIVEN** a notification submitted with only a veterinary health certificate
- **WHEN** the user opens its view
- **THEN** it is tagged "Submitted action required" with the warning "You need to upload a health certificate"
- **AND** its document card is shown

### Requirement: A draft's review is headed by its reference, its Draft status and the date it was created
**ID**: REQ-CYA-019
The system MUST head the review of a draft, reached from Overview's "Review and submit", with the notification's reference in place of "Review your notification", a "Draft" tag beside it and no status bar. It MUST title the page by the reference and MUST show "Date created: <d Month yyyy>", the UK day the notification was created, under the heading. The review stays editable, with its Change links, error summary (REQ-CYA-007) and Continue (REQ-CYA-005).

#### Scenario: The draft's review is headed by its reference with a Draft tag
**ID**: SCN-CYA-019-A
- **GIVEN** a draft notification
- **WHEN** the user opens its review from Overview's "Review and submit"
- **THEN** the page heading is the notification's reference number
- **AND** a "Draft" tag stands beside it
- **AND** no status bar is shown

#### Scenario: The draft's review is titled by its reference
**ID**: SCN-CYA-019-B
- **GIVEN** a draft notification
- **WHEN** the user opens its review
- **THEN** the browser title reads "<reference> - Import notification service - GOV.UK"
- **AND** it is led by "Error: " while the error summary names outstanding cards

#### Scenario: The draft's review shows the date it was created
**ID**: SCN-CYA-019-C
- **GIVEN** a draft created at 23:30 UTC on 21 July 2026
- **WHEN** the user opens its review
- **THEN** under the heading it reads "Date created: 22 July 2026"

### Requirement: Ports and destination countries read back exactly as they were offered
**ID**: REQ-CYA-013
The system MUST show the port of entry and the port of exit on the review exactly as the port was offered when it was chosen, reading "<port name> - <port code>", and MUST name a territory chosen as the destination country "<territory> (<country>)", as the destination country list does.

#### Scenario: The port of exit row reads the option the user chose
**ID**: SCN-CYA-013-A
- **GIVEN** a transit notification whose port of exit is Port of Dover
- **WHEN** the user views the review
- **THEN** the port of exit row reads "Port of Dover - GB DVR", the same text as the option they chose

#### Scenario: The port of entry row reads the port's name, a dash and its code
**ID**: SCN-CYA-013-B
- **GIVEN** a notification whose port of entry is Aberdeen Harbour
- **WHEN** the user views the review
- **THEN** the port of entry row reads "Aberdeen Harbour - GB ABD"

#### Scenario: A territory destination country is named with its country
**ID**: SCN-CYA-013-C
- **GIVEN** a transhipment notification whose destination country is Martinique
- **WHEN** the user views the review
- **THEN** the destination country row reads "Martinique (France)"
