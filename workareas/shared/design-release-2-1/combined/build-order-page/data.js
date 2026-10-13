window.DR21_BUILD_ORDER = {
  "generatedAt": "2026-10-13",
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
      "tickets": [
        {
          "domain": "animals",
          "key": "EUDPA-691",
          "url": "https://eaflood.atlassian.net/browse/EUDPA-691",
          "emoji": "🐄",
          "label": "Live animals"
        },
        {
          "domain": "plants",
          "key": "EUDPA-699",
          "url": "https://eaflood.atlassian.net/browse/EUDPA-699",
          "emoji": "🌱",
          "label": "High-risk plants"
        },
        {
          "domain": "ins",
          "key": "EUDPA-700",
          "url": "https://eaflood.atlassian.net/browse/EUDPA-700",
          "emoji": "🚪",
          "label": "Front door"
        }
      ],
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
      "tickets": [
        {
          "domain": "animals",
          "key": "EUDPA-692",
          "url": "https://eaflood.atlassian.net/browse/EUDPA-692",
          "emoji": "🐄",
          "label": "Live animals"
        },
        {
          "domain": "plants",
          "key": "EUDPA-701",
          "url": "https://eaflood.atlassian.net/browse/EUDPA-701",
          "emoji": "🌱",
          "label": "High-risk plants"
        },
        {
          "domain": "ins",
          "key": "EUDPA-702",
          "url": "https://eaflood.atlassian.net/browse/EUDPA-702",
          "emoji": "🚪",
          "label": "Front door"
        }
      ],
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
      "tickets": [],
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
      "tickets": [
        {
          "domain": "animals",
          "key": "EUDPA-694",
          "url": "https://eaflood.atlassian.net/browse/EUDPA-694",
          "emoji": "🐄",
          "label": "Live animals"
        },
        {
          "domain": "plants",
          "key": "EUDPA-703",
          "url": "https://eaflood.atlassian.net/browse/EUDPA-703",
          "emoji": "🌱",
          "label": "High-risk plants"
        }
      ],
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
      "tickets": [
        {
          "domain": "stub",
          "key": "EUDPA-693",
          "url": "https://eaflood.atlassian.net/browse/EUDPA-693",
          "emoji": "🎫",
          "label": "Stub only, not yet split by domain"
        }
      ],
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
      "tickets": [],
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
      "tickets": [
        {
          "domain": "animals",
          "key": "EUDPA-695",
          "url": "https://eaflood.atlassian.net/browse/EUDPA-695",
          "emoji": "🐄",
          "label": "Live animals"
        },
        {
          "domain": "plants",
          "key": "EUDPA-704",
          "url": "https://eaflood.atlassian.net/browse/EUDPA-704",
          "emoji": "🌱",
          "label": "High-risk plants"
        }
      ],
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
      "tickets": [],
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
      "tickets": [],
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
      "tickets": [
        {
          "domain": "stub",
          "key": "EUDPA-690",
          "url": "https://eaflood.atlassian.net/browse/EUDPA-690",
          "emoji": "🎫",
          "label": "Stub only, not yet split by domain"
        }
      ],
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
      "tickets": [],
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
      "tickets": [
        {
          "domain": "stub",
          "key": "EUDPA-696",
          "url": "https://eaflood.atlassian.net/browse/EUDPA-696",
          "emoji": "🎫",
          "label": "Stub only, not yet split by domain"
        }
      ],
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
      "tickets": [],
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
      "tickets": [],
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
      "tickets": [],
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
      "tickets": [],
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
      "tickets": [],
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
    "viewBox": "-60 10 1040 1145",
    "boxes": {
      "journey-foundation": {
        "x": 200,
        "y": 44,
        "w": 150,
        "h": 112,
        "cx": 275
      },
      "reference-lists": {
        "x": 550,
        "y": 44,
        "w": 150,
        "h": 112,
        "cx": 625
      },
      "commodities-and-reason": {
        "x": 25,
        "y": 220,
        "w": 150,
        "h": 82,
        "cx": 100
      },
      "documents": {
        "x": 200,
        "y": 220,
        "w": 150,
        "h": 60,
        "cx": 275
      },
      "arrival-and-transit": {
        "x": 375,
        "y": 220,
        "w": 150,
        "h": 97,
        "cx": 450
      },
      "address-book": {
        "x": 550,
        "y": 220,
        "w": 150,
        "h": 60,
        "cx": 625
      },
      "origin-page": {
        "x": 725,
        "y": 220,
        "w": 150,
        "h": 97,
        "cx": 800
      },
      "identification-and-permanent-address": {
        "x": 113,
        "y": 381,
        "w": 150,
        "h": 60,
        "cx": 188
      },
      "type-question-and-templates": {
        "x": 375,
        "y": 381,
        "w": 150,
        "h": 82,
        "cx": 450
      },
      "transporters": {
        "x": 638,
        "y": 381,
        "w": 150,
        "h": 60,
        "cx": 713
      },
      "consignment-parties": {
        "x": 200,
        "y": 527,
        "w": 150,
        "h": 60,
        "cx": 275
      },
      "overview-and-review": {
        "x": 550,
        "y": 527,
        "w": 150,
        "h": 82,
        "cx": 625
      },
      "manage-notifications": {
        "x": 375,
        "y": 673,
        "w": 150,
        "h": 60,
        "cx": 450
      },
      "animals-dashboard": {
        "x": 375,
        "y": 797,
        "w": 150,
        "h": 60,
        "cx": 450
      },
      "germinal-products": {
        "x": 375,
        "y": 921,
        "w": 150,
        "h": 60,
        "cx": 450
      },
      "ins-dashboard": {
        "x": 200,
        "y": 1045,
        "w": 150,
        "h": 60,
        "cx": 275
      },
      "waiting-on-design": {
        "x": 550,
        "y": 1045,
        "w": 150,
        "h": 60,
        "cx": 625
      }
    },
    "levelBands": {
      "1": {
        "top": 44,
        "height": 112
      },
      "2": {
        "top": 220,
        "height": 97
      },
      "3": {
        "top": 381,
        "height": 82
      },
      "4": {
        "top": 527,
        "height": 82
      },
      "5": {
        "top": 673,
        "height": 60
      },
      "6": {
        "top": 797,
        "height": 60
      },
      "7": {
        "top": 921,
        "height": 60
      },
      "8": {
        "top": 1045,
        "height": 60
      }
    },
    "ticketRowH": 15,
    "ticketPad": 7,
    "top": 44,
    "paths": [
      {
        "parent": "germinal-products",
        "child": "waiting-on-design",
        "d": "M 505 981 V 997 H 570 V 1045"
      },
      {
        "parent": "journey-foundation",
        "child": "documents",
        "d": "M 275 156 V 220"
      },
      {
        "parent": "documents",
        "child": "transporters",
        "d": "M 330 280 V 333 H 658 V 381"
      },
      {
        "parent": "commodities-and-reason",
        "child": "identification-and-permanent-address",
        "d": "M 45 302 V 333 H 188 V 381"
      },
      {
        "parent": "address-book",
        "child": "transporters",
        "d": "M 680 280 V 333 H 768 V 381"
      },
      {
        "parent": "reference-lists",
        "child": "address-book",
        "d": "M 625 156 V 220"
      },
      {
        "parent": "address-book",
        "child": "consignment-parties",
        "d": "M 570 280 V 349 H 330 V 527"
      },
      {
        "parent": "identification-and-permanent-address",
        "child": "consignment-parties",
        "d": "M 133 441 V 479 H 220 V 527"
      },
      {
        "parent": "overview-and-review",
        "child": "manage-notifications",
        "d": "M 625 609 V 625 H 450 V 673"
      },
      {
        "parent": "manage-notifications",
        "child": "animals-dashboard",
        "d": "M 450 733 V 749 H 395 V 797"
      },
      {
        "parent": "animals-dashboard",
        "child": "germinal-products",
        "d": "M 450 857 V 873 H 468 V 921"
      },
      {
        "parent": "germinal-products",
        "child": "ins-dashboard",
        "d": "M 395 981 V 997 H 275 V 1045"
      },
      {
        "parent": "origin-page",
        "child": "germinal-products",
        "d": "M 800 317 V 365 H 805 V 873 H 505 V 921"
      },
      {
        "parent": "documents",
        "child": "germinal-products",
        "d": "M 220 280 V 365 H 95 V 873 H 395 V 921"
      },
      {
        "parent": "consignment-parties",
        "child": "germinal-products",
        "d": "M 275 587 V 625 H 352 V 889 H 432 V 921"
      },
      {
        "parent": "transporters",
        "child": "waiting-on-design",
        "d": "M 713 441 V 479 H 720 V 997 H 680 V 1045"
      },
      {
        "parent": "type-question-and-templates",
        "child": "animals-dashboard",
        "d": "M 450 463 V 479 H 715 V 749 H 505 V 797"
      },
      {
        "parent": "journey-foundation",
        "child": "arrival-and-transit",
        "d": "M 330 156 V 172 H 395 V 220"
      },
      {
        "parent": "reference-lists",
        "child": "arrival-and-transit",
        "d": "M 570 156 V 172 H 505 V 220"
      },
      {
        "parent": "journey-foundation",
        "child": "commodities-and-reason",
        "d": "M 220 156 V 172 H 100 V 220"
      },
      {
        "parent": "reference-lists",
        "child": "origin-page",
        "d": "M 680 156 V 172 H 800 V 220"
      },
      {
        "parent": "arrival-and-transit",
        "child": "overview-and-review",
        "d": "M 505 317 V 349 H 620 V 479 H 680 V 527"
      },
      {
        "parent": "identification-and-permanent-address",
        "child": "overview-and-review",
        "d": "M 243 441 V 495 H 570 V 527"
      },
      {
        "parent": "commodities-and-reason",
        "child": "type-question-and-templates",
        "d": "M 155 302 V 349 H 395 V 381"
      },
      {
        "parent": "arrival-and-transit",
        "child": "type-question-and-templates",
        "d": "M 395 317 V 365 H 505 V 381"
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
