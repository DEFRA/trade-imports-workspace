# Extract: an image

An `image` source is a design, a screenshot or a board, as one image file or a folder of them. The `locator` is the
file or folder. Read [`extract.md`](extract.md) first: its rules all hold here.

## Reading it

Read each image with the Read tool, **one file at a time**. For a folder, list it first with
`find <folder> -maxdepth 1 -type f` and read the files in name order.

## Characterise the images

The characterise step writes into the partition's `structure` every file, in order, and what each shows (a page
design, a flow diagram, a sticky-note board), says which ones the `scope` covers and which it left out, and cuts them
into parts of consecutive images.

An extract part reads every image its `read` names, and claims everything legible on each.

## What a claim says

- Copy you can read on the image is `verbatim`: headings, labels, hints, buttons, error messages, exactly as shown,
  including capitals and punctuation. Quote it.
- What the layout implies, such as a field being optional because it has no asterisk, is `inferred`, and the
  statement says what you saw.
- Text you cannot read with confidence is a `gap` claim naming where it is, never a guess.
- `ref` is the file name and the region, such as `origin-page.png, top form, second field`.
- Name a GOV.UK component only where the image shows it plainly, such as radios or a date input.
