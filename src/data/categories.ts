// Simple explanation of each category, for beginners.
// There are no "sections", "tips", or "levels" on purpose: you decide what to
// put in and how to design it.
//
// `name` shows up in the reel and the brief, so don't change the spelling
// if the user already has saved briefs.

export type CategoryInfo = {
  name: string;
  /** What it is, in simple words */
  what: string;
  /** Real kinds of websites you can picture */
  think: string;
};

export const categoryInfo: readonly CategoryInfo[] = [
  {
    name: "Architecture",
    what: "A website for an architect or building studio. It shows the buildings and houses they designed.",
    think: "An architecture firm portfolio, or a page for a new building.",
  },
  {
    name: "Art & Illustration",
    what: "A website for an artist or illustrator to show their work.",
    think: "An online gallery, an illustrator's portfolio, a print shop.",
  },
  {
    name: "Business & Corporate",
    what: "A website for a normal company that sells services or products to other businesses.",
    think: "An accounting firm, a logistics company, a consulting group.",
  },
  {
    name: "Culture & Education",
    what: "A website for a museum, library, school, or online course.",
    think: "A museum site, a university page, a language learning site.",
  },
  {
    name: "Design Agencies",
    what: "A website for an agency that makes designs or websites for other companies. It's a portfolio of portfolios.",
    think: "A creative studio with case studies, awards, and a client list.",
  },
  {
    name: "E-Commerce",
    what: "An online store with products, a cart, and checkout.",
    think: "A shoe shop, a coffee store, a gadget shop.",
  },
  {
    name: "Events",
    what: "A website for one event, like a conference, festival, concert, or wedding.",
    think:
      "A tech conference page, a music festival, a wedding invitation site.",
  },
  {
    name: "Experimental",
    what: "No rules. The website itself is the star, not what's inside it. More like art than a product.",
    think:
      "A site that moves with your mouse, a 3D world, odd scrolling, a game.",
  },
  {
    name: "Fashion",
    what: "A website for a clothing brand or designer.",
    think: "A clothing label, a lookbook, a runway collection.",
  },
  {
    name: "Film & TV",
    what: "A website for a movie, a show, or a production company.",
    think: "A movie page with a trailer, or a page for a TV show.",
  },
  {
    name: "Food & Drink",
    what: "A website for a food or drink brand, not for a restaurant.",
    think: "A sauce brand, a coffee roaster, a craft beer.",
  },
  {
    name: "Games & Entertainment",
    what: "A website for a game, a game studio, or an entertainment brand.",
    think: "An indie game page, an esports team, a streaming channel.",
  },
  {
    name: "Hotel / Restaurant",
    what: "A website for a place people visit, like a hotel, resort, or restaurant.",
    think: "A boutique hotel, a ramen shop, a beach resort.",
  },
  {
    name: "Institutions",
    what: "A website for a non-profit, a government office, or a public agency. It gives services or info to the public.",
    think: "A city hall, a hospital, a bank, a university, an embassy.",
  },
  {
    name: "Luxury",
    what: "A website for an expensive brand. It should feel exclusive and refined.",
    think: "A watch, jewelry, designer perfume, a luxury car.",
  },
  {
    name: "Magazine / Newspaper / Blog",
    what: "A website full of articles to read. The writing is the star.",
    think: "An online news site, a personal blog, a magazine.",
  },
  {
    name: "Music & Sound",
    what: "A website for a musician, band, label, or podcast.",
    think: "An artist page with albums and tour dates, a podcast site.",
  },
  {
    name: "Photography",
    what: "A photographer's portfolio.",
    think: "A wedding photographer, a travel photographer, a photo series.",
  },
  {
    name: "Promotional",
    what: "A one-page site for a campaign, product, or short-term promo.",
    think: "A new phone landing page, a sale campaign, an app launch.",
  },
  {
    name: "Real Estate",
    what: "A website for selling or renting houses, condos, or land.",
    think: "A condo developer page, a property listing site.",
  },
  {
    name: "Social Responsibility",
    what: "A website for a charity, cause, or movement that helps people or nature.",
    think: "A tree-planting group, an animal shelter, a donation campaign.",
  },
  {
    name: "Sports",
    what: "A website for a team, league, athlete, or sports brand.",
    think: "A basketball team page, a gym, a running event, sports apparel.",
  },
  {
    name: "Startups",
    what: "A website for a new company with a new product, usually an app or software.",
    think: "A SaaS landing page, a fintech app, an AI tool.",
  },
  {
    name: "Technology",
    what: "A website for a tech product, hardware, or developer tool. More technical than Startups.",
    think: "A library's docs site, a gadget page, a cloud service.",
  },
  {
    name: "Web & Interactive",
    what: "A website that is valuable because you can interact with it, like tools, charts, stories, or mini apps.",
    think: "A data visualization, an interactive story, an online calculator.",
  },
];

/** Names only, for the reel. */
export const categories: readonly string[] = categoryInfo.map((c) => c.name);

export const infoFor = (name: string) =>
  categoryInfo.find((c) => c.name === name);
