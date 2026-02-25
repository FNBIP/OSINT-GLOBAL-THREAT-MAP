import { Valyu } from "valyu-js";

let valyuInstance: Valyu | null = null;

const OAUTH_PROXY_URL =
  process.env.VALYU_OAUTH_PROXY_URL ||
  `${process.env.VALYU_APP_URL || "https://platform.valyu.ai"}/api/oauth/proxy`;

function getValyuClient(): Valyu {
  if (!valyuInstance) {
    const apiKey = process.env.VALYU_API_KEY;
    if (!apiKey) {
      throw new Error("VALYU_API_KEY environment variable is not set");
    }
    valyuInstance = new Valyu(apiKey);
  }
  return valyuInstance;
}

interface ProxyResult {
  success: boolean;
  data?: any;
  error?: string;
  requiresReauth?: boolean;
  requiresCredits?: boolean;
}

// Helper to check if an error message indicates a credit problem
function isCreditErrorMessage(message: string): boolean {
  const lowerMsg = message.toLowerCase();
  return (
    lowerMsg.includes("insufficient credits") ||
    lowerMsg.includes("credit limit exceeded") ||
    lowerMsg.includes("no credits available") ||
    message.includes("402")
  );
}

// Custom error class for credit errors
export class CreditError extends Error {
  constructor(message = "Insufficient credits") {
    super(message);
    this.name = "CreditError";
  }
}

// Helper: check if an error is a transient server error worth retrying
function isTransientError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("500") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("api_error") ||
    msg.includes("Internal server error") ||
    msg.includes("overloaded") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("fetch failed")
  );
}

