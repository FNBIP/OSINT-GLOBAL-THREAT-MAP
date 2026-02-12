/**
 * RSS Feed Configuration for OSINT News Panel
 *
 * 78 curated feeds across 14 categories covering geopolitics, defense,
 * conflict, crisis, OSINT, regional coverage, energy, cyber, and terrorism.
 *
 * Source tiers:
 *   T1 = Wire services / official agencies (Reuters, AP, DOD, UN)
 *   T2 = Major established outlets (BBC, Guardian, Foreign Policy)
 *   T3 = Specialist / think tanks (Defense One, Bellingcat, CSIS)
 *   T4 = Aggregators / blogs
 *
 * Propaganda risk flags alert users to state-affiliated media.
 */

export type NewsCategory =
  | "geopolitics"
  | "defense"
  | "conflict"
  | "crisis"
  | "osint"
  | "regional-mideast"
  | "regional-africa"
  | "regional-asia"
  | "regional-europe"
  | "regional-americas"
  | "energy"
  | "cyber"
  | "terrorism"
  | "humanitarian";

export type SourceTier = 1 | 2 | 3 | 4;

export type PropagandaRisk = "none" | "low" | "medium" | "high";

export interface RSSFeedConfig {
  id: string;
  name: string;
  url: string;
  category: NewsCategory;
  tier: SourceTier;
  propagandaRisk: PropagandaRisk;
  stateAffiliation?: string;
  enabled: boolean;
}

export const NEWS_CATEGORIES: { id: NewsCategory; label: string; color: string }[] = [
  { id: "geopolitics", label: "Geopolitics", color: "#00aaff" },
  { id: "defense", label: "Defense", color: "#00ff88" },
  { id: "conflict", label: "Conflict", color: "#ff4444" },
  { id: "crisis", label: "Crisis", color: "#ff6600" },
  { id: "osint", label: "OSINT", color: "#aa88ff" },
  { id: "cyber", label: "Cyber", color: "#00ffcc" },
  { id: "terrorism", label: "Terrorism", color: "#ff4444" },
  { id: "energy", label: "Energy", color: "#ffaa00" },
  { id: "humanitarian", label: "Humanitarian", color: "#ff88aa" },
  { id: "regional-mideast", label: "Middle East", color: "#ffcc44" },
  { id: "regional-africa", label: "Africa", color: "#88cc44" },
  { id: "regional-asia", label: "Asia", color: "#ff8844" },
  { id: "regional-europe", label: "Europe", color: "#4488ff" },
  { id: "regional-americas", label: "Americas", color: "#44ccaa" },
];

/** Lookup map for category → color */
export const CATEGORY_COLORS: Record<string, string> = Object.fromEntries(
  NEWS_CATEGORIES.map((c) => [c.id, c.color])
);

