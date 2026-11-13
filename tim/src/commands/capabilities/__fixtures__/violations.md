---
title: Import Notification Capability Map
version: 41
---

# Import Notification Capability Map

## A map with one row for each rule

| Code | Status | Capability | Notes |
|---|---|---|---|
| COMMON-CAP-00.1 | | **Sign in** | Blank status, canonical |
| CAP-01.1STATUS: NOT STARTED | | **Status glued to the code** | id-has-status |
| CAP-01.2 EXTERNAL | STATUS: COMPLETE | **External system** | id-has-external |
| CAP-01.3 STATUS: IN PROGRESS EXTERNAL | | **Both leftovers** | id-has-status and id-has-external |
| CAP-01.4 (draft) | STATUS: COMPLETE | **Leftover text** | id-not-clean |
| CAP-02.1 | **Missing status column** | | status-column-missing |
| CAP-02.2 | Done | **Status without its label** | status-cell-invalid |
| CAP-02.3 | STATUS: COMPLETE | | name-empty |
| CAP-02.4 | STATUS: COMPLETE |
| CAP-02.5 | STATUS: SKELETON | **Transport** **to the** **border** | Three bold runs, canonical |
| CAP-02.6 | STATUS: NOT
STARTED | **Status broken across lines** | status-cell-invalid |
| CAP-H.3 | STATUS: NOT STARTED | **High-risk plants** | Canonical |
| CORE-CAP-1.1 EXTERNAL STATUS: COMPLETE | **Core journey** | | id-has-status, id-has-external and status-column-missing |
| CAP-03.1 | STATUS: COMPLETE | **Health
certificate** | Canonical, broken across lines |
| CAP-04.1 status: x | | **Lower-case status label** | id-has-status |
| CAP-04.2 External | STATUS: COMPLETE | **Mixed-case external label** | id-has-external |
| CAP-03.2 | Done | | status-cell-invalid and name-empty |
| CAP-09.9 | STATUS: COMPLETE