// Retry wrapper with exponential backoff for transient API errors
async function withRetry<T>(
  fn: () => Promise<T>,
  { maxRetries = 2, baseDelayMs = 1000, label = "API call" } = {}
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries && isTransientError(error)) {
        const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
        console.warn(`[${label}] Attempt ${attempt + 1} failed (transient), retrying in ${Math.round(delay)}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

async function callViaProxy(
  path: string,
  body: any,
  accessToken: string
): Promise<ProxyResult> {
  try {
    const response = await fetch(OAUTH_PROXY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path, method: "POST", body }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: "Session expired", requiresReauth: true };
      }
      if (response.status === 402) {
        return { success: false, error: "Insufficient credits", requiresCredits: true };
      }
      // Try to parse error message for credit-related errors
      try {
        const errorData = await response.json();
        const errorMsg = errorData.error || errorData.message || "";
        if (isCreditErrorMessage(errorMsg)) {
          return { success: false, error: errorMsg, requiresCredits: true };
        }
        return { success: false, error: errorMsg || `API call failed: ${response.status}` };
      } catch {
        return { success: false, error: `API call failed: ${response.status}` };
      }
    }

    const text = await response.text();

    // Handle SSE-formatted responses from the proxy
    if (text.startsWith("data: ")) {
      const lines = text.split("\n").filter((l) => l.startsWith("data: "));
      let contents = "";
      let searchResults: Array<{ title?: string; url?: string }> = [];
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.slice(6));
          if (parsed.search_results) {
            searchResults = parsed.search_results;
          }
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            contents += delta;
          }
        } catch {
          // skip unparseable chunks (e.g. [DONE])
        }
      }
      return { success: true, data: { contents: contents || undefined, search_results: searchResults.length > 0 ? searchResults : undefined } };
    }

    try {
      const data = JSON.parse(text);
      return { success: true, data };
    } catch {
      return { success: false, error: `Invalid JSON response: ${text.substring(0, 200)}` };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

function parsePublishedDate(dateValue: unknown): string | undefined {
  if (!dateValue) return undefined;

  if (typeof dateValue === "string") {
    const parsed = new Date(dateValue);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
    return dateValue.toISOString();
  }

  if (typeof dateValue === "number") {
    const timestamp = dateValue > 1e12 ? dateValue : dateValue * 1000;
    const parsed = new Date(timestamp);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return undefined;
}

interface SearchOptions {
  maxResults?: number;
  freshness?: "day" | "week" | "month";
  accessToken?: string;
}

export async function searchEvents(
  query: string,
  options?: SearchOptions
): Promise<{
  results: Array<{
    title: string;
    url: string;
    content: string;
    publishedDate?: string;
    source?: string;
  }>;
  requiresReauth?: boolean;
  requiresCredits?: boolean;
}> {
  const searchBody = {
    query,
    searchType: "news",
    maxNumResults: options?.maxResults || 20,
  };

  if (options?.accessToken) {
    const proxyResult = await callViaProxy("/v1/search", searchBody, options.accessToken);

    if (!proxyResult.success) {
      if (proxyResult.requiresReauth) {
        return { results: [], requiresReauth: true };
      }
      if (proxyResult.requiresCredits) {
        return { results: [], requiresCredits: true };
      }
      throw new Error(proxyResult.error || "Search failed");
    }

    const response = proxyResult.data;
    if (!response.results) {
      return { results: [] };
    }

    return {
      results: response.results.map((result: any) => {
        const dateValue = result.date || result.publication_date;
        return {
          title: result.title || "Untitled",
          url: result.url || "",
          content: typeof result.content === "string" ? result.content : "",
          publishedDate: parsePublishedDate(dateValue),
          source: result.source,
        };
      }),
    };
  }

  try {
    const valyu = getValyuClient();
    const response = await withRetry(
      () => valyu.search(query, {
        searchType: "news",
        maxNumResults: options?.maxResults || 20,
      }),
      { maxRetries: 2, baseDelayMs: 1000, label: `Valyu search "${query.slice(0, 30)}"` }
    );

    if (!response.results) {
      return { results: [] };
    }

    return {
      results: response.results.map((result) => {
        const dateValue = result.date || result.publication_date;
        return {
          title: result.title || "Untitled",
          url: result.url || "",
          content: typeof result.content === "string" ? result.content : "",
          publishedDate: parsePublishedDate(dateValue),
          source: result.source,
        };
      }),
    };
  } catch (error) {
    // Check if it's a credit error
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (isCreditErrorMessage(errorMsg)) {
      return { results: [], requiresCredits: true };
    }
    // For transient/500 errors, return empty results instead of crashing
    if (isTransientError(error)) {
      console.warn(`[Valyu] Search failed after retries for "${query.slice(0, 40)}":`, errorMsg.slice(0, 120));
      return { results: [] };
    }
    console.error("[Valyu] Search error:", errorMsg.slice(0, 200));
    throw error;
  }
}

type EntityType = "organization" | "person" | "country" | "group";

const COUNTRIES = new Set([
  "afghanistan", "albania", "algeria", "andorra", "angola", "argentina", "armenia",
  "australia", "austria", "azerbaijan", "bahamas", "bahrain", "bangladesh", "barbados",
  "belarus", "belgium", "belize", "benin", "bhutan", "bolivia", "bosnia", "botswana",
  "brazil", "brunei", "bulgaria", "burkina faso", "burundi", "cambodia", "cameroon",
  "canada", "cape verde", "central african republic", "chad", "chile", "china",
  "colombia", "comoros", "congo", "costa rica", "croatia", "cuba", "cyprus",
  "czech republic", "czechia", "denmark", "djibouti", "dominica", "dominican republic",
  "ecuador", "egypt", "el salvador", "equatorial guinea", "eritrea", "estonia",
  "eswatini", "ethiopia", "fiji", "finland", "france", "gabon", "gambia", "georgia",
  "germany", "ghana", "greece", "grenada", "guatemala", "guinea", "guinea-bissau",
  "guyana", "haiti", "honduras", "hungary", "iceland", "india", "indonesia", "iran",
  "iraq", "ireland", "israel", "italy", "ivory coast", "jamaica", "japan", "jordan",
  "kazakhstan", "kenya", "kiribati", "north korea", "south korea", "korea", "kosovo",
  "kuwait", "kyrgyzstan", "laos", "latvia", "lebanon", "lesotho", "liberia", "libya",
  "liechtenstein", "lithuania", "luxembourg", "madagascar", "malawi", "malaysia",
  "maldives", "mali", "malta", "marshall islands", "mauritania", "mauritius", "mexico",
  "micronesia", "moldova", "monaco", "mongolia", "montenegro", "morocco", "mozambique",
  "myanmar", "namibia", "nauru", "nepal", "netherlands", "new zealand", "nicaragua",
  "niger", "nigeria", "north macedonia", "norway", "oman", "pakistan", "palau",
  "palestine", "panama", "papua new guinea", "paraguay", "peru", "philippines", "poland",
  "portugal", "qatar", "romania", "russia", "rwanda", "saint kitts", "saint lucia",
  "saint vincent", "samoa", "san marino", "saudi arabia", "senegal", "serbia",
  "seychelles", "sierra leone", "singapore", "slovakia", "slovenia", "solomon islands",
  "somalia", "south africa", "south sudan", "spain", "sri lanka", "sudan", "suriname",
  "sweden", "switzerland", "syria", "taiwan", "tajikistan", "tanzania", "thailand",
  "timor-leste", "togo", "tonga", "trinidad", "tunisia", "turkey", "turkmenistan",
  "tuvalu", "uganda", "ukraine", "united arab emirates", "uae", "united kingdom", "uk",
  "united states", "usa", "us", "america", "uruguay", "uzbekistan", "vanuatu",
  "vatican", "venezuela", "vietnam", "yemen", "zambia", "zimbabwe",
]);

function classifyEntityType(name: string, content: string): EntityType {
  const lowerName = name.toLowerCase().trim();
  const lowerContent = content.toLowerCase();

  if (COUNTRIES.has(lowerName)) {
    return "country";
  }

  const countryIndicators = [
    "sovereign nation", "republic of", "kingdom of", "nation state",
    "government of", "country located", "bordered by", "capital city",
    "national anthem", "head of state", "prime minister of", "president of the country",
  ];
  const countryScore = countryIndicators.filter(ind => lowerContent.includes(ind)).length;

  const groupIndicators = [
    "ethnic group", "tribe", "tribal", "indigenous", "clan", "community",
    "peoples", "militant group", "rebel group", "armed group", "terrorist organization",
    "militia", "faction", "insurgent", "separatist", "guerrilla",
  ];
  const groupScore = groupIndicators.filter(ind => lowerContent.includes(ind)).length;

  const personIndicators = [
    "was born", "born in", "died in", "biography", "personal life",
    "early life", "career", "married", "children", "his ", "her ",
    "he was", "she was", "politician", "leader", "ceo", "founder",
    "president ", "minister ", "general ", "commander",
  ];
  const personScore = personIndicators.filter(ind => lowerContent.includes(ind)).length;

  const orgIndicators = [
    "company", "corporation", "founded in", "headquarters", "inc.", "ltd.",
    "organization", "institution", "agency", "association", "foundation",
    "ngo", "nonprofit", "enterprise", "business", "firm", "conglomerate",
  ];
  const orgScore = orgIndicators.filter(ind => lowerContent.includes(ind)).length;

  const scores = [
    { type: "country" as EntityType, score: countryScore * 2 },
    { type: "group" as EntityType, score: groupScore * 1.5 },
    { type: "person" as EntityType, score: personScore },
    { type: "organization" as EntityType, score: orgScore },
  ];

  scores.sort((a, b) => b.score - a.score);

  if (scores[0].score > 0) {
    return scores[0].type;
  }

  return "organization";
}

interface EntityOptions {
  accessToken?: string;
}

export async function getEntityResearch(entityName: string, options?: EntityOptions) {
  const searchBody = {
    query: `${entityName} profile background information`,
    searchType: "all",
    maxNumResults: 10,
  };

  if (options?.accessToken) {
    const proxyResult = await callViaProxy("/v1/search", searchBody, options.accessToken);

    if (!proxyResult.success) {
      if (proxyResult.requiresReauth) {
        return null;
      }
      if (proxyResult.requiresCredits) {
        throw new CreditError(proxyResult.error);
      }
      throw new Error(proxyResult.error || "Entity research failed");
    }

    const response = proxyResult.data;
    if (!response.results || response.results.length === 0) {
      return null;
    }

    const combinedContent = response.results
      .map((r: any) => (typeof r.content === "string" ? r.content : ""))
      .join("\n\n");

    const entityType = classifyEntityType(entityName, combinedContent);

    return {
      name: entityName,
      description: combinedContent.slice(0, 1000),
      type: entityType,
      data: {
        sources: response.results.map((r: any) => ({
          title: r.title,
          url: r.url,
        })),
      },
    };
  }

  try {
    const valyu = getValyuClient();
    const response = await withRetry(
      () => valyu.search(
        `${entityName} profile background information`,
        {
          searchType: "all",
          maxNumResults: 10,
        }
      ),
      { maxRetries: 2, baseDelayMs: 1000, label: `Entity research "${entityName}"` }
    );

    if (!response.results || response.results.length === 0) {
      return null;
    }

    const combinedContent = response.results
      .map((r) => (typeof r.content === "string" ? r.content : ""))
      .join("\n\n");

    const entityType = classifyEntityType(entityName, combinedContent);

    return {
      name: entityName,
      description: combinedContent.slice(0, 1000),
      type: entityType,
      data: {
        sources: response.results.map((r) => ({
          title: r.title,
          url: r.url,
        })),
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (isCreditErrorMessage(errorMsg)) {
      throw new CreditError(errorMsg);
    }
    if (isTransientError(error)) {
      console.warn(`[Valyu] Entity research failed after retries for "${entityName}":`, errorMsg.slice(0, 120));
      return null;
    }
    console.error("[Valyu] Entity research error:", errorMsg.slice(0, 200));
    throw error;
  }
}

interface EntityStreamChunk {
  type: "content" | "sources" | "done" | "error";
  content?: string;
  sources?: Array<{ title: string; url: string }>;
  error?: string;
  requiresCredits?: boolean;
}

export async function* streamEntityResearch(
  entityName: string,
  options?: EntityOptions
): AsyncGenerator<EntityStreamChunk> {
  const query = `Provide a comprehensive overview of ${entityName}. Include:
- What/who they are and their background
- Key facts, history, and significance
- Notable activities, operations, or achievements
- Current status and recent developments
- Geographic presence and areas of operation

Be thorough but concise. Focus on verified facts from reliable sources.`;

  // Use OAuth proxy if accessToken is provided
  if (options?.accessToken) {
    try {
      const proxyResult = await callViaProxy(
        "/v1/answer",
        {
          query,
          excluded_sources: ["wikipedia.org"],
        },
        options.accessToken
      );

      if (!proxyResult.success) {
        yield {
          type: "error",
          error: proxyResult.error || "Failed to get entity research",
          requiresCredits: proxyResult.requiresCredits,
        };
        return;
      }

      const data = proxyResult.data;
      if (data.contents) {
        yield { type: "content", content: data.contents };
      }
      if (data.search_results) {
        yield {
          type: "sources",
          sources: data.search_results.map((s: { title?: string; url?: string }) => ({
            title: s.title || "Source",
            url: s.url || "",
          })),
        };
      }
      yield { type: "done" };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error occurred";
      yield {
        type: "error",
        error: errorMsg,
        requiresCredits: isCreditErrorMessage(errorMsg),
      };
    }
    return;
  }

  // Self-hosted mode: use SDK with streaming (with retry on initial call)
  const valyu = getValyuClient();

  try {
    const stream = await withRetry(
      () => valyu.answer(query, { excludedSources: ["wikipedia.org"], streaming: true }),
      { label: `Stream entity "${entityName}"` }
    );

    if (Symbol.asyncIterator in (stream as object)) {
      for await (const chunk of stream as AsyncGenerator<{
        type: string;
        content?: string;
        search_results?: Array<{ title?: string; url?: string }>;
      }>) {
        if (chunk.type === "content" && chunk.content) {
          yield { type: "content", content: chunk.content };
        } else if (chunk.type === "search_results" && chunk.search_results) {
          yield {
            type: "sources",
            sources: chunk.search_results.map((s) => ({
              title: s.title || "Source",
              url: s.url || "",
            })),
          };
        }
      }
    }

    yield { type: "done" };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error occurred";
    yield {
      type: "error",
      error: errorMsg,
      requiresCredits: isCreditErrorMessage(errorMsg),
    };
  }
}

export async function searchEntityLocations(entityName: string, options?: EntityOptions) {
  const searchBody = {
    query: `${entityName} headquarters offices locations branches worldwide operations`,
    searchType: "all",
    maxNumResults: 15,
  };

  if (options?.accessToken) {
    const proxyResult = await callViaProxy("/v1/search", searchBody, options.accessToken);

    if (!proxyResult.success) {
      return "";
    }

    const response = proxyResult.data;
    if (!response.results || response.results.length === 0) {
      return "";
    }

    return response.results
      .map((r: any) => (typeof r.content === "string" ? r.content : ""))
      .join("\n\n");
  }

  try {
    const valyu = getValyuClient();
    const response = await withRetry(
      () => valyu.search(
        `${entityName} headquarters offices locations branches worldwide operations`,
        { searchType: "all", maxNumResults: 15 }
      ),
      { label: `Entity locations "${entityName}"` }
    );

    if (!response.results || response.results.length === 0) {
      return "";
    }

    return response.results
      .map((r) => (typeof r.content === "string" ? r.content : ""))
      .join("\n\n");
  } catch (error) {
    console.warn("[Valyu] Entity locations error:", (error instanceof Error ? error.message : "").slice(0, 120));
    return "";
  }
}

export interface DeepResearchResult {
  summary: string;
  sources: { title: string; url: string }[];
  deliverables?: {
    csv?: { url: string; title: string };
    pptx?: { url: string; title: string };
  };
  pdfUrl?: string;
}

async function deepResearchViaProxy(
  topic: string,
  accessToken: string
): Promise<DeepResearchResult> {
  const query = `Intelligence dossier on ${topic}. Include:
- Background and overview
- Key locations and geographic presence
- Organizational structure and leadership
- Related entities, allies, and adversaries
- Recent activities and incidents
- Threat assessment and capabilities
- Timeline of significant events`;

  // Create task via proxy
  const createResult = await callViaProxy(
    "/v1/deepresearch/tasks",
    {
      query,
      mode: "fast",
      output_formats: ["markdown", "pdf"],
      deliverables: [
        {
          type: "csv",
          description: `Intelligence data export for ${topic} with columns for locations, entities, relationships, events, and sources`,
          columns: ["Category", "Name", "Description", "Location", "Coordinates", "Date", "Relationship", "Source URL"],
          include_headers: true,
        },
        {
          type: "pptx",
          description: `Executive intelligence briefing on ${topic} with key findings, threat assessment, and recommendations`,
          slides: 8,
        },
      ],
    },
    accessToken
  );

  if (!createResult.success || !createResult.data?.deepresearch_id) {
    console.error("Failed to create deep research task via proxy:", createResult.error);
    return { summary: "Research failed. Please try again.", sources: [] };
  }

  const taskId = createResult.data.deepresearch_id;

  // Poll for completion
  const maxAttempts = 120; // 10 minutes at 5 second intervals
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const statusResponse = await fetch(OAUTH_PROXY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: `/v1/deepresearch/tasks/${taskId}/status`,
        method: "GET",
      }),
    });

    if (!statusResponse.ok) {
      continue;
    }

    const statusData = await statusResponse.json();

    if (statusData.status === "completed") {
      const deliverables: DeepResearchResult["deliverables"] = {};
      if (statusData.deliverables) {
        for (const d of statusData.deliverables) {
          if (d.status === "completed" && d.url) {
            if (d.type === "csv") {
              deliverables.csv = { url: d.url, title: d.title };
            } else if (d.type === "pptx") {
              deliverables.pptx = { url: d.url, title: d.title };
            }
          }
        }
      }

      return {
        summary: typeof statusData.output === "string" ? statusData.output : JSON.stringify(statusData.output),
        sources: (statusData.sources || []).map((s: { title?: string; url?: string }) => ({
          title: s.title || "Source",
          url: s.url || "",
        })),
        deliverables: Object.keys(deliverables).length > 0 ? deliverables : undefined,
        pdfUrl: statusData.pdf_url,
      };
    }

    if (statusData.status === "failed") {
      console.error("Deep research failed:", statusData.error);
      return { summary: "Research did not complete successfully.", sources: [] };
    }
  }

  return { summary: "Research timed out.", sources: [] };
}

export async function deepResearch(
  topic: string,
  options?: EntityOptions
): Promise<DeepResearchResult> {
  // Use OAuth proxy if accessToken is provided
  if (options?.accessToken) {
    return deepResearchViaProxy(topic, options.accessToken);
  }

  // Self-hosted mode: use API key directly
  try {
    const valyu = getValyuClient();

    // Create deep research task with deliverables
    const task = await valyu.deepresearch.create({
      query: `Intelligence dossier on ${topic}. Include:
- Background and overview
- Key locations and geographic presence
- Organizational structure and leadership
- Related entities, allies, and adversaries
- Recent activities and incidents
- Threat assessment and capabilities
- Timeline of significant events`,
      mode: "fast",
      outputFormats: ["markdown", "pdf"],
      deliverables: [
        {
          type: "csv",
          description: `Intelligence data export for ${topic} with columns for locations, entities, relationships, events, and sources`,
          columns: [
            "Category",
            "Name",
            "Description",
            "Location",
            "Coordinates",
            "Date",
            "Relationship",
            "Source URL",
          ],
          includeHeaders: true,
        },
        {
          type: "pptx",
          description: `Executive intelligence briefing on ${topic} with key findings, threat assessment, and recommendations`,
          slides: 8,
        },
      ],
    });

    if (!task.success || !task.deepresearch_id) {
      console.error("Failed to create deep research task:", task.error);
      return { summary: "Research failed. Please try again.", sources: [] };
    }

    // Wait for completion with progress logging
    const result = await valyu.deepresearch.wait(task.deepresearch_id, {
      pollInterval: 5000,
      maxWaitTime: 600000, // 10 minutes for fast mode
      onProgress: (status) => {
        if (status.progress) {
          console.log(`Deep research progress: ${status.progress.current_step}/${status.progress.total_steps}`);
        }
      },
    });

    if (result.status !== "completed") {
      console.error("Deep research failed:", result.error);
      return { summary: "Research did not complete successfully.", sources: [] };
    }

    // Extract deliverables
    const deliverables: DeepResearchResult["deliverables"] = {};
    if (result.deliverables) {
      for (const d of result.deliverables) {
        if (d.status === "completed" && d.url) {
          if (d.type === "csv") {
            deliverables.csv = { url: d.url, title: d.title };
          } else if (d.type === "pptx") {
            deliverables.pptx = { url: d.url, title: d.title };
          }
        }
      }
    }

    return {
      summary: typeof result.output === "string" ? result.output : JSON.stringify(result.output),
      sources: (result.sources || []).map((s) => ({
        title: s.title || "Source",
        url: s.url || "",
      })),
      deliverables: Object.keys(deliverables).length > 0 ? deliverables : undefined,
      pdfUrl: result.pdf_url,
    };
  } catch (error) {
    console.error("Deep research error:", error);
    // Fallback to simple search if deep research fails
    const valyu = getValyuClient();
    const response = await valyu.search(`comprehensive analysis: ${topic}`, {
      searchType: "all",
      maxNumResults: 30,
    });

    if (!response.results) {
      return { summary: "No research results found.", sources: [] };
    }

    const summary = response.results
      .slice(0, 10)
      .map((r) => (typeof r.content === "string" ? r.content : ""))
      .join("\n\n")
      .slice(0, 3000);

    return {
      summary,
      sources: response.results.map((r) => ({
        title: r.title || "Untitled",
        url: r.url || "",
      })),
    };
  }
}

interface ConflictResult {
  answer: string;
  sources: { title: string; url: string }[];
}

export interface MilitaryBase {
  country: string;
  baseName: string;
  latitude: number;
  longitude: number;
  type: "usa" | "nato";
}

/**
 * Comprehensive hardcoded list of US and NATO military bases worldwide
 * with precise city-level coordinates sourced from extensive research
 */
export function getMilitaryBases(): MilitaryBase[] {
  return [
    // ===== GERMANY (Major US presence) =====
    { country: "Germany", baseName: "Ramstein Air Base", latitude: 49.4369, longitude: 7.6003, type: "usa" },
    { country: "Germany", baseName: "Spangdahlem Air Base", latitude: 49.9725, longitude: 6.6925, type: "usa" },
    { country: "Germany", baseName: "Grafenwöhr Training Area", latitude: 49.6981, longitude: 11.9314, type: "usa" },
    { country: "Germany", baseName: "Stuttgart-Kelley Barracks", latitude: 48.7256, longitude: 9.1450, type: "usa" },
    { country: "Germany", baseName: "Landstuhl Regional Medical Center", latitude: 49.4033, longitude: 7.5569, type: "usa" },
    { country: "Germany", baseName: "Wiesbaden Army Airfield", latitude: 50.0500, longitude: 8.3253, type: "usa" },
    { country: "Germany", baseName: "Ansbach-Katterbach Kaserne", latitude: 49.2853, longitude: 10.5731, type: "usa" },
    { country: "Germany", baseName: "Vilseck-Rose Barracks", latitude: 49.6139, longitude: 11.8028, type: "usa" },
    { country: "Germany", baseName: "Baumholder", latitude: 49.6500, longitude: 7.3333, type: "usa" },

    // ===== JAPAN (Major US Pacific presence) =====
    { country: "Japan", baseName: "Kadena Air Base", latitude: 26.3516, longitude: 127.7692, type: "usa" },
    { country: "Japan", baseName: "MCAS Futenma", latitude: 26.2742, longitude: 127.7544, type: "usa" },
    { country: "Japan", baseName: "Yokota Air Base", latitude: 35.7485, longitude: 139.3487, type: "usa" },
    { country: "Japan", baseName: "Misawa Air Base", latitude: 40.7033, longitude: 141.3686, type: "usa" },
    { country: "Japan", baseName: "Camp Zama", latitude: 35.4778, longitude: 139.3944, type: "usa" },
    { country: "Japan", baseName: "Yokosuka Naval Base", latitude: 35.2878, longitude: 139.6500, type: "usa" },
    { country: "Japan", baseName: "Sasebo Naval Base", latitude: 33.1528, longitude: 129.7175, type: "usa" },
    { country: "Japan", baseName: "Camp Hansen", latitude: 26.4686, longitude: 127.8833, type: "usa" },
    { country: "Japan", baseName: "Camp Schwab", latitude: 26.5306, longitude: 128.0500, type: "usa" },
    { country: "Japan", baseName: "MCAS Iwakuni", latitude: 34.1444, longitude: 132.2358, type: "usa" },
    { country: "Japan", baseName: "White Beach Naval Facility", latitude: 26.2994, longitude: 127.8975, type: "usa" },
    { country: "Japan", baseName: "Torii Station", latitude: 26.3167, longitude: 127.7333, type: "usa" },

    // ===== SOUTH KOREA =====
    { country: "South Korea", baseName: "Camp Humphreys", latitude: 36.9631, longitude: 127.0311, type: "usa" },
    { country: "South Korea", baseName: "Osan Air Base", latitude: 37.0906, longitude: 127.0303, type: "usa" },
    { country: "South Korea", baseName: "Kunsan Air Base", latitude: 35.9039, longitude: 126.6158, type: "usa" },
    { country: "South Korea", baseName: "Camp Casey", latitude: 37.9178, longitude: 127.0542, type: "usa" },
    { country: "South Korea", baseName: "Camp Walker-Daegu", latitude: 35.8594, longitude: 128.5972, type: "usa" },
    { country: "South Korea", baseName: "Chinhae Naval Base", latitude: 35.1400, longitude: 128.6500, type: "usa" },

    // ===== ITALY =====
    { country: "Italy", baseName: "Aviano Air Base", latitude: 46.0319, longitude: 12.5965, type: "usa" },
    { country: "Italy", baseName: "NAS Sigonella", latitude: 37.4017, longitude: 14.9222, type: "usa" },
    { country: "Italy", baseName: "NSA Naples-Capodichino", latitude: 40.8831, longitude: 14.2908, type: "usa" },
    { country: "Italy", baseName: "Camp Ederle-Vicenza", latitude: 45.5156, longitude: 11.5517, type: "usa" },
    { country: "Italy", baseName: "NSA Gaeta", latitude: 41.2164, longitude: 13.5722, type: "usa" },
    { country: "Italy", baseName: "Camp Darby", latitude: 43.6333, longitude: 10.3500, type: "usa" },
    { country: "Italy", baseName: "NAS Capodichino", latitude: 40.8831, longitude: 14.2908, type: "nato" },

    // ===== UNITED KINGDOM =====
    { country: "United Kingdom", baseName: "RAF Lakenheath", latitude: 52.4093, longitude: 0.5610, type: "usa" },
    { country: "United Kingdom", baseName: "RAF Mildenhall", latitude: 52.3617, longitude: 0.4864, type: "usa" },
    { country: "United Kingdom", baseName: "RAF Fairford", latitude: 51.6828, longitude: -1.7900, type: "usa" },
    { country: "United Kingdom", baseName: "RAF Croughton", latitude: 51.9969, longitude: -1.2050, type: "usa" },
    { country: "United Kingdom", baseName: "RAF Alconbury", latitude: 52.3722, longitude: -0.2319, type: "usa" },
    { country: "United Kingdom", baseName: "RAF Menwith Hill", latitude: 54.0064, longitude: -1.6883, type: "usa" },
    { country: "United Kingdom", baseName: "RAF Welford", latitude: 51.4833, longitude: -1.3500, type: "usa" },

    // ===== SPAIN =====
    { country: "Spain", baseName: "Naval Station Rota", latitude: 36.6453, longitude: -6.3497, type: "usa" },
    { country: "Spain", baseName: "Morón Air Base", latitude: 37.1747, longitude: -5.6158, type: "usa" },

    // ===== TURKEY =====
    { country: "Turkey", baseName: "Incirlik Air Base", latitude: 37.0017, longitude: 35.4259, type: "usa" },
    { country: "Turkey", baseName: "Izmir Air Station", latitude: 38.4192, longitude: 27.1578, type: "nato" },
    { country: "Turkey", baseName: "Kürecik Radar Station", latitude: 37.8083, longitude: 37.5500, type: "nato" },

    // ===== MIDDLE EAST - QATAR =====
    { country: "Qatar", baseName: "Al Udeid Air Base", latitude: 25.1173, longitude: 51.3150, type: "usa" },
    { country: "Qatar", baseName: "Camp As Sayliyah", latitude: 25.3228, longitude: 51.4378, type: "usa" },

    // ===== MIDDLE EAST - KUWAIT =====
    { country: "Kuwait", baseName: "Camp Arifjan", latitude: 28.9347, longitude: 48.0917, type: "usa" },
    { country: "Kuwait", baseName: "Camp Buehring", latitude: 29.5500, longitude: 47.6833, type: "usa" },
    { country: "Kuwait", baseName: "Ahmad al-Jaber Air Base", latitude: 28.9336, longitude: 47.7908, type: "usa" },
    { country: "Kuwait", baseName: "Ali Al Salem Air Base", latitude: 29.3467, longitude: 47.5206, type: "usa" },

    // ===== MIDDLE EAST - UAE =====
    { country: "United Arab Emirates", baseName: "Al Dhafra Air Base", latitude: 24.2481, longitude: 54.5467, type: "usa" },
    { country: "United Arab Emirates", baseName: "Fujairah Naval Base", latitude: 25.1203, longitude: 56.3447, type: "usa" },

    // ===== MIDDLE EAST - BAHRAIN =====
    { country: "Bahrain", baseName: "NSA Bahrain", latitude: 26.2361, longitude: 50.6508, type: "usa" },
    { country: "Bahrain", baseName: "Isa Air Base", latitude: 25.9186, longitude: 50.5906, type: "usa" },

    // ===== MIDDLE EAST - SAUDI ARABIA =====
    { country: "Saudi Arabia", baseName: "Prince Sultan Air Base", latitude: 24.0625, longitude: 47.5803, type: "usa" },
    { country: "Saudi Arabia", baseName: "Eskan Village", latitude: 24.6958, longitude: 46.8192, type: "usa" },

    // ===== MIDDLE EAST - JORDAN =====
    { country: "Jordan", baseName: "Muwaffaq Salti Air Base", latitude: 32.3564, longitude: 36.7831, type: "usa" },

    // ===== MIDDLE EAST - IRAQ =====
    { country: "Iraq", baseName: "Al Asad Air Base", latitude: 33.7867, longitude: 42.4417, type: "usa" },
    { country: "Iraq", baseName: "Erbil Air Base", latitude: 36.2378, longitude: 43.9631, type: "usa" },
    { country: "Iraq", baseName: "Victory Base Complex", latitude: 33.2931, longitude: 44.2489, type: "usa" },

    // ===== AFRICA - DJIBOUTI =====
    { country: "Djibouti", baseName: "Camp Lemonnier", latitude: 11.5469, longitude: 43.1556, type: "usa" },
    { country: "Djibouti", baseName: "Chabelley Airfield", latitude: 11.5167, longitude: 43.0667, type: "usa" },

    // ===== AFRICA - WEST =====
    { country: "Niger", baseName: "Air Base 201-Agadez", latitude: 16.9667, longitude: 7.9833, type: "usa" },
    { country: "Niger", baseName: "Air Base 101-Niamey", latitude: 13.4817, longitude: 2.1833, type: "usa" },
    { country: "Ghana", baseName: "Accra Cooperative Security Location", latitude: 5.6052, longitude: -0.1668, type: "usa" },
    { country: "Senegal", baseName: "Dakar Cooperative Security Location", latitude: 14.7397, longitude: -17.4902, type: "usa" },
    { country: "Burkina Faso", baseName: "Ouagadougou Air Base", latitude: 12.3532, longitude: -1.5124, type: "usa" },
    { country: "Mali", baseName: "Bamako Senou Airport", latitude: 12.5335, longitude: -7.9499, type: "usa" },
    { country: "Cameroon", baseName: "Garoua Air Base", latitude: 9.3358, longitude: 13.3701, type: "usa" },
    { country: "Gabon", baseName: "Libreville Air Base", latitude: 0.4586, longitude: 9.4123, type: "usa" },
    { country: "Ivory Coast", baseName: "Abidjan Port Bouet", latitude: 5.2564, longitude: -3.9262, type: "usa" },

    // ===== AFRICA - EAST =====
    { country: "Kenya", baseName: "Camp Simba-Manda Bay", latitude: -2.2500, longitude: 40.9500, type: "usa" },
    { country: "Kenya", baseName: "Mombasa Port", latitude: -4.0435, longitude: 39.6682, type: "usa" },
    { country: "Somalia", baseName: "Baledogle Airfield", latitude: 2.7614, longitude: 45.2036, type: "usa" },
    { country: "Somalia", baseName: "Mogadishu Airport", latitude: 2.0144, longitude: 45.3047, type: "usa" },
    { country: "Uganda", baseName: "Entebbe Air Base", latitude: 0.0424, longitude: 32.4436, type: "usa" },
    { country: "Ethiopia", baseName: "Arba Minch Airport", latitude: 6.0394, longitude: 37.5905, type: "usa" },
    { country: "Ethiopia", baseName: "Camp Gilbert-Dire Dawa", latitude: 9.6047, longitude: 41.8544, type: "usa" },
    { country: "Eritrea", baseName: "Asmara", latitude: 15.2910, longitude: 38.9108, type: "usa" },
    { country: "South Sudan", baseName: "Juba Cooperative Security Location", latitude: 4.8722, longitude: 31.6011, type: "usa" },
    { country: "Rwanda", baseName: "Kigali Airport", latitude: -1.9686, longitude: 30.1395, type: "usa" },

    // ===== AFRICA - NORTH =====
    { country: "Egypt", baseName: "Cairo West Air Base", latitude: 30.1164, longitude: 30.9153, type: "usa" },
    { country: "Egypt", baseName: "Borg El Arab Airport", latitude: 30.9177, longitude: 29.6964, type: "usa" },
    { country: "Tunisia", baseName: "Sidi Ahmed Air Base", latitude: 37.2453, longitude: 9.7944, type: "usa" },
    { country: "Morocco", baseName: "Tan-Tan Air Base", latitude: 28.4482, longitude: -11.1613, type: "usa" },
    { country: "Libya", baseName: "Misrata Air Base", latitude: 32.3250, longitude: 15.0611, type: "usa" },

    // ===== AFRICA - CENTRAL =====
    { country: "Chad", baseName: "N'Djamena Air Base", latitude: 12.1337, longitude: 15.0340, type: "usa" },
    { country: "Central African Republic", baseName: "Bangui M'Poko Airport", latitude: 4.3985, longitude: 18.5188, type: "usa" },
    { country: "Democratic Republic of Congo", baseName: "Kinshasa N'djili Airport", latitude: -4.3858, longitude: 15.4446, type: "usa" },

    // ===== AFRICA - SOUTHERN =====
    { country: "Botswana", baseName: "Thebephatshwa Air Base", latitude: -24.1557, longitude: 25.2617, type: "usa" },
    { country: "South Africa", baseName: "Pretoria Cooperative Security Location", latitude: -25.7479, longitude: 28.1879, type: "usa" },

    // ===== UNITED STATES - ARMY =====
    { country: "United States", baseName: "Fort Liberty (Bragg)", latitude: 35.1400, longitude: -79.0064, type: "usa" },
    { country: "United States", baseName: "Fort Cavazos (Hood)", latitude: 31.1350, longitude: -97.7764, type: "usa" },
    { country: "United States", baseName: "Fort Campbell", latitude: 36.6678, longitude: -87.4747, type: "usa" },
    { country: "United States", baseName: "Fort Moore (Benning)", latitude: 32.3597, longitude: -84.9483, type: "usa" },
    { country: "United States", baseName: "Fort Carson", latitude: 38.7378, longitude: -104.7892, type: "usa" },
    { country: "United States", baseName: "Fort Riley", latitude: 39.0553, longitude: -96.7892, type: "usa" },
    { country: "United States", baseName: "Fort Drum", latitude: 44.0417, longitude: -75.7194, type: "usa" },
    { country: "United States", baseName: "Fort Stewart", latitude: 31.8722, longitude: -81.6097, type: "usa" },
    { country: "United States", baseName: "JBLM-Fort Lewis", latitude: 47.0853, longitude: -122.5800, type: "usa" },
    { country: "United States", baseName: "Fort Bliss", latitude: 31.8133, longitude: -106.4117, type: "usa" },
    { country: "United States", baseName: "Fort Sill", latitude: 34.6500, longitude: -98.4000, type: "usa" },
    { country: "United States", baseName: "Fort Irwin", latitude: 35.2628, longitude: -116.6833, type: "usa" },
    { country: "United States", baseName: "Fort Polk", latitude: 31.0456, longitude: -93.2158, type: "usa" },
    { country: "United States", baseName: "Fort Wainwright", latitude: 64.8289, longitude: -147.6411, type: "usa" },
    { country: "United States", baseName: "Fort Greely", latitude: 63.8833, longitude: -145.7333, type: "usa" },

    // ===== UNITED STATES - NAVY =====
    { country: "United States", baseName: "Naval Station Norfolk", latitude: 36.9461, longitude: -76.3033, type: "usa" },
    { country: "United States", baseName: "Naval Base San Diego", latitude: 32.6833, longitude: -117.1167, type: "usa" },
    { country: "United States", baseName: "Pearl Harbor-Hickam", latitude: 21.3528, longitude: -157.9500, type: "usa" },
    { country: "United States", baseName: "Naval Station Mayport", latitude: 30.3906, longitude: -81.4086, type: "usa" },
    { country: "United States", baseName: "Naval Base Kitsap", latitude: 47.5650, longitude: -122.6533, type: "usa" },
    { country: "United States", baseName: "Naval Station Great Lakes", latitude: 42.3044, longitude: -87.8500, type: "usa" },
    { country: "United States", baseName: "Naval Base Coronado", latitude: 32.6917, longitude: -117.1683, type: "usa" },
    { country: "United States", baseName: "Naval Submarine Base New London", latitude: 41.3883, longitude: -72.0900, type: "usa" },
    { country: "United States", baseName: "Naval Air Station Pensacola", latitude: 30.3500, longitude: -87.3167, type: "usa" },
    { country: "United States", baseName: "Naval Air Station Jacksonville", latitude: 30.2358, longitude: -81.6806, type: "usa" },
    { country: "United States", baseName: "Naval Station Newport", latitude: 41.5167, longitude: -71.3167, type: "usa" },
    { country: "United States", baseName: "Kings Bay Naval Submarine Base", latitude: 30.7994, longitude: -81.5144, type: "usa" },

    // ===== UNITED STATES - AIR FORCE =====
    { country: "United States", baseName: "Nellis AFB", latitude: 36.2361, longitude: -115.0344, type: "usa" },
    { country: "United States", baseName: "Edwards AFB", latitude: 34.9054, longitude: -117.8839, type: "usa" },
    { country: "United States", baseName: "Eglin AFB", latitude: 30.4833, longitude: -86.5333, type: "usa" },
    { country: "United States", baseName: "MacDill AFB", latitude: 27.8489, longitude: -82.5214, type: "usa" },
    { country: "United States", baseName: "Langley AFB", latitude: 37.0833, longitude: -76.3606, type: "usa" },
    { country: "United States", baseName: "Luke AFB", latitude: 33.5350, longitude: -112.3833, type: "usa" },
    { country: "United States", baseName: "Travis AFB", latitude: 38.2628, longitude: -121.9275, type: "usa" },
    { country: "United States", baseName: "Tinker AFB", latitude: 35.4147, longitude: -97.3867, type: "usa" },
    { country: "United States", baseName: "Wright-Patterson AFB", latitude: 39.8261, longitude: -84.0483, type: "usa" },
    { country: "United States", baseName: "Offutt AFB", latitude: 41.1183, longitude: -95.9125, type: "usa" },
    { country: "United States", baseName: "Barksdale AFB", latitude: 32.5017, longitude: -93.6628, type: "usa" },
    { country: "United States", baseName: "Whiteman AFB", latitude: 38.7317, longitude: -93.5478, type: "usa" },
    { country: "United States", baseName: "Dyess AFB", latitude: 32.4208, longitude: -99.8547, type: "usa" },
    { country: "United States", baseName: "Minot AFB", latitude: 48.4156, longitude: -101.3581, type: "usa" },
    { country: "United States", baseName: "Malmstrom AFB", latitude: 47.5067, longitude: -111.1831, type: "usa" },
    { country: "United States", baseName: "FE Warren AFB", latitude: 41.1456, longitude: -104.8614, type: "usa" },
    { country: "United States", baseName: "Peterson SFB", latitude: 38.8233, longitude: -104.7006, type: "usa" },
    { country: "United States", baseName: "Schriever SFB", latitude: 38.8094, longitude: -104.5281, type: "usa" },
    { country: "United States", baseName: "Vandenberg SFB", latitude: 34.7333, longitude: -120.5667, type: "usa" },
    { country: "United States", baseName: "Creech AFB", latitude: 36.5822, longitude: -115.6711, type: "usa" },
    { country: "United States", baseName: "Holloman AFB", latitude: 32.8525, longitude: -106.1061, type: "usa" },
    { country: "United States", baseName: "Davis-Monthan AFB", latitude: 32.1667, longitude: -110.8833, type: "usa" },
    { country: "United States", baseName: "Cannon AFB", latitude: 34.3828, longitude: -103.3222, type: "usa" },
    { country: "United States", baseName: "Eielson AFB", latitude: 64.6636, longitude: -147.1028, type: "usa" },
    { country: "United States", baseName: "Elmendorf-Richardson", latitude: 61.2500, longitude: -149.8067, type: "usa" },
    { country: "United States", baseName: "McConnell AFB", latitude: 37.6167, longitude: -97.2667, type: "usa" },
    { country: "United States", baseName: "Scott AFB", latitude: 38.5417, longitude: -89.8506, type: "usa" },

    // ===== UNITED STATES - MARINE CORPS =====
    { country: "United States", baseName: "Camp Pendleton", latitude: 33.3833, longitude: -117.5667, type: "usa" },
    { country: "United States", baseName: "Camp Lejeune", latitude: 34.6500, longitude: -77.3500, type: "usa" },
    { country: "United States", baseName: "MCAGCC Twentynine Palms", latitude: 34.2367, longitude: -116.0567, type: "usa" },
    { country: "United States", baseName: "MCB Quantico", latitude: 38.5222, longitude: -77.3050, type: "usa" },
    { country: "United States", baseName: "MCAS Miramar", latitude: 32.8683, longitude: -117.1433, type: "usa" },
    { country: "United States", baseName: "MCAS Cherry Point", latitude: 34.9008, longitude: -76.8806, type: "usa" },
    { country: "United States", baseName: "MCAS Beaufort", latitude: 32.4778, longitude: -80.7194, type: "usa" },
    { country: "United States", baseName: "MCAS Yuma", latitude: 32.6564, longitude: -114.6061, type: "usa" },
    { country: "United States", baseName: "MCRD Parris Island", latitude: 32.3333, longitude: -80.6833, type: "usa" },
    { country: "United States", baseName: "MCRD San Diego", latitude: 32.7414, longitude: -117.1992, type: "usa" },
    { country: "United States", baseName: "MCB Hawaii Kaneohe Bay", latitude: 21.4439, longitude: -157.7500, type: "usa" },

    // ===== ASIA - ADDITIONAL =====
    { country: "Thailand", baseName: "U-Tapao Airfield", latitude: 12.6799, longitude: 101.0050, type: "usa" },
    { country: "Thailand", baseName: "Korat Airfield", latitude: 14.9369, longitude: 102.0847, type: "usa" },
    { country: "Thailand", baseName: "Sattahip Naval Base", latitude: 12.6833, longitude: 100.8833, type: "usa" },
    { country: "Indonesia", baseName: "Biak Air Base", latitude: -1.1900, longitude: 136.1078, type: "usa" },
    { country: "Malaysia", baseName: "RMAF Butterworth", latitude: 5.4658, longitude: 100.3906, type: "usa" },
    { country: "Vietnam", baseName: "Da Nang Port (access)", latitude: 16.0544, longitude: 108.2022, type: "usa" },
    { country: "Vietnam", baseName: "Cam Ranh Bay (access)", latitude: 11.9983, longitude: 109.2194, type: "usa" },
    { country: "India", baseName: "Diego Garcia (joint)", latitude: -7.3133, longitude: 72.4111, type: "usa" },
    { country: "Palau", baseName: "Palau Compact Infrastructure", latitude: 7.5000, longitude: 134.6243, type: "usa" },
    { country: "Micronesia", baseName: "Pohnpei Cooperative Security", latitude: 6.9631, longitude: 158.2089, type: "usa" },
    { country: "Marshall Islands", baseName: "Kwajalein Atoll", latitude: 9.3944, longitude: 167.4708, type: "usa" },
    { country: "Wake Island", baseName: "Wake Island Airfield", latitude: 19.2822, longitude: 166.6472, type: "usa" },
    { country: "Taiwan", baseName: "AIT Taipei (de facto)", latitude: 25.0330, longitude: 121.5654, type: "usa" },
    { country: "Brunei", baseName: "Muara Naval Base (training)", latitude: 5.0117, longitude: 115.0669, type: "usa" },
    { country: "Bangladesh", baseName: "Dhaka Cooperative Security", latitude: 23.8433, longitude: 90.4006, type: "usa" },
    { country: "Mongolia", baseName: "Five Hills Training Center", latitude: 47.9200, longitude: 106.9200, type: "usa" },

    // ===== PACIFIC - GUAM =====
    { country: "Guam", baseName: "Andersen Air Force Base", latitude: 13.5839, longitude: 144.9244, type: "usa" },
    { country: "Guam", baseName: "Naval Base Guam", latitude: 13.4443, longitude: 144.6528, type: "usa" },
    { country: "Guam", baseName: "Camp Blaz", latitude: 13.5122, longitude: 144.8697, type: "usa" },

    // ===== PACIFIC - DIEGO GARCIA =====
    { country: "Diego Garcia", baseName: "Naval Support Facility Diego Garcia", latitude: -7.3133, longitude: 72.4111, type: "usa" },

    // ===== PACIFIC - AUSTRALIA =====
    { country: "Australia", baseName: "Pine Gap", latitude: -23.7990, longitude: 133.7370, type: "usa" },
    { country: "Australia", baseName: "RAAF Darwin", latitude: -12.4147, longitude: 130.8769, type: "usa" },
    { country: "Australia", baseName: "HMAS Stirling", latitude: -32.2333, longitude: 115.6667, type: "usa" },
    { country: "Australia", baseName: "Robertson Barracks-Darwin", latitude: -12.4631, longitude: 130.8408, type: "usa" },
    { country: "Australia", baseName: "RAAF Tindal", latitude: -14.5214, longitude: 132.3781, type: "usa" },

    // ===== PACIFIC - PHILIPPINES =====
    { country: "Philippines", baseName: "Clark Air Base", latitude: 15.1858, longitude: 120.5600, type: "usa" },
    { country: "Philippines", baseName: "Subic Bay", latitude: 14.7944, longitude: 120.2778, type: "usa" },
    { country: "Philippines", baseName: "Basa Air Base", latitude: 14.9864, longitude: 120.4903, type: "usa" },
    { country: "Philippines", baseName: "Fort Magsaysay", latitude: 15.4694, longitude: 121.1667, type: "usa" },
    { country: "Philippines", baseName: "Antonio Bautista Air Base-Palawan", latitude: 9.7422, longitude: 118.7589, type: "usa" },
    { country: "Philippines", baseName: "Lumbia Air Base-Cagayan de Oro", latitude: 8.4150, longitude: 124.6119, type: "usa" },
    { country: "Philippines", baseName: "Benito Ebuen Air Base-Cebu", latitude: 10.3067, longitude: 123.9792, type: "usa" },
    { country: "Philippines", baseName: "Cesar Basa Air Base-Pampanga", latitude: 14.9864, longitude: 120.4903, type: "usa" },
    { country: "Philippines", baseName: "Lal-Lo Airport-Cagayan", latitude: 18.1208, longitude: 121.7422, type: "usa" },

    // ===== PACIFIC - SINGAPORE =====
    { country: "Singapore", baseName: "Sembawang Wharves", latitude: 1.4419, longitude: 103.8200, type: "usa" },
    { country: "Singapore", baseName: "Paya Lebar Air Base", latitude: 1.3603, longitude: 103.9097, type: "usa" },

    // ===== CENTRAL/SOUTH AMERICA =====
    { country: "Cuba", baseName: "Guantanamo Bay Naval Base", latitude: 19.9025, longitude: -75.0969, type: "usa" },
    { country: "Honduras", baseName: "Soto Cano Air Base", latitude: 14.3822, longitude: -87.6211, type: "usa" },
    { country: "El Salvador", baseName: "Comalapa Air Base", latitude: 13.4408, longitude: -89.0572, type: "usa" },

    // ===== ARCTIC =====
    { country: "Greenland", baseName: "Thule Air Base", latitude: 76.5312, longitude: -68.7031, type: "usa" },
    { country: "Iceland", baseName: "Keflavik Air Base", latitude: 63.9850, longitude: -22.6056, type: "nato" },

    // ===== NATO - POLAND =====
    { country: "Poland", baseName: "Redzikowo Aegis Ashore", latitude: 54.4791, longitude: 17.0975, type: "nato" },
    { country: "Poland", baseName: "Lask Air Base", latitude: 51.5511, longitude: 19.1792, type: "nato" },
    { country: "Poland", baseName: "Poznań-Krzesiny Air Base", latitude: 52.3314, longitude: 16.9664, type: "nato" },
    { country: "Poland", baseName: "Powidz Air Base", latitude: 52.3794, longitude: 17.8539, type: "nato" },
    { country: "Poland", baseName: "Camp Kosciuszko-Poznań", latitude: 52.4064, longitude: 16.9252, type: "usa" },

    // ===== NATO - ROMANIA =====
    { country: "Romania", baseName: "Mihail Kogălniceanu Air Base", latitude: 44.3622, longitude: 28.4883, type: "nato" },
    { country: "Romania", baseName: "Deveselu Aegis Ashore", latitude: 44.0787, longitude: 24.4134, type: "usa" },
    { country: "Romania", baseName: "Câmpia Turzii Air Base", latitude: 46.5028, longitude: 23.8861, type: "nato" },

    // ===== NATO - BULGARIA =====
    { country: "Bulgaria", baseName: "Novo Selo Training Area", latitude: 42.0167, longitude: 26.1333, type: "nato" },
    { country: "Bulgaria", baseName: "Graf Ignatievo Air Base", latitude: 42.2904, longitude: 24.7140, type: "nato" },
    { country: "Bulgaria", baseName: "Bezmer Air Base", latitude: 42.4547, longitude: 26.3522, type: "nato" },

    // ===== NATO - GREECE =====
    { country: "Greece", baseName: "Souda Bay Naval Base", latitude: 35.5317, longitude: 24.1217, type: "nato" },
    { country: "Greece", baseName: "Larissa Air Base", latitude: 39.6500, longitude: 22.4447, type: "nato" },
    { country: "Greece", baseName: "Araxos Air Base", latitude: 38.1508, longitude: 21.4239, type: "nato" },
    { country: "Greece", baseName: "Alexandroupolis Port", latitude: 40.8489, longitude: 25.8756, type: "nato" },

    // ===== NATO - BALTIC STATES =====
    { country: "Estonia", baseName: "Ämari Air Base", latitude: 59.2603, longitude: 24.2086, type: "nato" },
    { country: "Estonia", baseName: "Tapa Army Base", latitude: 59.2711, longitude: 25.9444, type: "nato" },
    { country: "Latvia", baseName: "Lielvārde Air Base", latitude: 56.7761, longitude: 24.8536, type: "nato" },
    { country: "Latvia", baseName: "Ādaži Military Base", latitude: 57.0750, longitude: 24.3167, type: "nato" },
    { country: "Lithuania", baseName: "Šiauliai Air Base", latitude: 55.8939, longitude: 23.3950, type: "nato" },
    { country: "Lithuania", baseName: "Rukla", latitude: 55.0653, longitude: 24.1992, type: "nato" },

    // ===== NATO - NORWAY =====
    { country: "Norway", baseName: "Rygge Air Station", latitude: 59.3783, longitude: 10.7850, type: "nato" },
    { country: "Norway", baseName: "Ørland Air Base", latitude: 63.6992, longitude: 9.6050, type: "nato" },
    { country: "Norway", baseName: "Evenes Air Station", latitude: 68.4914, longitude: 16.6781, type: "nato" },
    { country: "Norway", baseName: "Bardufoss Air Station", latitude: 69.0578, longitude: 18.5403, type: "nato" },
    { country: "Norway", baseName: "Sola Air Station", latitude: 58.8756, longitude: 5.6386, type: "nato" },

    // ===== NATO - FINLAND (new member) =====
    { country: "Finland", baseName: "Rovaniemi Air Base", latitude: 66.5639, longitude: 25.8306, type: "nato" },
    { country: "Finland", baseName: "Kuopio-Rissala Air Base", latitude: 63.0467, longitude: 27.7978, type: "nato" },

    // ===== NATO - SWEDEN (new member) =====
    { country: "Sweden", baseName: "Gotland", latitude: 57.4667, longitude: 18.4833, type: "nato" },
    { country: "Sweden", baseName: "Luleå-Kallax Air Base", latitude: 65.5436, longitude: 22.1219, type: "nato" },

    // ===== NATO HQ & COMMAND =====
    { country: "Belgium", baseName: "NATO HQ Brussels", latitude: 50.8770, longitude: 4.4260, type: "nato" },
    { country: "Belgium", baseName: "SHAPE Mons", latitude: 50.5030, longitude: 3.9310, type: "nato" },
    { country: "Belgium", baseName: "Kleine Brogel Air Base", latitude: 51.1683, longitude: 5.4700, type: "nato" },
    { country: "Netherlands", baseName: "JFC Brunssum", latitude: 50.9469, longitude: 5.9772, type: "nato" },
    { country: "Netherlands", baseName: "Volkel Air Base", latitude: 51.6564, longitude: 5.7078, type: "nato" },

    // ===== NATO - HUNGARY =====
    { country: "Hungary", baseName: "Pápa Air Base", latitude: 47.3636, longitude: 17.5008, type: "nato" },
    { country: "Hungary", baseName: "Taszár Air Base", latitude: 46.3933, longitude: 17.9175, type: "nato" },

    // ===== NATO - CZECH REPUBLIC =====
    { country: "Czech Republic", baseName: "Náměšť nad Oslavou Air Base", latitude: 49.1658, longitude: 16.1247, type: "nato" },

    // ===== NATO - SLOVAKIA =====
    { country: "Slovakia", baseName: "Sliač Air Base", latitude: 48.6380, longitude: 19.1340, type: "nato" },

    // ===== NATO - CROATIA =====
    { country: "Croatia", baseName: "Pleso Air Base-Zagreb", latitude: 45.7427, longitude: 16.0686, type: "nato" },

    // ===== NATO - PORTUGAL =====
    { country: "Portugal", baseName: "Lajes Field-Azores", latitude: 38.7617, longitude: -27.0908, type: "usa" },

    // ===== NATO - KOSOVO =====
    { country: "Kosovo", baseName: "Camp Bondsteel", latitude: 42.3600, longitude: 21.2500, type: "nato" },

    // ===== NATO - ALBANIA =====
    { country: "Albania", baseName: "Kuçova Air Base", latitude: 40.7719, longitude: 19.9017, type: "nato" },

    // ===== NATO - MONTENEGRO =====
    { country: "Montenegro", baseName: "Golubovci Air Base", latitude: 42.3594, longitude: 19.2519, type: "nato" },

    // ===== NATO - NORTH MACEDONIA =====
    { country: "North Macedonia", baseName: "Petrovec Airport", latitude: 41.9617, longitude: 21.6214, type: "nato" },

    // ===== NATO - DENMARK =====
    { country: "Denmark", baseName: "Thule Air Base", latitude: 76.5312, longitude: -68.7031, type: "usa" },
    { country: "Denmark", baseName: "Fighter Wing Skrydstrup", latitude: 55.2258, longitude: 9.2639, type: "nato" },

    // ===== NATO - CANADA =====
    { country: "Canada", baseName: "CFB Trenton", latitude: 44.1189, longitude: -77.5281, type: "nato" },
    { country: "Canada", baseName: "CFB Esquimalt", latitude: 48.4331, longitude: -123.4147, type: "nato" },
    { country: "Canada", baseName: "CFB Cold Lake", latitude: 54.4050, longitude: -110.2778, type: "nato" },
    { country: "Canada", baseName: "CFB Bagotville", latitude: 48.3311, longitude: -70.9969, type: "nato" },
  ];
}

export async function getCountryConflicts(
  country: string,
  options?: EntityOptions
): Promise<{ past: ConflictResult; current: ConflictResult }> {
  const pastQuery = `List all major historical wars, conflicts, and military engagements that ${country} has been involved in throughout history (excluding any ongoing conflicts). Include the dates, opposing parties, and brief outcomes for each conflict. Focus on conflicts that have ended.`;
  const currentQuery = `List all current, ongoing, or brewing conflicts, wars, military tensions, and security threats involving ${country} as of 2025-2026. Include active military operations, border disputes, civil unrest, terrorism threats, and geopolitical tensions. If there are no current conflicts, state that clearly.`;

  type AnswerResponse = {
    contents?: string;
    search_results?: Array<{ title?: string; url?: string }>;
  };

  // Use OAuth proxy if accessToken is provided
  if (options?.accessToken) {
    const [pastResult, currentResult] = await Promise.all([
      callViaProxy("/v1/answer", { query: pastQuery, excluded_sources: ["wikipedia.org"] }, options.accessToken),
      callViaProxy("/v1/answer", { query: currentQuery, excluded_sources: ["wikipedia.org"] }, options.accessToken),
    ]);

    const pastData = pastResult.success ? pastResult.data : {};
    const currentData = currentResult.success ? currentResult.data : {};

    return {
      past: {
        answer: pastData.contents || "No historical conflict information found.",
        sources: (pastData.search_results || []).map((s: { title?: string; url?: string }) => ({
          title: s.title || "Source",
          url: s.url || "",
        })),
      },
      current: {
        answer: currentData.contents || "No current conflict information found.",
        sources: (currentData.search_results || []).map((s: { title?: string; url?: string }) => ({
          title: s.title || "Source",
          url: s.url || "",
        })),
      },
    };
  }

  // Self-hosted mode: use SDK directly with retry
  const valyu = getValyuClient();

  const [pastResponse, currentResponse] = await Promise.all([
    withRetry(() => valyu.answer(pastQuery, { excludedSources: ["wikipedia.org"] }), { label: "Country conflicts (past)" }),
    withRetry(() => valyu.answer(currentQuery, { excludedSources: ["wikipedia.org"] }), { label: "Country conflicts (current)" }),
  ]);

  const pastData = pastResponse as AnswerResponse;
  const currentData = currentResponse as AnswerResponse;

  // Check for API errors (e.g., insufficient credits)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pastError = (pastData as any).success === false ? (pastData as any).error : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentError = (currentData as any).success === false ? (currentData as any).error : null;

  if (pastError && currentError) {
    throw new Error(`Valyu API error: ${pastError}`);
  }

  return {
    past: {
      answer: pastError
        ? `Unable to fetch historical conflicts: ${pastError}`
        : pastData.contents || "No historical conflict information found.",
      sources: pastError ? [] : (pastData.search_results || []).map((s) => ({
        title: s.title || "Source",
        url: s.url || "",
      })),
    },
    current: {
      answer: currentError
        ? `Unable to fetch current conflicts: ${currentError}`
        : currentData.contents || "No current conflict information found.",
      sources: currentError ? [] : (currentData.search_results || []).map((s) => ({
        title: s.title || "Source",
        url: s.url || "",
      })),
    },
  };
}

export type ConflictStreamChunk = {
  type: "current_content" | "current_sources" | "past_content" | "past_sources" | "done" | "error";
  content?: string;
  sources?: Array<{ title: string; url: string }>;
  error?: string;
};

export async function* streamCountryConflicts(
  country: string,
  options?: EntityOptions
): AsyncGenerator<ConflictStreamChunk> {
  const currentQuery = `List all current, ongoing, or brewing conflicts, wars, military tensions, and security threats involving ${country} as of 2024-2026. Include active military operations, border disputes, civil unrest, terrorism threats, and geopolitical tensions. If there are no current conflicts, state that clearly.`;

  const pastQuery = `List all major historical wars, conflicts, and military engagements that ${country} has been involved in throughout history (excluding any ongoing conflicts). Include the dates, opposing parties, and brief outcomes for each conflict. Focus on conflicts that have ended.`;

  // Use OAuth proxy if accessToken is provided (non-streaming)
  if (options?.accessToken) {
    try {
      // Current conflicts via proxy
      const currentResult = await callViaProxy(
        "/v1/answer",
        { query: currentQuery, excluded_sources: ["wikipedia.org"] },
        options.accessToken
      );

      if (currentResult.success && currentResult.data) {
        if (currentResult.data.contents) {
          yield { type: "current_content", content: currentResult.data.contents };
        }
        if (currentResult.data.search_results) {
          yield {
            type: "current_sources",
            sources: currentResult.data.search_results.map((s: { title?: string; url?: string }) => ({
              title: s.title || "Source",
              url: s.url || "",
            })),
          };
        }
      }

      // Past conflicts via proxy
      const pastResult = await callViaProxy(
        "/v1/answer",
        { query: pastQuery, excluded_sources: ["wikipedia.org"] },
        options.accessToken
      );

      if (pastResult.success && pastResult.data) {
        if (pastResult.data.contents) {
          yield { type: "past_content", content: pastResult.data.contents };
        }
        if (pastResult.data.search_results) {
          yield {
            type: "past_sources",
            sources: pastResult.data.search_results.map((s: { title?: string; url?: string }) => ({
              title: s.title || "Source",
              url: s.url || "",
            })),
          };
        }
      }

      yield { type: "done" };
    } catch (error) {
      yield {
        type: "error",
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
    return;
  }

  // Self-hosted mode: use SDK with streaming (with retry on initial call)
  const valyu = getValyuClient();

  try {
    const currentStream = await withRetry(
      () => valyu.answer(currentQuery, { excludedSources: ["wikipedia.org"], streaming: true }),
      { label: "Stream conflicts (current)" }
    );

    // Check if the SDK returned an error instead of a stream
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentObj = currentStream as any;
    if (currentObj && currentObj.success === false) {
      yield {
        type: "error",
        error: currentObj.error || "Valyu API error (current conflicts)",
      };
      return;
    }

    if (Symbol.asyncIterator in (currentStream as object)) {
      for await (const chunk of currentStream as AsyncGenerator<{
        type: string;
        content?: string;
        search_results?: Array<{ title?: string; url?: string }>;
      }>) {
        if (chunk.type === "content" && chunk.content) {
          yield { type: "current_content", content: chunk.content };
        } else if (chunk.type === "search_results" && chunk.search_results) {
          yield {
            type: "current_sources",
            sources: chunk.search_results.map((s) => ({
              title: s.title || "Source",
              url: s.url || "",
            })),
          };
        }
      }
    }

    const pastStream = await withRetry(
      () => valyu.answer(pastQuery, { excludedSources: ["wikipedia.org"], streaming: true }),
      { label: "Stream conflicts (past)" }
    );

    // Check for error on past query too
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pastObj = pastStream as any;
    if (pastObj && pastObj.success === false) {
      yield {
        type: "error",
        error: pastObj.error || "Valyu API error (past conflicts)",
      };
      return;
    }

    if (Symbol.asyncIterator in (pastStream as object)) {
      for await (const chunk of pastStream as AsyncGenerator<{
        type: string;
        content?: string;
        search_results?: Array<{ title?: string; url?: string }>;
      }>) {
        if (chunk.type === "content" && chunk.content) {
          yield { type: "past_content", content: chunk.content };
        } else if (chunk.type === "search_results" && chunk.search_results) {
          yield {
            type: "past_sources",
            sources: chunk.search_results.map((s) => ({
              title: s.title || "Source",
              url: s.url || "",
            })),
          };
        }
      }
    }

    yield { type: "done" };
  } catch (error) {
    yield {
      type: "error",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
