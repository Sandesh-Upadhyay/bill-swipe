/** Marketing content. Testimonials are FICTIONAL and labelled as such in the UI. */

export const TESTIMONIALS = [
  {
    quote:
      "I expected another crowdfunding page. Instead, I found three people in my own city with bills due this week — and I could read every story in under a minute.",
    name: "Hannah B.",
    role: "Donor · Munich",
    image: "u_d_hannah",
  },
  {
    quote:
      "Posting my request felt dignified. No begging, no long campaign — just my bill, my story, and a clear progress bar.",
    name: "Amelia H.",
    role: "Requester · Leeds",
    image: "u_r_amelia",
  },
  {
    quote:
      "The verification badges and the report button are what made me trust it. I always know which requests have been reviewed.",
    name: "Arjun M.",
    role: "Donor · Bengaluru",
    image: "u_d_arjun",
  },
];

export const FAQ = [
  {
    q: "Is BillSwipe a live donation platform?",
    a: "Not yet. This is Prototype v1.0, built to demonstrate the experience. Every person, request, balance and contribution is fictional and simulated. No money is collected, charged or transferred.",
  },
  {
    q: "What happens when I swipe right?",
    a: "Swiping right only means you're interested in helping. It saves the request to your interested list. It never charges you or moves money — in the live product, contributing will always be a separate, explicit step.",
  },
  {
    q: "What does the “Demo-approved” badge mean?",
    a: "It means a moderator approved the request inside this prototype. It is NOT an independent verification of the person or the bill. In production, verification would involve document checks and, where possible, paying billers directly.",
  },
  {
    q: "Will my bill document be shown publicly?",
    a: "Never. Bill documents are only used for moderator review and are never displayed on discovery cards or public pages. In this prototype, documents stay in your browser for preview only and are never uploaded or stored.",
  },
  {
    q: "How will money reach the requester in the live product?",
    a: "Our planned model is to pay billers (utilities, landlords, hospitals, schools) directly wherever possible, so contributions go to the bill rather than to an individual account.",
  },
  {
    q: "Can I report a request that looks suspicious?",
    a: "Yes. Every request has a Report option and a Block option. Reports go to the moderation queue in the admin panel.",
  },
  {
    q: "Which countries are supported?",
    a: "The prototype showcases requests from the United States, United Kingdom, Canada, Australia, India, the UAE, Germany and France, each in its local currency.",
  },
  {
    q: "Where is my data stored?",
    a: "Only in your browser's local storage, so the demo remembers your session, swipes and saved requests. Use “Reset demo data” in your profile to clear it at any time.",
  },
];

export const HOW_IT_WORKS = [
  {
    title: "Share a genuine bill",
    body: "Requesters upload an outstanding essential bill with a short, honest story. Documents are reviewed privately — never shown publicly.",
  },
  {
    title: "Moderators review",
    body: "Each request goes through a review queue. Badges clearly show whether a request is pending, demo-approved, rejected or unverified.",
  },
  {
    title: "Swipe to discover",
    body: "Donors swipe through requests near them or across the world. Right means interested, left means skip, up opens the full story.",
  },
  {
    title: "Help, transparently",
    body: "Choose an amount and follow the progress. In the live product, funds would go directly to the biller wherever possible.",
  },
];