export const RSS_FEEDS: RSSFeedConfig[] = [
  // ═══════════════════════════════════════════
  // GEOPOLITICS (14 feeds)
  // ═══════════════════════════════════════════
  {
    id: "reuters-world",
    name: "Reuters",
    url: "https://feeds.reuters.com/Reuters/worldNews",
    category: "geopolitics",
    tier: 1,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "ap-topnews",
    name: "AP News",
    url: "https://rsshub.app/apnews/topics/apf-topnews",
    category: "geopolitics",
    tier: 1,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "bbc-world",
    name: "BBC World",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    category: "geopolitics",
    tier: 2,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "guardian-world",
    name: "The Guardian",
    url: "https://www.theguardian.com/world/rss",
    category: "geopolitics",
    tier: 2,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "npr-news",
    name: "NPR",
    url: "https://feeds.npr.org/1001/rss.xml",
    category: "geopolitics",
    tier: 2,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "politico",
    name: "Politico",
    url: "https://rss.politico.com/politics-news.xml",
    category: "geopolitics",
    tier: 2,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "foreign-policy",
    name: "Foreign Policy",
    url: "https://foreignpolicy.com/feed/",
    category: "geopolitics",
    tier: 2,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "the-diplomat",
    name: "The Diplomat",
    url: "https://thediplomat.com/feed/",
    category: "geopolitics",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "aljazeera",
    name: "Al Jazeera",
    url: "https://www.aljazeera.com/xml/rss/all.xml",
    category: "geopolitics",
    tier: 2,
    propagandaRisk: "medium",
    stateAffiliation: "Qatar",
    enabled: true,
  },
  {
    id: "france24",
    name: "France 24",
    url: "https://www.france24.com/en/rss",
    category: "geopolitics",
    tier: 2,
    propagandaRisk: "low",
    stateAffiliation: "France",
    enabled: true,
  },
  {
    id: "dw-news",
    name: "DW News",
    url: "https://rss.dw.com/rss/en/top",
    category: "geopolitics",
    tier: 2,
    propagandaRisk: "low",
    stateAffiliation: "Germany",
    enabled: true,
  },
  {
    id: "xinhua",
    name: "Xinhua",
    url: "http://www.xinhuanet.com/english/rss/worldrss.xml",
    category: "geopolitics",
    tier: 3,
    propagandaRisk: "high",
    stateAffiliation: "China",
    enabled: true,
  },
  {
    id: "tass",
    name: "TASS",
    url: "https://tass.com/rss/v2.xml",
    category: "geopolitics",
    tier: 3,
    propagandaRisk: "high",
    stateAffiliation: "Russia",
    enabled: true,
  },
  {
    id: "kyiv-independent",
    name: "Kyiv Independent",
    url: "https://kyivindependent.com/feed/",
    category: "geopolitics",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },

  // ═══════════════════════════════════════════
  // DEFENSE & MILITARY (12 feeds)
  // ═══════════════════════════════════════════
  {
    id: "defense-one",
    name: "Defense One",
    url: "https://www.defenseone.com/rss/",
    category: "defense",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "breaking-defense",
    name: "Breaking Defense",
    url: "https://breakingdefense.com/feed/",
    category: "defense",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "war-zone",
    name: "The War Zone",
    url: "https://www.thedrive.com/the-war-zone/feed",
    category: "defense",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "military-times",
    name: "Military Times",
    url: "https://www.militarytimes.com/arc/outboundfeeds/rss/?outputType=xml",
    category: "defense",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "defense-news",
    name: "Defense News",
    url: "https://www.defensenews.com/arc/outboundfeeds/rss/?outputType=xml",
    category: "defense",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "dod-news",
    name: "DOD News",
    url: "https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=945&max=10",
    category: "defense",
    tier: 1,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "stars-stripes",
    name: "Stars and Stripes",
    url: "https://www.stripes.com/rss",
    category: "defense",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "naval-news",
    name: "Naval News",
    url: "https://www.navalnews.com/feed/",
    category: "defense",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "air-space-forces",
    name: "Air & Space Forces",
    url: "https://www.airandspaceforces.com/feed/",
    category: "defense",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "janes",
    name: "Janes",
    url: "https://www.janes.com/feeds/news",
    category: "defense",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "iiss",
    name: "IISS",
    url: "https://www.iiss.org/rss",
    category: "defense",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "rusi",
    name: "RUSI",
    url: "https://www.rusi.org/rss",
    category: "defense",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },

  // ═══════════════════════════════════════════
  // CONFLICT & CRISIS (10 feeds)
  // ═══════════════════════════════════════════
  {
    id: "acled",
    name: "ACLED",
    url: "https://acleddata.com/feed/",
    category: "conflict",
    tier: 1,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "reliefweb",
    name: "ReliefWeb",
    url: "https://reliefweb.int/updates/rss.xml",
    category: "conflict",
    tier: 1,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "crisis-group",
    name: "Crisis Group",
    url: "https://www.crisisgroup.org/rss.xml",
    category: "conflict",
    tier: 2,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "un-news",
    name: "UN News",
    url: "https://news.un.org/feed/subscribe/en/news/all/rss.xml",
    category: "conflict",
    tier: 1,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "unhcr",
    name: "UNHCR",
    url: "https://www.unhcr.org/rss/news.xml",
    category: "humanitarian",
    tier: 1,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "icrc",
    name: "ICRC",
    url: "https://www.icrc.org/en/rss",
    category: "humanitarian",
    tier: 1,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "amnesty",
    name: "Amnesty International",
    url: "https://www.amnesty.org/en/feed/",
    category: "humanitarian",
    tier: 2,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "long-war-journal",
    name: "Long War Journal",
    url: "https://www.longwarjournal.org/feed",
    category: "conflict",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "who-news",
    name: "WHO News",
    url: "https://www.who.int/feeds/entity/news/en/rss.xml",
    category: "crisis",
    tier: 1,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "iaea-press",
    name: "IAEA Press",
    url: "https://www.iaea.org/feeds/press-releases",
    category: "crisis",
    tier: 1,
    propagandaRisk: "none",
    enabled: true,
  },

  // ═══════════════════════════════════════════
  // OSINT & INTELLIGENCE (8 feeds)
  // ═══════════════════════════════════════════
  {
    id: "bellingcat",
    name: "Bellingcat",
    url: "https://www.bellingcat.com/feed/",
    category: "osint",
    tier: 2,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "csis",
    name: "CSIS",
    url: "https://www.csis.org/rss",
    category: "osint",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "rand",
    name: "RAND",
    url: "https://www.rand.org/content/rand/pubs/rss.xml",
    category: "osint",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "brookings",
    name: "Brookings",
    url: "https://www.brookings.edu/feed/",
    category: "osint",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "carnegie",
    name: "Carnegie Endowment",
    url: "https://carnegieendowment.org/rss/feeds",
    category: "osint",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "krebs",
    name: "Krebs on Security",
    url: "https://krebsonsecurity.com/feed/",
    category: "osint",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "the-record",
    name: "The Record",
    url: "https://therecord.media/feed/",
    category: "osint",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "cisa-alerts",
    name: "CISA Alerts",
    url: "https://www.cisa.gov/uscert/ncas/alerts.xml",
    category: "osint",
    tier: 1,
    propagandaRisk: "none",
    enabled: true,
  },

  // ═══════════════════════════════════════════
  // REGIONAL — MIDDLE EAST (6 feeds)
  // ═══════════════════════════════════════════
  {
    id: "middle-east-eye",
    name: "Middle East Eye",
    url: "https://www.middleeasteye.net/rss",
    category: "regional-mideast",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "times-of-israel",
    name: "Times of Israel",
    url: "https://www.timesofisrael.com/feed/",
    category: "regional-mideast",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "al-monitor",
    name: "Al-Monitor",
    url: "https://www.al-monitor.com/rss",
    category: "regional-mideast",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "al-arabiya",
    name: "Al Arabiya",
    url: "https://english.alarabiya.net/tools/rss",
    category: "regional-mideast",
    tier: 3,
    propagandaRisk: "medium",
    stateAffiliation: "Saudi Arabia",
    enabled: true,
  },
  {
    id: "iran-intl",
    name: "Iran International",
    url: "https://www.iranintl.com/en/feed",
    category: "regional-mideast",
    tier: 3,
    propagandaRisk: "low",
    enabled: true,
  },
  {
    id: "bbc-mideast",
    name: "BBC Middle East",
    url: "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml",
    category: "regional-mideast",
    tier: 2,
    propagandaRisk: "none",
    enabled: true,
  },

  // ═══════════════════════════════════════════
  // REGIONAL — AFRICA (5 feeds)
  // ═══════════════════════════════════════════
  {
    id: "iss-africa",
    name: "ISS Africa",
    url: "https://issafrica.org/feed",
    category: "regional-africa",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "africa-report",
    name: "The Africa Report",
    url: "https://www.theafricareport.com/feed/",
    category: "regional-africa",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "daily-maverick",
    name: "Daily Maverick",
    url: "https://www.dailymaverick.co.za/rss/",
    category: "regional-africa",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "bbc-africa",
    name: "BBC Africa",
    url: "https://feeds.bbci.co.uk/news/world/africa/rss.xml",
    category: "regional-africa",
    tier: 2,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "african-arguments",
    name: "African Arguments",
    url: "https://africanarguments.org/feed/",
    category: "regional-africa",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },

  // ═══════════════════════════════════════════
  // REGIONAL — ASIA-PACIFIC (6 feeds)
  // ═══════════════════════════════════════════
  {
    id: "scmp",
    name: "South China Morning Post",
    url: "https://www.scmp.com/rss/91/feed",
    category: "regional-asia",
    tier: 3,
    propagandaRisk: "medium",
    stateAffiliation: "China/HK",
    enabled: true,
  },
  {
    id: "nikkei-asia",
    name: "Nikkei Asia",
    url: "https://asia.nikkei.com/rss",
    category: "regional-asia",
    tier: 2,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "cna",
    name: "Channel News Asia",
    url: "https://www.channelnewsasia.com/rssfeeds/8395986",
    category: "regional-asia",
    tier: 2,
    propagandaRisk: "low",
    stateAffiliation: "Singapore",
    enabled: true,
  },
  {
    id: "the-hindu",
    name: "The Hindu",
    url: "https://www.thehindu.com/news/feeder/default.rss",
    category: "regional-asia",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "cgtn",
    name: "CGTN",
    url: "https://www.cgtn.com/subscribe/rss/section/world.xml",
    category: "regional-asia",
    tier: 3,
    propagandaRisk: "high",
    stateAffiliation: "China",
    enabled: true,
  },
  {
    id: "bbc-asia",
    name: "BBC Asia",
    url: "https://feeds.bbci.co.uk/news/world/asia/rss.xml",
    category: "regional-asia",
    tier: 2,
    propagandaRisk: "none",
    enabled: true,
  },

  // ═══════════════════════════════════════════
  // REGIONAL — EUROPE (4 feeds)
  // ═══════════════════════════════════════════
  {
    id: "bbc-europe",
    name: "BBC Europe",
    url: "https://feeds.bbci.co.uk/news/world/europe/rss.xml",
    category: "regional-europe",
    tier: 2,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "euronews",
    name: "Euronews",
    url: "https://www.euronews.com/rss",
    category: "regional-europe",
    tier: 2,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "politico-eu",
    name: "Politico EU",
    url: "https://www.politico.eu/feed/",
    category: "regional-europe",
    tier: 2,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "moscow-times",
    name: "Moscow Times",
    url: "https://www.themoscowtimes.com/rss/news",
    category: "regional-europe",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },

  // ═══════════════════════════════════════════
  // REGIONAL — AMERICAS (3 feeds)
  // ═══════════════════════════════════════════
  {
    id: "bbc-latam",
    name: "BBC Latin America",
    url: "https://feeds.bbci.co.uk/news/world/latin_america/rss.xml",
    category: "regional-americas",
    tier: 2,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "reuters-americas",
    name: "Reuters Americas",
    url: "https://feeds.reuters.com/Reuters/domesticNews",
    category: "regional-americas",
    tier: 1,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "insightcrime",
    name: "InSight Crime",
    url: "https://insightcrime.org/feed/",
    category: "regional-americas",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },

  // ═══════════════════════════════════════════
  // ENERGY & NUCLEAR (5 feeds)
  // ═══════════════════════════════════════════
  {
    id: "oilprice",
    name: "OilPrice.com",
    url: "https://oilprice.com/rss/main",
    category: "energy",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "world-nuclear-news",
    name: "World Nuclear News",
    url: "https://world-nuclear-news.org/rss",
    category: "energy",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "arms-control",
    name: "Arms Control Association",
    url: "https://www.armscontrol.org/rss",
    category: "energy",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "nti",
    name: "Nuclear Threat Initiative",
    url: "https://www.nti.org/rss/",
    category: "energy",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "eia",
    name: "EIA Today in Energy",
    url: "https://www.eia.gov/todayinenergy/rss.xml",
    category: "energy",
    tier: 1,
    propagandaRisk: "none",
    enabled: true,
  },

  // ═══════════════════════════════════════════
  // CYBER SECURITY (6 feeds)
  // ═══════════════════════════════════════════
  {
    id: "hacker-news-security",
    name: "The Hacker News",
    url: "https://feeds.feedburner.com/TheHackersNews",
    category: "cyber",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "dark-reading",
    name: "Dark Reading",
    url: "https://www.darkreading.com/rss.xml",
    category: "cyber",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "bleepingcomputer",
    name: "BleepingComputer",
    url: "https://www.bleepingcomputer.com/feed/",
    category: "cyber",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "securityweek",
    name: "SecurityWeek",
    url: "https://www.securityweek.com/feed/",
    category: "cyber",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "enisa",
    name: "ENISA",
    url: "https://www.enisa.europa.eu/rss.xml",
    category: "cyber",
    tier: 1,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "schneier",
    name: "Schneier on Security",
    url: "https://www.schneier.com/feed/",
    category: "cyber",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },

  // ═══════════════════════════════════════════
  // TERRORISM & EXTREMISM (6 feeds)
  // ═══════════════════════════════════════════
  {
    id: "ctc-westpoint",
    name: "CTC West Point",
    url: "https://ctc.westpoint.edu/feed/",
    category: "terrorism",
    tier: 2,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "jamestown",
    name: "Jamestown Foundation",
    url: "https://jamestown.org/feed/",
    category: "terrorism",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "counter-extremism",
    name: "Counter Extremism",
    url: "https://www.counterextremism.com/feed",
    category: "terrorism",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "isd-global",
    name: "ISD Global",
    url: "https://www.isdglobal.org/feed/",
    category: "terrorism",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "terrorism-monitor",
    name: "Terrorism Monitor",
    url: "https://jamestown.org/program/tm/feed/",
    category: "terrorism",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
  {
    id: "lawfare",
    name: "Lawfare",
    url: "https://www.lawfaremedia.org/feed",
    category: "terrorism",
    tier: 3,
    propagandaRisk: "none",
    enabled: true,
  },
];
