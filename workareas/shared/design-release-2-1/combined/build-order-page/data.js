window.DR21_BUILD_ORDER = {
  "generatedAt": "2026-10-12",
  "totals": {
    "themes": 17,
    "levels": 8,
    "rows": 201,
    "live": 195,
    "done": 53,
    "blocked": 45,
    "deferred": 9,
    "dropped": 6,
    "ticketed": 7,
    "ready": 2,
    "edgesRecorded": 48,
    "edgesDrawn": 25,
    "percent": 27
  },
  "levels": [
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8
  ],
  "themes": [
    {
      "id": "journey-foundation",
      "rows": 7,
      "done": 7,
      "todo": 0,
      "blocked": 0,
      "deferred": 0,
      "dropped": 0,
      "name": "Journey foundation",
      "ticket": "EUDPA-691",
      "live": 7,
      "level": 1,
      "follows": [],
      "followsAll": [],
      "inherits": 0,
      "state": "done",
      "ready": false
    },
    {
      "id": "reference-lists",
      "rows": 3,
      "done": 3,
      "todo": 0,
      "blocked": 0,
      "deferred": 0,
      "dropped": 0,
      "name": "Reference lists",
      "ticket": "EUDPA-692",
      "live": 3,
      "level": 1,
      "follows": [],
      "followsAll": [],
      "inherits": 0,
      "state": "done",
      "ready": false
    },
    {
      "id": "address-book",
      "rows": 23,
      "done": 0,
      "todo": 21,
      "blocked": 2,
      "deferred": 0,
      "dropped": 0,
      "name": "Address book",
      "ticket": null,
      "live": 23,
      "level": 2,
      "follows": [
        "reference-lists"
      ],
      "followsAll": [
        "reference-lists"
      ],
      "inherits": 1,
      "state": "open",
      "ready": true
    },
    {
      "id": "arrival-and-transit",
      "rows": 6,
      "done": 5,
      "todo": 0,
      "blocked": 0,
      "deferred": 0,
      "dropped": 1,
      "name": "Arrival and transit",
      "ticket": "EUDPA-694",
      "live": 5,
      "level": 2,
      "follows": [
        "journey-foundation",
        "reference-lists"
      ],
      "followsAll": [
        "journey-foundation",
        "reference-lists"
      ],
      "inherits": 2,
      "state": "done",
      "ready": false
    },
    {
      "id": "commodities-and-reason",
      "rows": 10,
      "done": 6,
      "todo": 0,
      "blocked": 4,
      "deferred": 0,
      "dropped": 0,
      "name": "Commodities and import reason",
      "ticket": "EUDPA-693",
      "live": 10,
      "level": 2,
      "follows": [
        "journey-foundation"
      ],
      "followsAll": [
        "journey-foundation"
      ],
      "inherits": 1,
      "state": "part",
      "ready": false
    },
    {
      "id": "documents",
      "rows": 6,
      "done": 0,
      "todo": 5,
      "blocked": 1,
      "deferred": 0,
      "dropped": 0,
      "name": "Documents",
      "ticket": null,
      "live": 6,
      "level": 2,
      "follows": [
        "journey-foundation"
      ],
      "followsAll": [
        "journey-foundation"
      ],
      "inherits": 1,
      "state": "open",
      "ready": true
    },
    {
      "id": "origin-page",
      "rows": 3,
      "done": 3,
      "todo": 0,
      "blocked": 0,
      "deferred": 0,
      "dropped": 0,
      "name": "Origin page",
      "ticket": "EUDPA-695",
      "live": 3,
      "level": 2,
      "follows": [
        "reference-lists"
      ],
      "followsAll": [
        "reference-lists"
      ],
      "inherits": 1,
      "state": "done",
      "ready": false
    },
    {
      "id": "identification-and-permanent-address",
      "rows": 12,
      "done": 0,
      "todo": 10,
      "blocked": 1,
      "deferred": 0,
      "dropped": 1,
      "name": "Identification and permanent address",
      "ticket": null,
      "live": 11,
      "level": 3,
      "follows": [
        "commodities-and-reason"
      ],
      "followsAll": [
        "commodities-and-reason",
        "journey-foundation"
      ],
      "inherits": 2,
      "state": "open",
      "ready": false
    },
    {
      "id": "transporters",
      "rows": 12,
      "done": 0,
      "todo": 1,
      "blocked": 11,
      "deferred": 0,
      "dropped": 0,
      "name": "Transporters",
      "ticket": null,
      "live": 12,
      "level": 3,
      "follows": [
        "documents",
        "address-book"
      ],
      "followsAll": [
        "address-book",
        "documents",
        "journey-foundation",
        "reference-lists"
      ],
      "inherits": 4,
      "state": "blocked",
      "ready": false
    },
    {
      "id": "type-question-and-templates",
      "rows": 23,
      "done": 13,
      "todo": 0,
      "blocked": 0,
      "deferred": 9,
      "dropped": 1,
      "name": "Type question and templates",
      "ticket": "EUDPA-690",
      "live": 22,
      "level": 3,
      "follows": [
        "commodities-and-reason",
        "arrival-and-transit"
      ],
      "followsAll": [
        "arrival-and-transit",
        "commodities-and-reason",
        "journey-foundation"
      ],
      "inherits": 4,
      "state": "part",
      "ready": false
    },
    {
      "id": "consignment-parties",
      "rows": 13,
      "done": 0,
      "todo": 13,
      "blocked": 0,
      "deferred": 0,
      "dropped": 0,
      "name": "Consignment parties",
      "ticket": null,
      "live": 13,
      "level": 4,
      "follows": [
        "address-book",
        "identification-and-permanent-address"
      ],
      "followsAll": [
        "address-book",
        "identification-and-permanent-address",
        "journey-foundation"
      ],
      "inherits": 5,
      "state": "open",
      "ready": false
    },
    {
      "id": "overview-and-review",
      "rows": 22,
      "done": 16,
      "todo": 2,
      "blocked": 2,
      "deferred": 0,
      "dropped": 2,
      "name": "Overview and review",
      "ticket": "EUDPA-696",
      "live": 20,
      "level": 4,
      "follows": [
        "arrival-and-transit",
        "identification-and-permanent-address"
      ],
      "followsAll": [
        "arrival-and-transit",
        "identification-and-permanent-address"
      ],
      "inherits": 5,
      "state": "part",
      "ready": false
    },
    {
      "id": "manage-notifications",
      "rows": 6,
      "done": 0,
      "todo": 6,
      "blocked": 0,
      "deferred": 0,
      "dropped": 0,
      "name": "Manage notifications",
      "ticket": null,
      "live": 6,
      "level": 5,
      "follows": [
        "overview-and-review"
      ],
      "followsAll": [
        "overview-and-review"
      ],
      "inherits": 6,
      "state": "open",
      "ready": false
    },
    {
      "id": "animals-dashboard",
      "rows": 14,
      "done": 0,
      "todo": 11,
      "blocked": 3,
      "deferred": 0,
      "dropped": 0,
      "name": "Animals dashboard",
      "ticket": null,
      "live": 14,
      "level": 6,
      "follows": [
        "manage-notifications",
        "type-question-and-templates"
      ],
      "followsAll": [
        "manage-notifications",
        "overview-and-review",
        "type-question-and-templates"
      ],
      "inherits": 8,
      "state": "open",
      "ready": false
    },
    {
      "id": "germinal-products",
      "rows": 20,
      "done": 0,
      "todo": 19,
      "blocked": 1,
      "deferred": 0,
      "dropped": 0,
      "name": "Germinal products",
      "ticket": null,
      "live": 20,
      "level": 7,
      "follows": [
        "animals-dashboard",
        "origin-page",
        "documents",
        "consignment-parties"
      ],
      "followsAll": [
        "animals-dashboard",
        "arrival-and-transit",
        "commodities-and-reason",
        "consignment-parties",
        "documents",
        "identification-and-permanent-address",
        "journey-foundation",
        "manage-notifications",
        "origin-page",
        "overview-and-review",
        "type-question-and-templates"
      ],
      "inherits": 13,
      "state": "open",
      "ready": false
    },
    {
      "id": "ins-dashboard",
      "rows": 8,
      "done": 0,
      "todo": 0,
      "blocked": 8,
      "deferred": 0,
      "dropped": 0,
      "name": "INS dashboard",
      "ticket": null,
      "live": 8,
      "level": 8,
      "follows": [
        "germinal-products"
      ],
      "followsAll": [
        "animals-dashboard",
        "germinal-products",
        "type-question-and-templates"
      ],
      "inherits": 14,
      "state": "blocked",
      "ready": false
    },
    {
      "id": "waiting-on-design",
      "rows": 13,
      "done": 0,
      "todo": 0,
      "blocked": 12,
      "deferred": 0,
      "dropped": 1,
      "name": "Waiting on design",
      "ticket": null,
      "live": 12,
      "level": 8,
      "follows": [
        "germinal-products",
        "transporters"
      ],
      "followsAll": [
        "address-book",
        "arrival-and-transit",
        "commodities-and-reason",
        "consignment-parties",
        "germinal-products",
        "journey-foundation",
        "manage-notifications",
        "origin-page",
        "transporters",
        "type-question-and-templates"
      ],
      "inherits": 15,
      "state": "blocked",
      "ready": false
    }
  ],
  "geometry": {
    "nodeW": 150,
    "nodeH": 60,
    "canvasW": 900,
    "viewBox": "-60 10 1040 1012",
    "boxes": {
      "journey-foundation": {
        "x": 200,
        "y": 44,
        "w": 150,
        "h": 60,
        "cx": 275
      },
      "reference-lists": {
        "x": 550,
        "y": 44,
        "w": 150,
        "h": 60,
        "cx": 625
      },
      "commodities-and-reason": {
        "x": 25,
        "y": 168,
        "w": 150,
        "h": 60,
        "cx": 100
      },
      "documents": {
        "x": 200,
        "y": 168,
        "w": 150,
        "h": 60,
        "cx": 275
      },
      "arrival-and-transit": {
        "x": 375,
        "y": 168,
        "w": 150,
        "h": 60,
        "cx": 450
      },
      "address-book": {
        "x": 550,
        "y": 168,
        "w": 150,
        "h": 60,
        "cx": 625
      },
      "origin-page": {
        "x": 725,
        "y": 168,
        "w": 150,
        "h": 60,
        "cx": 800
      },
      "identification-and-permanent-address": {
        "x": 113,
        "y": 292,
        "w": 150,
        "h": 60,
        "cx": 188
      },
      "type-question-and-templates": {
        "x": 375,
        "y": 292,
        "w": 150,
        "h": 60,
        "cx": 450
      },
      "transporters": {
        "x": 638,
        "y": 292,
        "w": 150,
        "h": 60,
        "cx": 713
      },
      "consignment-parties": {
        "x": 200,
        "y": 416,
        "w": 150,
        "h": 60,
        "cx": 275
      },
      "overview-and-review": {
        "x": 550,
        "y": 416,
        "w": 150,
        "h": 60,
        "cx": 625
      },
      "manage-notifications": {
        "x": 375,
        "y": 540,
        "w": 150,
        "h": 60,
        "cx": 450
      },
      "animals-dashboard": {
        "x": 375,
        "y": 664,
        "w": 150,
        "h": 60,
        "cx": 450
      },
      "germinal-products": {
        "x": 375,
        "y": 788,
        "w": 150,
        "h": 60,
        "cx": 450
      },
      "ins-dashboard": {
        "x": 200,
        "y": 912,
        "w": 150,
        "h": 60,
        "cx": 275
      },
      "waiting-on-design": {
        "x": 550,
        "y": 912,
        "w": 150,
        "h": 60,
        "cx": 625
      }
    },
    "rowPitch": 124,
    "top": 44,
    "paths": [
      {
        "parent": "germinal-products",
        "child": "waiting-on-design",
        "d": "M 505 848 V 864 H 570 V 912"
      },
      {
        "parent": "journey-foundation",
        "child": "documents",
        "d": "M 275 104 V 168"
      },
      {
        "parent": "documents",
        "child": "transporters",
        "d": "M 330 228 V 244 H 658 V 292"
      },
      {
        "parent": "commodities-and-reason",
        "child": "identification-and-permanent-address",
        "d": "M 45 228 V 244 H 188 V 292"
      },
      {
        "parent": "address-book",
        "child": "transporters",
        "d": "M 680 228 V 244 H 768 V 292"
      },
      {
        "parent": "reference-lists",
        "child": "address-book",
        "d": "M 625 104 V 168"
      },
      {
        "parent": "address-book",
        "child": "consignment-parties",
        "d": "M 570 228 V 260 H 330 V 416"
      },
      {
        "parent": "identification-and-permanent-address",
        "child": "consignment-parties",
        "d": "M 133 352 V 368 H 220 V 416"
      },
      {
        "parent": "overview-and-review",
        "child": "manage-notifications",
        "d": "M 625 476 V 492 H 450 V 540"
      },
      {
        "parent": "manage-notifications",
        "child": "animals-dashboard",
        "d": "M 450 600 V 616 H 395 V 664"
      },
      {
        "parent": "animals-dashboard",
        "child": "germinal-products",
        "d": "M 450 724 V 740 H 468 V 788"
      },
      {
        "parent": "germinal-products",
        "child": "ins-dashboard",
        "d": "M 395 848 V 864 H 275 V 912"
      },
      {
        "parent": "origin-page",
        "child": "germinal-products",
        "d": "M 800 228 V 276 H 805 V 740 H 505 V 788"
      },
      {
        "parent": "documents",
        "child": "germinal-products",
        "d": "M 220 228 V 276 H 95 V 740 H 395 V 788"
      },
      {
        "parent": "consignment-parties",
        "child": "germinal-products",
        "d": "M 275 476 V 492 H 352 V 756 H 432 V 788"
      },
      {
        "parent": "transporters",
        "child": "waiting-on-design",
        "d": "M 713 352 V 368 H 720 V 864 H 680 V 912"
      },
      {
        "parent": "type-question-and-templates",
        "child": "animals-dashboard",
        "d": "M 450 352 V 368 H 715 V 616 H 505 V 664"
      },
      {
        "parent": "journey-foundation",
        "child": "arrival-and-transit",
        "d": "M 330 104 V 120 H 395 V 168"
      },
      {
        "parent": "reference-lists",
        "child": "arrival-and-transit",
        "d": "M 570 104 V 120 H 505 V 168"
      },
      {
        "parent": "journey-foundation",
        "child": "commodities-and-reason",
        "d": "M 220 104 V 120 H 100 V 168"
      },
      {
        "parent": "reference-lists",
        "child": "origin-page",
        "d": "M 680 104 V 120 H 800 V 168"
      },
      {
        "parent": "arrival-and-transit",
        "child": "overview-and-review",
        "d": "M 505 228 V 260 H 620 V 368 H 680 V 416"
      },
      {
        "parent": "identification-and-permanent-address",
        "child": "overview-and-review",
        "d": "M 243 352 V 384 H 570 V 416"
      },
      {
        "parent": "commodities-and-reason",
        "child": "type-question-and-templates",
        "d": "M 155 228 V 260 H 395 V 292"
      },
      {
        "parent": "arrival-and-transit",
        "child": "type-question-and-templates",
        "d": "M 395 228 V 276 H 505 V 292"
      }
    ]
  },
  "sources": [
    "backlog.json",
    "themes/arrival-and-transit/backlog.json",
    "themes/commodities-and-reason/backlog.json",
    "themes/journey-foundation/backlog.json",
    "themes/origin-page/backlog.json",
    "themes/overview-and-review/backlog.json",
    "themes/reference-lists/backlog.json",
    "themes/type-question-and-templates/backlog.json"
  ]
}
