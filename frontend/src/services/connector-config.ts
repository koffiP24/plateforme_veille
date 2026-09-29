export function buildConnectorConfig(
  type: string,
  url: string,
  query = "",
): Record<string, unknown> {
  if (type === "IMPORT_MANUEL") return {};
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new Error(
      "Renseignez une URL complète et valide pour le connecteur.",
    );
  }
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error("Utilisez une URL HTTP ou HTTPS sans identifiants.");
  }
  if (type === "RSS" || type === "ATOM") {
    return {
      feedUrl: parsed.href,

      query: query.trim(),
    };
  }
  if (type === "API") {
    if (parsed.hostname.toLowerCase() === "api.crossref.org") {
      if (
        parsed.protocol !== "https:" ||
        !/^\/(?:v1\/)?(?:$|works\/?$|(?:journals|members|funders|prefixes|types)\/[^/]+\/works\/?$)/.test(parsed.pathname) ||
        parsed.hash
      ) {
        throw new Error("Utilisez une URL HTTPS de recherche Crossref, par exemple https://api.crossref.org/works.");
      }
      return { provider: "CROSSREF", baseUrl: parsed.href, query: query.trim(), rows: 10 };
    }
    if (parsed.hash) throw new Error("Retirez le fragment (#...) de l’adresse API.");
    return { provider: "JSON_FEED", feedUrl: parsed.href, query: query.trim() };
  }
  throw new Error("Ce type de connecteur n’est pas encore disponible.");
}
