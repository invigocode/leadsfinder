import type { Lead } from "./types";

/* ------------------------------------------------------------------ *
 * Outreach content engine. Everything here is deterministic templates:
 *   business type (vertical)  -> vocabulary, best time to call, gatekeeper advice
 *   service being pitched     -> hook, pitch, question, close, objection handling
 *   lead facts                -> rating, review count, website findings
 * ------------------------------------------------------------------ */

export type Service =
  | "Website creation" | "Website rebuild" | "Website refresh" | "Mobile fix"
  | "Review recovery" | "Review growth" | "Social presence";

export const SERVICES: Service[] = [
  "Website creation", "Website rebuild", "Website refresh", "Mobile fix",
  "Review recovery", "Review growth", "Social presence",
];

export interface Seller { name: string; business: string }

export function defaultService(lead: Lead): Service {
  const hit = lead.score.angles.find((a): a is Service => (SERVICES as string[]).includes(a));
  return hit ?? "Review growth";
}

/* ---------- business types ---------- */

interface Vertical {
  id: string;
  test: RegExp;
  plural: string;
  customers: string;
  enquiries: string;
  whyOnline: string;
  bestTime: string;
  gatekeeper: string;
}

const VERTICALS: Vertical[] = [
  { id: "health", test: /\b(dent(al|ist)|orthodont|clinic|doctor|physio|chiropract|optic(ian|s)|vet(erinar)?|osteopath|podiatr|therap|medical|pharmac|hearing)/i,
    plural: "clinics and practices", customers: "patients", enquiries: "new patient enquiries",
    whyOnline: "People choose a new practice by checking Google reviews and the website before they pick up the phone.",
    bestTime: "Mid-morning or mid-afternoon. Avoid first thing and lunchtime, when reception is busiest.",
    gatekeeper: "Reception will screen the call. Ask for the practice manager or owner and say it's about their online bookings." },
  { id: "trades", test: /\b(plumb|electric|roof|builder|building|heating|gas engineer|locksmith|carpent|joiner|plaster|paint|decorat|glazi|window fit|floor|tiler|handyman|contractor|boiler|drain|pest|scaffold|kitchen fit|bathroom)/i,
    plural: "trades businesses", customers: "customers", enquiries: "quote requests",
    whyOnline: "Homeowners search on their phone the moment something breaks, and they check reviews before letting a stranger into their home.",
    bestTime: "Before 8:30am or after 4:30pm. They're on jobs midday but often answer their mobile early or late.",
    gatekeeper: "The owner usually answers directly. If it's a partner or an office, ask who handles new enquiries." },
  { id: "home", test: /\b(clean|garden|landscap|tree surg|removal|carpet|maid|pressure wash|skip hire|lawn)/i,
    plural: "home service businesses", customers: "customers", enquiries: "quote requests",
    whyOnline: "People hire home services on trust, so they read reviews and look for a proper website before they ask for a quote.",
    bestTime: "Early morning or late afternoon. They're out on jobs during the day.",
    gatekeeper: "Usually the owner picks up. If not, ask who handles new quote requests." },
  { id: "auto", test: /\b(garage|mechanic|mot\b|tyre|car (repair|wash|dealer|valet)|auto\b|body ?shop|vehicle|motor)/i,
    plural: "garages", customers: "drivers", enquiries: "bookings",
    whyOnline: "Drivers search on their phone when a warning light comes on, and they trust garages with plenty of good reviews.",
    bestTime: "Mid-morning after the first rush, or late afternoon.",
    gatekeeper: "Ask for the owner or service manager. The front desk will often just take a message." },
  { id: "beauty", test: /\b(salon|hair|barber|beauty|nail|spa\b|massage|tattoo|lash|brow|aesthetic|makeup|wax)/i,
    plural: "salons and studios", customers: "clients", enquiries: "bookings",
    whyOnline: "Clients pick a salon from Google reviews and photos, and expect to book from their phone.",
    bestTime: "Tuesday to Thursday mid-morning, when it's quietest.",
    gatekeeper: "The owner is often with a client. Ask for a good time to call back rather than pushing." },
  { id: "fitness", test: /\b(gym|fitness|personal train|yoga|pilates|crossfit|martial|boxing|dance school|swim)/i,
    plural: "gyms and studios", customers: "members", enquiries: "trial sign-ups",
    whyOnline: "People trying a new gym or studio check reviews and the website first, and want to sign up for a trial online.",
    bestTime: "Mid-morning or early afternoon, between class rushes.",
    gatekeeper: "Ask for the owner or manager. Front-of-house staff often don't handle marketing." },
  { id: "food", test: /\b(restaurant|caf[eé]|coffee|bar\b|pub\b|takeaway|bakery|pizza|diner|bistro|grill|eatery|catering|chippy|fish and chip|kebab|curry|sushi|brewery)/i,
    plural: "restaurants and cafes", customers: "guests", enquiries: "bookings and orders",
    whyOnline: "Most diners check Google for photos, reviews and the menu before deciding where to go.",
    bestTime: "Mid-afternoon (2-4pm), between lunch and dinner service. Avoid 12-2 and 6-9.",
    gatekeeper: "Staff usually can't take sales calls. Ask for the owner or manager and when is best to call back." },
  { id: "professional", test: /\b(solicitor|lawyer|law (firm|practice)|accountan|bookkeep|financ|mortgage|insurance|estate agent|letting|architect|consultan|surveyor|notary)/i,
    plural: "firms", customers: "clients", enquiries: "new enquiries",
    whyOnline: "Clients check reviews and look for a credible website before they make first contact.",
    bestTime: "Mid-morning, Tuesday to Thursday.",
    gatekeeper: "You'll usually meet a receptionist. Ask for the partner or whoever looks after marketing." },
  { id: "retail", test: /\b(shop|store|boutique|florist|gift|jewel|pets?\b|furniture|bookshop|retail)/i,
    plural: "shops", customers: "customers", enquiries: "visits and orders",
    whyOnline: "Shoppers look a shop up on Google to check opening hours, reviews and what's in stock before they visit.",
    bestTime: "Mid-morning on a weekday, before the lunchtime rush.",
    gatekeeper: "Ask for the owner or manager. They're often on the shop floor, so offer to call back." },
];

