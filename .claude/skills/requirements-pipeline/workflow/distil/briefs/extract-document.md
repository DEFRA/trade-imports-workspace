# Extract: a document

A `document` source is a file the main session copied into `<workarea>/sources/`: a Word document, a PDF, a text
or Markdown file, meeting notes, a spreadsheet exported as CSV. The `locator` is the file. Read
[`extract.md`](extract.md) first: its rules all hold here.

## Reading it

| File | How |
|---|---|
| `.md`, `.txt`, `.csv` | The Read tool, in pages with `offset` and `limit` when it is long |
| `.pdf` | The Read tool, with `pages`: at most 20 pages a call |
| `.docx` | A zip. Get the text with `unzip -p <file> word/document.xml > <your working file>`, then read that |

A `.docx` needs care, or every table collapses onto one line. Before you strip the XML tags, find the boundaries of
paragraphs (`</w:p>`), table rows (`</w:tr>`) and table cells (`</w:tc>`) in the working file with `grep -c`, and
read the XML with those boundaries in mind. Record a table cell by its row and column in `ref`.

Your prompt names a working folder you may write to. Nothing else under the workarea is yours to write.

## Characterise the document

The characterise step writes into the partition's `structure` what the document is (a policy paper, a decision
record, meeting notes), its date and author where it says, its sections in order, and every table with its columns.
It cuts the document into parts of consecutive sections or pages.

An extract part reads every section or page its `read` names in full, and its part file's `structure` names them.

## Meeting notes

Meeting notes record people, not policy. A claim from them says who said or agreed what, as the notes put it:
"The meeting agreed …", "One attendee raised …". An action or an open point is a claim. A point the meeting left
undecided is a `gap` claim, quoting what was said. Never turn a suggestion into a decision.
