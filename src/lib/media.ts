/* ============================================================================
   FRIVVO — MEDIA REGISTRY
   Every image and video used across the product is registered here so art
   direction stays consistent and a single swap updates every surface.
   ========================================================================= */

/** Brand-supplied editorial imagery. */
export const EDITORIAL = {
  heroPrimary: "https://i.pinimg.com/1200x/b1/b4/96/b1b496114e9db1de49d5cb02fcbeb677.jpg",
  heroSecondary: "https://i.pinimg.com/736x/df/5d/27/df5d270bd0e7ac4cbce2df0875bbf3d8.jpg",
  heroTertiary: "https://i.pinimg.com/1200x/88/9f/4d/889f4d77473fbf0d803a928cc35b5e3a.jpg",
  authTalent: "https://i.pinimg.com/1200x/55/24/f6/5524f6be49a19a62b8efb9ed202d9742.jpg",
  authCompany: "https://i.pinimg.com/1200x/5a/c8/1d/5ac81daa8a2f653f7f406e25d2021a79.jpg",
  workspace: "https://i.pinimg.com/1200x/53/b4/6b/53b46b1fc2ef370582169fa044d3f716.jpg",
  collaboration: "https://i.pinimg.com/1200x/09/ae/5b/09ae5b5a29d3fb79c77a9ce7df952937.jpg",
  craft: "https://i.pinimg.com/736x/61/c9/38/61c938c273ebf7fec061faec29d790f1.jpg",
  payouts: "https://i.pinimg.com/736x/7e/48/db/7e48dbd286ae7cfc7f4c320e0bd5754a.jpg",
} as const;

export const EDITORIAL_LIST = Object.values(EDITORIAL);

/** Short-form video reels (Pinterest embeds) used on marketing + help surfaces. */
export const REELS: { id: string; title: string; caption: string }[] = [
  {
    id: "725994402462989271",
    title: "Post a project in minutes",
    caption: "A five-step wizard that autosaves as you go.",
  },
  {
    id: "449163762858567642",
    title: "Match scores you can explain",
    caption: "Every score breaks down into five weighted signals.",
  },
  {
    id: "650348002486054808",
    title: "Hire into named roles",
    caption: "Slots, apprentices and capacity, all in one roster.",
  },
  {
    id: "847873067370255613",
    title: "Fund, review, release",
    caption: "An append-only ledger behind every movement of money.",
  },
  {
    id: "603130575140242604",
    title: "One workspace for the whole engagement",
    caption: "Tasks, chat, deliverables, meetings and payments.",
  },
  {
    id: "644929609176144379",
    title: "Verifiable certificates",
    caption: "Portable proof of work with a public verification page.",
  },
];

export function reelSrc(id: string) {
  return `https://assets.pinterest.com/ext/embed.html?id=${id}`;
}

/* ------------------------------------------------------------- photography - */

const U = (id: string, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

/** Project banner pool — indexed deterministically by project. */
export const PROJECT_BANNERS = [
  U("1551288049-bebda4e38f71"),
  U("1461749280684-dccba630e2f6"),
  U("1522542550221-31fd19575a2d"),
  U("1600880292203-757bb62b4baf"),
  U("1498050108023-c5249f4df085"),
  U("1454165804606-c3d57bc86b40"),
  U("1519389950473-47ba0277781c"),
  U("1531403009284-440f080d1e12"),
  U("1553877522-43269d4ea984"),
  U("1552664730-d307ca884978"),
  U("1517245386807-bb43f82c33c4"),
  U("1542744173-8e7e53415bb0"),
  U("1559136555-9303baea8ebd"),
  U("1504384308090-c894fdcc538d"),
  U("1526628953301-3e589a6a8b74"),
  U("1581291518857-4e27b48ff24e"),
];

/** Company banner pool. */
export const COMPANY_BANNERS = [
  U("1497366754035-f200968a6e72"),
  U("1497215728101-856f4ea42174"),
  U("1524758631624-e2822e304c36"),
  U("1567521464027-f127ff144326"),
  U("1604328698692-f76ea9498e76"),
  U("1541746972996-4e0b0f43e02a"),
];

/** Office / culture gallery pool. */
export const GALLERY = [
  U("1522071820081-009f0129c71c", 800),
  U("1600880292089-90a7e086ee0c", 800),
  U("1531482615713-2afd69097998", 800),
  U("1517048676732-d65bc937f952", 800),
  U("1515187029135-18ee286d815b", 800),
  U("1556761175-b413da4baf72", 800),
  U("1497366811353-6870744d04b2", 800),
  U("1524178232363-1fb2b075b655", 800),
];

/** Portfolio / case-study imagery. */
export const PORTFOLIO_SHOTS = [
  U("1559028012-481c04fa702d", 800),
  U("1545235617-9465d2a55698", 800),
  U("1587440871875-191322ee64b0", 800),
  U("1626785774573-4b799315345d", 800),
  U("1572044162444-ad60f128bdea", 800),
  U("1559526324-4b87b5e36e44", 800),
  U("1618788372246-79faff0c3742", 800),
  U("1541462608143-67571c6738dd", 800),
  U("1600607687920-4e2a09cf159d", 800),
  U("1600566753086-00f18fb6b3ea", 800),
];

/** Freelancer portrait pool. */
export const PORTRAITS = [
  U("1494790108377-be9c29b29330", 400),
  U("1507003211169-0a1dd7228f2d", 400),
  U("1438761681033-6461ffad8d80", 400),
  U("1500648767791-00dcc994a43e", 400),
  U("1534528741775-53994a69daeb", 400),
  U("1519085360753-af0119f7cbe7", 400),
  U("1544005313-94ddf0286df2", 400),
  U("1506794778202-cad84cf45f1d", 400),
  U("1517841905240-472988babdf9", 400),
  U("1531123897727-8f129e1688ce", 400),
  U("1502685104226-ee32379fefbe", 400),
  U("1489424731084-a5d8b219a5bb", 400),
  U("1463453091185-61582044d556", 400),
  U("1524504388940-b1c1722653e1", 400),
  U("1573497019940-1c28c88b4f3e", 400),
  U("1580489944761-15a19d654956", 400),
];

export function pickFrom<T>(pool: T[], seed: string | number, offset = 0): T {
  const s = typeof seed === "number" ? seed : hash(seed);
  return pool[(s + offset) % pool.length];
}

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * A deterministic stand-in for an entity that has no image of its own.
 *
 * The design assumes every project, company and profile carries artwork and
 * renders those fields straight through `next/image`, which rejects an empty
 * src. Real rows frequently have none, so the adapters resolve to one of the
 * gallery images instead — keyed off the row id, so a given entity always gets
 * the same picture rather than changing on every render.
 */
export function placeholderImage(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return GALLERY[hash % GALLERY.length];
}