const GENERIC: Vertical = {
  id: "generic", test: /$^/, plural: "local businesses", customers: "customers", enquiries: "enquiries",
  whyOnline: "Customers check Google reviews and a website before deciding who to contact.",
  bestTime: "Mid-morning on a weekday.",
  gatekeeper: "Ask for the owner or whoever looks after marketing.",
};

export function verticalFor(lead: Lead, hint?: string): Vertical {
  for (const text of [lead.category, lead.name, hint]) {
    if (!text) continue;
    const hit = VERTICALS.find((v) => v.test.test(text));
    if (hit) return hit;
  }
  return GENERIC;
}

/* ---------- context + helpers ---------- */

interface Ctx {
  lead: Lead;
  name: string;
  v: Vertical;
  me: string;
  biz: string;
  type: string;
  searchTerm: string;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const stars = (l: Lead) => (l.rating != null ? `${l.rating.toFixed(1)} stars` : "no rating");
const reviewsText = (l: Lead) =>
  l.reviewCount === 0 ? "no reviews on Google yet" : `${l.reviewCount} review${l.reviewCount === 1 ? "" : "s"} on Google`;

function makeCtx(lead: Lead, seller: Seller, hint?: string): Ctx {
  const type = (lead.category || hint || "business").toLowerCase();
  return {
    lead, name: lead.name, v: verticalFor(lead, hint),
    me: seller.name.trim() || "[your name]",
    biz: seller.business.trim() || "[your business]",
    type, searchTerm: `${type} near me`,
  };
}

interface Objection { q: string; a: string }

interface ServiceDef {
  verify?: string;
  finding(c: Ctx): string;
  pitch(c: Ctx): string;
  why(c: Ctx): string;
  question(c: Ctx): string;
  close(c: Ctx): string;
  subject(c: Ctx): string;
  voicemailHook(c: Ctx): string;
  objections(c: Ctx): Objection[];
}

const SERVICE_DEFS: Record<Service, ServiceDef> = {
  "Website creation": {
    finding: (c) => `I searched for ${c.searchTerm} and found ${c.name} on Google Maps, but I couldn't see a website linked to it.`,
    pitch: (c) => `I build simple, fast websites for ${c.v.plural}, so ${c.v.customers} who find you can see what you do and get in touch or book straight from their phone.`,
    why: (c) => c.v.whyOnline,
    question: (c) => `When someone new hears about ${c.name}, how do they usually check you out or get in touch right now?`,
    close: (c) => `Could I show you a quick example of what a site for ${c.name} might look like? It takes about ten minutes and there's no obligation.`,
    subject: (c) => `A website for ${c.name}`,
    voicemailHook: (c) => `I noticed ${c.name} doesn't have a website on Google and had a quick idea for it`,
    objections: (c) => [
      { q: "\"Our Facebook page is enough.\"", a: `Facebook is great for people who already know you. But someone searching Google for ${c.searchTerm} mostly lands on websites first, and a page you don't control can change overnight. A simple site sits alongside Facebook and gives you somewhere solid to send people. Can I show you what that looks like?` },
      { q: "\"We get all our work by word of mouth.\"", a: `That's the best kind, and it says people trust you. What tends to happen is they still Google you before they call. A recommendation gets you looked up, so the question is whether what they find is helping you or losing you the job. Would it be worth seeing what they find right now?` },
      { q: "\"We've never needed one.\"", a: `That's fair, and you've clearly done well without one. The difference now is that people expect to be able to check a business online first. I'm not suggesting anything complicated, just a simple page so you don't lose the ones who look and can't find you.` },
    ],
  },

  "Website rebuild": {
    verify: "Open their website yourself before you call. It may have been down temporarily when it was checked.",
    finding: (c) => `I tried to open the website listed for ${c.name} on Google and it wouldn't load.`,
    pitch: (c) => `I rebuild broken or out-of-date websites for ${c.v.plural} and get them back online quickly, so nobody who clicks through from Google hits a dead end.`,
    why: () => `Anyone who clicks through to a page that won't load usually just calls the next business on the list.`,
    question: () => `Were you aware the site wasn't loading?`,
    close: (c) => `I can take a look at what's going on and tell you what it would take to fix. Could I have ten minutes to walk you through it for ${c.name}?`,
    subject: (c) => `${c.name}'s website isn't loading`,
    voicemailHook: (c) => `I tried to open the ${c.name} website and it wouldn't load, so I wanted to flag it`,
    objections: () => [
      { q: "\"I know, I'm getting it sorted.\"", a: `Good to hear. How long has it been down? If it's been a while, it's worth knowing that Google may already be sending people elsewhere. I can give you a second opinion on the quickest fix if that would help.` },
      { q: "\"Someone else looks after it.\"", a: `That's fine, I'm not trying to replace anyone. If they're on it, great. If it's been down for more than a few days, a second pair of hands might be useful. Who should I speak to about it?` },
    ],
  },

  "Website refresh": {
    verify: "Have a look at their site before you call so you can point to something specific.",
    finding: (c) => {
      const a = c.lead.audit;
      const year = new Date().getFullYear();
      if (a?.lastYear && a.lastYear <= year - 2) return `I had a look at the ${c.name} website and the footer says ${a.lastYear}, so it looks like it hasn't been touched in a while.`;
      if (a?.builder) return `I had a look at the ${c.name} website and it's built on a ${a.builder} template, which makes it look a bit like everyone else's.`;
      if (a && !a.hasContactForm) return `I had a look at the ${c.name} website and there's no easy way to make an enquiry online.`;
      return `I had a look at the ${c.name} website and I think it could be working a lot harder for you.`;
    },
    pitch: (c) => `I refresh websites for ${c.v.plural} so they look current, load fast and make it easy for ${c.v.customers} to get in touch, without starting from scratch.`,
    why: () => `People judge a business by its website within a few seconds, and a dated site can make a good business look less professional than it really is.`,
    question: () => `When was the site last updated, and does it bring in many enquiries?`,
    close: () => `Could I send you two or three quick improvements I'd make? Ten minutes on the phone, no obligation.`,
    subject: (c) => `A few quick ideas for ${c.name}'s website`,
    voicemailHook: (c) => `I looked at the ${c.name} website and spotted a few quick improvements`,
    objections: () => [
      { q: "\"We already have a website.\"", a: `That's good, and I'm not suggesting you throw it away. Most of what I do is small changes that make a site bring in more enquiries. Can I send you two or three I'd make and you can decide?` },
      { q: "\"It works fine.\"", a: `It may well. The way to tell is whether it's bringing in enquiries. Do you know how many people contact you through it in a typical month?` },
    ],
  },

  "Mobile fix": {
    verify: "Open their site on your phone first to confirm it really isn't mobile-friendly.",
    finding: () => `I opened your website on my phone and it doesn't look like it's set up for mobile screens.`,
    pitch: (c) => `I make websites mobile-friendly for ${c.v.plural}, so pages fit the screen, buttons are easy to tap, and ${c.v.customers} can call or book in one tap.`,
    why: (c) => `Most people searching for ${c.searchTerm} do it on their phone, and they leave quickly if they have to pinch and zoom.`,
    question: () => `Have you looked at your site on a phone recently?`,
    close: () => `I can send you a screenshot of how it looks on a phone so you can judge for yourself. Would that be useful?`,
    subject: (c) => `${c.name}'s website on mobile`,
    voicemailHook: (c) => `I looked at the ${c.name} site on my phone and it isn't set up for mobile`,
    objections: () => [
      { q: "\"It looks fine to me.\"", a: `On a computer it probably does. Phones are where it shows up. Could I send you a screenshot of how it looks on one, and you can decide if it's worth a fix?` },
      { q: "\"Most of our customers are older and use computers.\"", a: `That's fair for some. Even then, a lot of them look you up on a phone or tablet before they call. A quick check on your Google stats would tell you. Want me to send you the screenshot anyway?` },
    ],
  },

  "Review recovery": {
    finding: (c) => `I noticed ${c.name} is at ${stars(c.lead)} on Google.`,
    pitch: (c) => `I help ${c.v.plural} improve their Google rating with genuine reviews only. We reply professionally to the negative ones and make it easy for happy ${c.v.customers} to leave a review.`,
    why: (c) => `Even a small rise in your rating changes who ${c.v.customers} choose when they're comparing options side by side.`,
    question: (c) => `Do you ask happy ${c.v.customers} for reviews at the moment, or is it mostly the unhappy ones who speak up?`,
    close: (c) => `Could I show you what I'd do for ${c.name}? Ten minutes on the phone, no obligation.`,
    subject: (c) => `Improving ${c.name}'s Google rating`,
    voicemailHook: (c) => `I noticed ${c.name}'s Google rating and had an idea for lifting it`,
    objections: (c) => [
      { q: "\"Those reviews are unfair.\"", a: `That's frustrating, and it happens to good businesses. You can often reply publicly, and it shows future ${c.v.customers} how you handle problems. The best answer is more genuine reviews from happy ${c.v.customers}, so the unfair ones carry less weight.` },
      { q: "\"We can't control what people write.\"", a: `You can't, but you can control how many happy ${c.v.customers} get asked. Right now the ones who are annoyed are the ones who write. Asking the happy ones at the right moment shifts the balance.` },
    ],
  },

  "Review growth": {
    finding: (c) => `I noticed ${c.name} has ${reviewsText(c.lead)}.`,
    pitch: (c) => `I set up a simple system that asks happy ${c.v.customers} for a Google review by text right after they've been served, with one tap to leave it. Genuine reviews only.`,
    why: (c) => `When ${c.v.customers} compare a few options on Google, the business with more reviews usually gets the call.`,
    question: (c) => `How do you currently ask ${c.v.customers} for reviews?`,
    close: (c) => `Could I show you how it would work for ${c.name}? Ten minutes on the phone, no obligation.`,
    subject: (c) => `More Google reviews for ${c.name}`,
    voicemailHook: (c) => `I noticed ${c.name} has ${reviewsText(c.lead)} and had a simple idea to change that`,
    objections: (c) => [
      { q: `"My ${c.v.customers} won't leave reviews."`, a: `Most people will if they're asked at the right moment with a one-tap link. The reason they don't is that nobody asks. The system does the asking so you don't have to.` },
      { q: "\"We're too busy to chase reviews.\"", a: `That's exactly why it's automatic. It runs in the background and you don't chase anyone. It takes a few minutes to set up.` },
    ],
  },

  "Social presence": {
    verify: "Check their Google listing and search Facebook or Instagram for the business to confirm before you call.",
    finding: () => `I couldn't find links to any social media pages on your website.`,
    pitch: (c) => `I set up and manage social pages for ${c.v.plural}, so there's always fresh, active content when ${c.v.customers} look you up.`,
    why: (c) => `${cap(c.v.customers)} often check social pages to see whether a business is active and trustworthy before they get in touch.`,
    question: () => `Who looks after your social media at the moment?`,
    close: (c) => `Could I show you what an active page for ${c.name} might look like? Ten minutes, no obligation.`,
    subject: (c) => `Social media for ${c.name}`,
    voicemailHook: (c) => `I looked at ${c.name} online and had an idea for your social media`,
    objections: () => [
      { q: "\"We don't have time for social media.\"", a: `That's exactly why businesses hand it over. You keep doing what you're good at and it stays active without you thinking about it.` },
      { q: "\"Social media doesn't work for us.\"", a: `It can feel that way when it's sporadic. The point isn't viral posts. It's that when someone looks you up, they see a business that's active and real. Can I show you what that looks like?` },
    ],
  },
};

function commonObjections(c: Ctx): Objection[] {
  return [
    { q: "\"I'm busy right now.\"", a: `Completely understand. I'll be 30 seconds, or when's a better time to call back? [note the time and call then]` },
    { q: "\"Not interested.\"", a: `No problem, thanks for being straight with me. Just so I know for next time, is that because you're happy with how things are, or it's not a priority right now? [If they repeat "not interested", thank them and end the call.]` },
    { q: "\"Send me an email.\"", a: `Happy to. So it's useful, what's the best address, and what should I focus on? I'll follow up with a quick call on [day] to see if it made sense.` },
    { q: "\"How much does it cost?\"", a: `It depends on what's needed, which is why I'd like ten minutes to look at ${c.name} first. Can I ask two quick questions so I give you a sensible number rather than a guess? [Your price range: ___]` },
    { q: "\"We already have someone for that.\"", a: `That's good to hear. Are you happy with the results? If they're doing a great job, stay with them. I'd only suggest a quick second opinion, no obligation.` },
    { q: "\"I'm not the decision maker.\"", a: `No problem. Who is, and what's the best time to reach them? I'll keep it short.` },
    { q: "\"How did you get my number?\"", a: `It's listed on your Google Business profile, which is public. Sorry for the cold call, I'll be brief. And if you'd rather I didn't call again, just say and I'll make a note.` },
  ];
}

/* ---------- call script ---------- */

export interface CallScript {
  before: string[];
  verify?: string;
  ifSomeoneElse: string;
  opening: string;
  hook: string;
  pitch: string;
  question: string;
  close: string;
  voicemail: string;
  serviceObjections: Objection[];
  commonObjections: Objection[];
}

export function buildCallScript(lead: Lead, service: Service, seller: Seller, hint?: string): CallScript {
  const c = makeCtx(lead, seller, hint);
  const d = SERVICE_DEFS[service];
  return {
    before: [`Best time to call: ${c.v.bestTime}`, `Getting through: ${c.v.gatekeeper}`],
    verify: d.verify,
    ifSomeoneElse: `"Hi, could I speak to the owner or whoever looks after ${c.v.enquiries}? It's about ${c.name}'s Google listing."`,
    opening: `"Hi, it's ${c.me} from ${c.biz}. I know I'm calling out of the blue. Do you have 30 seconds?"`,
    hook: `"${d.finding(c)}"`,
    pitch: `"${d.pitch(c)} ${d.why(c)}"`,
    question: `"${d.question(c)}" Then listen and let them talk.`,
    close: `"${d.close(c)} Would later this week suit?"`,
    voicemail: `"Hi, this is ${c.me} from ${c.biz}, calling for the owner or manager at ${c.name}. ${d.voicemailHook(c)}. I'll send a short email too, and you can reach me on [your number]. Thanks, and have a good day." Leave a reason to call back, not the full pitch.`,
    serviceObjections: d.objections(c),
    commonObjections: commonObjections(c),
  };
}

export function scriptToText(name: string, service: Service, s: CallScript): string {
  const lines: string[] = [`Call script: ${name} (${service})`, ""];
  lines.push("BEFORE YOU DIAL", ...s.before.map((b) => `- ${b}`));
  if (s.verify) lines.push(`- Check first: ${s.verify}`);
  lines.push("- UK: check the number against the TPS/CTPS register before cold calling.", "");
  lines.push("IF SOMEONE ELSE ANSWERS", s.ifSomeoneElse, "");
  lines.push("OPENING", s.opening, "", "WHY YOU'RE CALLING", s.hook, "", "THE PITCH", s.pitch, "");
  lines.push("QUESTION", s.question, "", "CLOSE", s.close, "", "VOICEMAIL", s.voicemail, "", "OBJECTIONS");
  for (const o of [...s.serviceObjections, ...s.commonObjections]) lines.push(o.q, `  ${o.a}`, "");
  return lines.join("\n");
}

/* ---------- email ---------- */

export interface EmailDraft { subject: string; body: string }

export function buildEmail(lead: Lead, service: Service, seller: Seller, hint?: string): EmailDraft {
  const c = makeCtx(lead, seller, hint);
  const d = SERVICE_DEFS[service];
  const body = [
    "Hi there,",
    "",
    d.finding(c),
    "",
    d.pitch(c),
    "",
    `${d.close(c)} Just reply with a time that suits, or say "example" and I'll send something over.`,
    "",
    "Best,",
    c.me,
    c.biz,
    "",
    `P.S. Not relevant? Reply "no thanks" and I won't email again.`,
  ].join("\n");
  return { subject: d.subject(c), body };
}
