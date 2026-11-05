# EUDPA-711: Design Release 2.1: address book — addresses have a type and uses, with category tabs and a type filter

## Metadata
- **Type:** Story
- **Status:** Deskcheck
- **Priority:** Lowest
- **Labels:** 
- **Parent:** EUDPA-646
- **Assignee:** Paul Hodgson

## Description

<h3><a name="Background"></a>Background</h3>

<p>Traders keep the addresses they use on import notifications in the Import notification service front door's address book. Design Release 2.1 gives every address a type and a list of what it can be used for, and organises the address book around them. The redesign is delivered as six tickets, one after another, each on its own branch. This is ticket 6 of 6, the last.</p>

<h3><a name="Whatchangesfortheuser"></a>What changes for the user</h3>

<ul>
	<li>The address book API stores an address's type and uses, and requires both: a create or update without them is refused. Every service and test tool that adds addresses sends them. The API is only used by our own services, and test environments' addresses expire after 7 days, so no existing address needs to stay without a type.</li>
	<li>Adding an address starts by choosing its type: Origin or Consignor, Destination, Consignee or Importer, or Branch. Origin or Consignor opens with United Kingdom selected.</li>
	<li>The add form takes the heading 'Add address and contact details', with the caption 'Add new address' and a Back link to 'Choose an address type'.</li>
	<li>The add form then asks 'What can this address be used for?' and saves the address's type and every use ticked. A use is required.</li>
	<li>Destination, Consignee or Importer, and Branch addresses are entered by hand with the country fixed to United Kingdom.</li>
	<li>The list has three tabs: Origin and Consignor; Destination, Consignee and Importer; and Branch. A Type column shows each address's uses.</li>
	<li>A Type filter narrows a tab. Search also finds an address by its uses.</li>
	<li>After adding an address the trader lands on the tab for its type.</li>
	<li>Editing an address keeps its type and every use.</li>
	<li>A new address added from a notification can also be saved for the other roles on its side.</li>
	<li>Welsh drafts for every new or changed English string, marked as unreviewed machine translations.</li>
</ul>


<h3><a name="Notinthisticket"></a>Not in this ticket</h3>

<ul>
	<li>A Transporter tab and type wait for a decision on whether and where transporters are managed.</li>
	<li>Finding a UK address by postcode waits until the address lookup is a real feature.</li>
</ul>


<h3><a name="Acceptancecriteria"></a>Acceptance criteria</h3>

<p>To be replaced by the scenarios in the service's behaviour specification once built. Until then, the backlog rows:</p>

<ul>
	<li>The address book record carries the address's type and what it can be used for (inc-059)</li>
	<li>The address book list is split into three category tabs with a Type column (inc-067)</li>
	<li>Type filter within a tab, search by type, and tab and page links that keep the trader's filters (inc-068)</li>
	<li>Adding an address starts by choosing its type (inc-061)</li>
	<li>Saving a new address with its uses, landing on its type's tab, an edit keeping the type and uses, and the API requiring a type and at least one use (inc-070)</li>
	<li>Destination, Consignee or Importer and Branch addresses entered by hand, with a fixed UK country (inc-071)</li>
	<li>A new address added from a notification can also be saved for the other roles on its side, with Welsh for this ticket's pages (inc-079)</li>
</ul>

## Acceptance Criteria

<!-- Extract from description above - look for "AC:", "Acceptance Criteria:", numbered lists, Given/When/Then -->

## Comments (0)



## Confluence References


