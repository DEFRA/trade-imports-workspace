# Ruling: Sam, 16 November 2026

Given in the overview-and-review build session, answering the status page's question on plants' customs document code.

1. Plants' customs document code is **C085**, the CDS document code for the Common Health Entry Document for Plants,
   Plant Products and Other Objects (CHED-PP). C640 stays the animals code (CHED-A). Sam: "sounds like you've got a
   good shout on what the plants should be, just do the plants code". This unblocks req-2002 and inc-199.

2. **No new "Submitted action required" status.** A notification submitted with outstanding items (such as a missing
   health certificate) is `SUBMITTED`, like any other. Agreed with Syed Islam (16 Nov): a status that does not align
   with the notification flow is not introduced, and outstanding actions are shown through a banner-style alert, which
   the dashboard designs under test introduce. This withdraws the 9 October afternoon ruling's "Submitted action
   required" status (req-902's status, req-1987's new status) and the 'Action required' tag on the live-animals list
   (inc-131's action-required criteria). What stays: submitting records its date and the outstanding items left at
   that moment (req-909), since a future banner needs them. The notification's status tag reads 'Submitted', and the
   view's action-required warning, its 'Continue' and the review's 'Upload a valid health certificate' error come out
   with the status (req-902, req-903, req-907) until the banner design is agreed. Orchestrator's call, applying the
   ruling narrowly: nothing action-required is shown until that design lands.
   "Completed" stays out until a real source of completion exists: none does today.
