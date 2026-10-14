#!/usr/bin/env node
/**
 * security-agent â€” Agent de test de vulnÃ©rabilitÃ©s (non destructif)
 * ------------------------------------------------------------------
 * Script autonome, sans dÃ©pendance (Node.js >= 18, fetch natif).
 * Rejoue une batterie de contrÃ´les de sÃ©curitÃ© applicative contre une
 * API que VOUS possÃ©dez ou Ãªtes autorisÃ© Ã  tester, et produit un
 * rapport classÃ© par sÃ©vÃ©ritÃ© + un code de sortie exploitable en CI.
 *
 * Usage :
 *   node security-agent.mjs --config security-agent.config.json
 *   node security-agent.mjs --config ... --json rapport.json
 *   node security-agent.mjs --config ... --write   (active les tests d'Ã©criture)
 *
 * N'exÃ©cute aucune action destructive (aucun DELETE). Les tests
 * d'Ã©criture (mass-assignment) sont dÃ©sactivÃ©s par dÃ©faut, visent des
 * identifiants bidon et n'Ã©crivent jamais dans un autre Ã©tablissement.
 *
 * âš ï¸  N'exÃ©cutez CET AGENT QUE sur des systÃ¨mes qui vous appartiennent
 *     ou pour lesquels vous avez une autorisation Ã©crite de test.
 */

import { readFileSync, writeFileSync } from "node:fs";

// ---------------------------------------------------------------------------
// Niveaux de sÃ©vÃ©ritÃ© (ordre croissant de gravitÃ©)
// ---------------------------------------------------------------------------
const SEV = { pass: 0, info: 1, low: 2, medium: 3, high: 4, critical: 5 };
const SEV_LABEL = {
  pass: "OK", info: "INFO", low: "FAIBLE",
  medium: "MOYEN", high: "Ã‰LEVÃ‰", critical: "CRITIQUE",
};
const COLOR = {
  pass: "\x1b[32m", info: "\x1b[36m", low: "\x1b[33m",
  medium: "\x1b[33m", high: "\x1b[31m", critical: "\x1b[41m\x1b[37m",
  reset: "\x1b[0m", dim: "\x1b[2m", bold: "\x1b[1m",
};

// ---------------------------------------------------------------------------
// Collecteur de rÃ©sultats
// ---------------------------------------------------------------------------
class Report {
  constructor() { this.findings = []; }
  add(severity, check, title, detail, recommendation) {
    this.findings.push({ severity, check, title, detail, recommendation: recommendation || null });
  }
  pass(check, title, detail) { this.add("pass", check, title, detail); }
  get worst() {
    return this.findings.reduce((m, f) => Math.max(m, SEV[f.severity] ?? 0), 0);
  }
  counts() {
    const c = {};
    for (const k of Object.keys(SEV)) c[k] = 0;
    for (const f of this.findings) c[f.severity]++;
    return c;
  }
}

// ---------------------------------------------------------------------------
// Client HTTP (sans dÃ©pendance)
// ---------------------------------------------------------------------------
async function http(cfg, path, { method = "GET", headers = {}, body, auth = false, timeoutMs = 15000 } = {}) {
  const url = path.startsWith("http") ? path : cfg.baseUrl.replace(/\/$/, "") + path;
  const h = { Accept: "application/json", ...headers };
  if (auth && cfg.auth && cfg.auth.token) {
    const name = cfg.auth.header || "Authorization";
    const scheme = cfg.auth.scheme === "" ? "" : (cfg.auth.scheme || "Bearer") + " ";
    h[name] = scheme + cfg.auth.token;
  }
  if (body !== undefined && !h["Content-Type"]) h["Content-Type"] = "application/json";
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method, headers: h,
      body: body === undefined ? undefined : (typeof body === "string" ? body : JSON.stringify(body)),
      redirect: "manual", signal: ctrl.signal,
    });
    const text = await res.text().catch(() => "");
    const rh = {};
    res.headers.forEach((v, k) => (rh[k] = v));
    let json = null;
    try { json = JSON.parse(text); } catch { /* not json */ }
    return { ok: true, status: res.status, headers: rh, body: text, json, ms: Date.now() - started };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e), ms: Date.now() - started };
  } finally {
    clearTimeout(t);
  }
}

// ---------------------------------------------------------------------------
// ContrÃ´les
// ---------------------------------------------------------------------------

/** En-tÃªtes de sÃ©curitÃ© sur une page/endpoint public. */
async function checkSecurityHeaders(cfg, report) {
  const path = cfg.publicPath || "/";
  const r = await http(cfg, path);
  if (!r.ok) { report.add("info", "headers", "En-tÃªtes non mesurables", `RequÃªte vers ${path} Ã©chouÃ©e : ${r.error}`); return; }
  const h = r.headers;

  // Note tunnel / reverse-proxy
  const via = h["via"] || h["x-served-by"] || "";
  if (/tunnel|caddy|cloudflare|vercel/i.test(via)) {
    report.add("info", "headers", "Trafic derriÃ¨re un proxy/tunnel",
      `En-tÃªtes potentiellement injectÃ©s par l'infrastructure (${via}). VÃ©rifiez la config rÃ©elle de production.`);
  }

  const want = {
    "strict-transport-security": ["high", "HSTS absent", "Ajoutez `Strict-Transport-Security: max-age=31536000; includeSubDomains`."],
    "content-security-policy": ["medium", "CSP absente", "DÃ©finissez une CSP restrictive (`default-src 'self'`, `object-src 'none'`)."],
    "x-content-type-options": ["low", "X-Content-Type-Options absent", "Ajoutez `X-Content-Type-Options: nosniff`."],
    "x-frame-options": ["low", "Protection clickjacking absente", "Ajoutez `X-Frame-Options: SAMEORIGIN` ou `frame-ancestors` en CSP."],
    "referrer-policy": ["low", "Referrer-Policy absent", "Ajoutez `Referrer-Policy: strict-origin-when-cross-origin`."],
  };
  for (const [name, [sev, title, rec]] of Object.entries(want)) {
    if (h[name]) {
      report.pass("headers", `${name} prÃ©sent`, h[name].slice(0, 80));
      if (name === "strict-transport-security" && !/includesubdomains/i.test(h[name])) {
        report.add("info", "headers", "HSTS sans includeSubDomains", h[name], "Ajoutez `includeSubDomains` (et envisagez `preload`).");
      }
      if (name === "content-security-policy" && /unsafe-inline|unsafe-eval/i.test(h[name])) {
        report.add("low", "headers", "CSP permissive (unsafe-inline/eval)", h[name].slice(0, 120),
          "Migrez vers une CSP Ã  base de nonce pour retirer `unsafe-inline`/`unsafe-eval`.");
      }
    } else {
      report.add(sev, "headers", title, `En-tÃªte manquant sur ${path}.`, rec);
    }
  }
}

/** CORS : dÃ©tection d'une origine joker. */
async function checkCors(cfg, report) {
  const path = (cfg.protectedEndpoints && cfg.protectedEndpoints[0]) || cfg.publicPath || "/";
  const r = await http(cfg, path, { headers: { Origin: "https://evil.example.com" }, auth: true });
  if (!r.ok) return;
  const acao = r.headers["access-control-allow-origin"];
  const acac = r.headers["access-control-allow-credentials"];
  if (acao === "*") {
    if (acac === "true") {
      report.add("high", "cors", "CORS joker + credentials",
        "`Access-Control-Allow-Origin: *` combinÃ© Ã  `Access-Control-Allow-Credentials: true`.",
        "Interdit par les navigateurs mais rÃ©vÃ¨le une mauvaise config : fixez une origine prÃ©cise.");
    } else {
      report.add("medium", "cors", "CORS trop permissive",
        "`Access-Control-Allow-Origin: *` : toute page web peut appeler l'API depuis le navigateur d'un visiteur.",
        "Restreignez l'origine autorisÃ©e Ã  celle de votre application.");
    }
  } else if (acao && acao.includes("evil.example.com")) {
    report.add("high", "cors", "CORS reflÃ¨te l'origine arbitraire",
      `L'API renvoie \`Access-Control-Allow-Origin: ${acao}\` pour une origine non fiable.`,
      "N'autorisez qu'une liste blanche d'origines, jamais le reflet de l'en-tÃªte Origin.");
  } else {
    report.pass("cors", "CORS restreinte", acao || "(pas d'en-tÃªte CORS)");
  }
}

/** Drapeaux des cookies de session. */
async function checkCookies(cfg, report) {
  if (!cfg.login || !cfg.login.url) {
    report.add("info", "cookies", "Contrôle des cookies ignoré", "Aucune route de connexion n’est configurée ; les cookies de session ne sont pas vérifiés avec de faux identifiants.");
    return;
  }
  const path = cfg.login.url;
  const r = await http(cfg, path, { method: cfg.login.method || "POST",
    body: cfg.login.badCredentials || {} });
  const sc = r.headers["set-cookie"];
  if (!sc) { report.add("info", "cookies", "Aucun cookie posÃ©", "Auth probablement par jeton (en-tÃªte). VÃ©rifiez son stockage cÃ´tÃ© client (Ã©viter localStorage)."); return; }
  const flags = sc.toLowerCase();
  if (!flags.includes("httponly")) report.add("medium", "cookies", "Cookie sans HttpOnly", sc.slice(0, 80), "Ajoutez `HttpOnly` pour bloquer la lecture par JavaScript (anti-XSS).");
  else report.pass("cookies", "Cookie HttpOnly", "ok");
  if (!flags.includes("secure")) report.add("medium", "cookies", "Cookie sans Secure", sc.slice(0, 80), "Ajoutez `Secure` pour n'envoyer le cookie qu'en HTTPS.");
  if (!flags.includes("samesite")) report.add("low", "cookies", "Cookie sans SameSite", sc.slice(0, 80), "Ajoutez `SameSite=Lax` ou `Strict` (anti-CSRF).");
}

/** Les endpoints protÃ©gÃ©s doivent renvoyer 401 sans jeton (jamais 200/500). */
async function checkAuthRequired(cfg, report) {
  for (const path of cfg.protectedEndpoints || []) {
    const r = await http(cfg, path);
    if (!r.ok) { report.add("info", "auth", `Endpoint injoignable : ${path}`, r.error); continue; }
    if (r.status === 401 || r.status === 403) {
      report.pass("auth", `ProtÃ©gÃ© : ${path}`, `${r.status} sans jeton`);
    } else if (r.status >= 500) {
      report.add("medium", "auth", `500 au lieu de 401 : ${path}`,
        `Une requÃªte non authentifiÃ©e renvoie ${r.status}.`,
        "Le middleware d'authentification doit s'exÃ©cuter en premier et renvoyer 401, jamais une exception 500.");
    } else if (r.status >= 200 && r.status < 300) {
      report.add("critical", "auth", `DonnÃ©es exposÃ©es sans authentification : ${path}`,
        `Status ${r.status} SANS jeton â€” l'endpoint renvoie potentiellement des donnÃ©es.`,
        "Exigez une authentification valide sur cet endpoint de toute urgence.");
    } else {
      report.add("info", "auth", `${path} â†’ ${r.status} sans jeton`, r.body.slice(0, 80));
    }
  }
}

/** Connexion : Ã©numÃ©ration d'utilisateurs + limitation de dÃ©bit. */
async function checkLogin(cfg, report) {
  if (!cfg.login || !cfg.login.url) return;
  const url = cfg.login.url, method = cfg.login.method || "POST";

  // Message d'erreur gÃ©nÃ©rique ?
  const bad = await http(cfg, url, { method, body: cfg.login.badCredentials || { email: "nonexistent@example.invalid", password: "x" } });
  if (bad.ok) {
    const msg = (bad.json && (bad.json.message || JSON.stringify(bad.json))) || bad.body.slice(0, 120);
    if (/no\s*such|introuvable|not\s*found|unknown user|utilisateur.*existe/i.test(msg)) {
      report.add("medium", "login", "Ã‰numÃ©ration d'utilisateurs possible",
        `Le message distingue un utilisateur inexistant : Â« ${msg.slice(0, 80)} Â»`,
        "Renvoyez un message gÃ©nÃ©rique identique pour e-mail inconnu et mauvais mot de passe.");
    } else {
      report.pass("login", "Message d'erreur gÃ©nÃ©rique", msg.slice(0, 60));
    }
  }

  // Limitation de dÃ©bit
  const attempts = cfg.login.rateLimitAttempts || 8;
  let got429 = false, firstBlock = null;
  for (let i = 0; i < attempts; i++) {
    const r = await http(cfg, url, { method, body: { ...(cfg.login.badCredentials || { email: "bruteforce@example.invalid" }), password: "wrong" + i } });
    if (r.ok && r.status === 429) { got429 = true; firstBlock = i + 1; break; }
  }
  if (got429) report.pass("login", "Limitation de dÃ©bit active", `429 aprÃ¨s ${firstBlock} tentatives`);
  else report.add("medium", "login", "Pas de limitation de dÃ©bit dÃ©tectÃ©e",
    `${attempts} tentatives Ã©chouÃ©es sans blocage (429).`,
    "Ajoutez un throttling sur la connexion (ex. 5 tentatives/minute) contre la force brute.");
}

/** IDOR / cloisonnement : ressources propres = accessibles, Ã©trangÃ¨res = refusÃ©es. */
async function checkIdor(cfg, report) {
  for (const own of cfg.ownResources || []) {
    const r = await http(cfg, own.url || own, { auth: true });
    if (r.ok && r.status >= 200 && r.status < 300) report.pass("idor", `Ressource propre accessible : ${own.url || own}`, `${r.status}`);
    else report.add("info", "idor", `Ressource propre inattendue : ${own.url || own}`, `Status ${r.status || r.error} (attendu 2xx)`);
  }
  for (const foreign of cfg.foreignResources || []) {
    const r = await http(cfg, foreign, { auth: true });
    if (!r.ok) { report.add("info", "idor", `Injoignable : ${foreign}`, r.error); continue; }
    if (r.status === 403 || r.status === 404) {
      report.pass("idor", `Ressource Ã©trangÃ¨re refusÃ©e : ${foreign}`, `${r.status}`);
    } else if (r.status >= 200 && r.status < 300) {
      report.add("high", "idor", `IDOR possible : ${foreign}`,
        `Status ${r.status} sur une ressource censÃ©e appartenir Ã  un autre compte/Ã©tablissement â€” donnÃ©es potentiellement exposÃ©es.`,
        "VÃ©rifiez l'appartenance (tenant/propriÃ©taire) cÃ´tÃ© serveur avant de renvoyer l'objet ; renvoyez 404.");
    } else {
      report.add("info", "idor", `${foreign} â†’ ${r.status}`, r.body.slice(0, 80));
    }
  }
}

/** Mass-assignment : les champs sensibles injectÃ©s ne doivent pas Ãªtre honorÃ©s. */
async function checkMassAssignment(cfg, report, writeEnabled) {
  for (const t of cfg.massAssignment || []) {
    if (!writeEnabled) {
      report.add("info", "mass-assignment", `Test ignorÃ© (Ã©criture dÃ©sactivÃ©e) : ${t.url}`,
        "Relancez avec --write sur un compte de test jetable pour exÃ©cuter ce contrÃ´le.");
      continue;
    }
    const payload = { ...(t.legit || {}), ...(t.inject || {}) };
    const w = await http(cfg, t.url, { method: t.method || "PATCH", body: payload, auth: true });
    if (!w.ok) { report.add("info", "mass-assignment", `Ã‰chec requÃªte : ${t.url}`, w.error); continue; }
    const v = await http(cfg, t.verifyUrl || t.url, { auth: true });
    const data = (v.json && (v.json.data || v.json)) || {};
    const leaked = [];
    for (const field of t.mustNotChange || Object.keys(t.inject || {})) {
      const injected = (t.inject || {})[field];
      if (injected !== undefined && JSON.stringify(valueAt(data, field)) === JSON.stringify(injected)) leaked.push(field);
    }
    if (leaked.length) {
      report.add("high", "mass-assignment", `Mass-assignment possible : ${t.url}`,
        `Champs sensibles honorÃ©s : ${leaked.join(", ")}.`,
        "Utilisez une liste blanche de champs (fillable/DTO) et dÃ©rivez tenant/rÃ´le cÃ´tÃ© serveur, jamais du payload.");
    } else {
      report.pass("mass-assignment", `Champs sensibles ignorÃ©s : ${t.url}`, (t.mustNotChange || Object.keys(t.inject || {})).join(", "));
    }
  }
}

/** Validation d'entrÃ©e : fuzz bÃ©nin, pas de 500, plafonds de pagination. */
async function checkInputValidation(cfg, report) {
  for (const t of cfg.inputValidation || []) {
    const qs = new URLSearchParams(t.params || {}).toString();
    const r = await http(cfg, `${t.url}?${qs}`, { auth: true });
    if (!r.ok) { report.add("info", "input", `Injoignable : ${t.url}`, r.error); continue; }
    if (r.status >= 500) {
      report.add("medium", "input", `Erreur 500 sur entrÃ©e anormale : ${t.url}`,
        `ParamÃ¨tres ${qs} â†’ ${r.status}. Une exception non gÃ©rÃ©e peut rÃ©vÃ©ler une surface d'injection.`,
        "Validez et typez les paramÃ¨tres ; renvoyez 422 sur entrÃ©e invalide, jamais 500.");
    } else if (r.status === 422 || (r.status >= 200 && r.status < 300)) {
      report.pass("input", `EntrÃ©e anormale gÃ©rÃ©e : ${t.url}`, `${r.status}`);
    } else {
      report.add("info", "input", `${t.url} â†’ ${r.status}`, qs);
    }
  }
}

// AccÃ¨s Ã  une valeur imbriquÃ©e simple ("institution_id" ou "a.b")
function valueAt(obj, path) {
  if (obj == null) return undefined;
  if (path in obj) return obj[path];
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

/** Toutes les mÃ©thodes d'un endpoint protÃ©gÃ© doivent Ãªtre refusÃ©es sans jeton (jamais 2xx/5xx). */
async function checkMethodes(cfg, report) {
  const methodes = ["GET", "HEAD"];
  for (const path of cfg.protectedEndpoints || []) {
    for (const method of methodes) {
      const r = await http(cfg, path, { method, body: method === "GET" || method === "HEAD" ? undefined : {} });
      if (!r.ok) continue;
      if (r.status === 401 || r.status === 403 || r.status === 404 || r.status === 405) {
        report.pass("methodes", `${method} ${path} refusÃ© sans jeton`, String(r.status));
      } else if (r.status >= 200 && r.status < 300) {
        report.add("critical", "methodes", `${method} ${path} accessible sans jeton`,
          `Status ${r.status} sans authentification.`,
          "Toutes les mÃ©thodes doivent exiger l'authentification, pas seulement GET.");
      } else if (r.status >= 500) {
        report.add("medium", "methodes", `${method} ${path} â†’ ${r.status}`,
          "Une mÃ©thode inattendue provoque une erreur serveur.",
          "Rejetez proprement les mÃ©thodes non prÃ©vues (405), sans exception 500.");
      }
    }
  }
}

/** Les Ã©critures sans en-tÃªte JSON, ou depuis une autre origine, doivent Ãªtre refusÃ©es. */
async function checkEcrituresAbusives(cfg, report) {
  for (const t of cfg.deep && cfg.deep.writeProbes || []) {
    const sansJson = await http(cfg, t.url, { method: t.method || "POST", auth: true,
      headers: { "Content-Type": "text/plain" }, body: "x=1" });
    if (sansJson.ok && sansJson.status === 415) report.pass("ecriture", `Corps non-JSON refusÃ© : ${t.url}`, "415");
    else if (sansJson.ok && sansJson.status >= 200 && sansJson.status < 300)
      report.add("medium", "ecriture", `Corps non-JSON acceptÃ© : ${t.url}`,
        `Status ${sansJson.status}.`, "Exigez un Content-Type application/json sur les Ã©critures.");

    const autreOrigine = await http(cfg, t.url, { method: t.method || "POST", auth: true,
      headers: { Origin: "https://evil.example.com", "Content-Type": "application/json" }, body: {} });
    if (autreOrigine.ok && autreOrigine.status === 403) report.pass("ecriture", `Origine Ã©trangÃ¨re refusÃ©e : ${t.url}`, "403");
    else if (autreOrigine.ok && autreOrigine.status >= 200 && autreOrigine.status < 300)
      report.add("high", "ecriture", `Ã‰criture acceptÃ©e depuis une origine Ã©trangÃ¨re : ${t.url}`,
        `Status ${autreOrigine.status} avec Origin evil.example.com.`,
        "Rejetez les requÃªtes dont l'en-tÃªte Origin ne correspond pas Ã  l'hÃ´te.");
  }
}

/** Un corps de requÃªte dÃ©mesurÃ© doit Ãªtre rejetÃ© (413), jamais faire planter le serveur. */
async function checkCorpsDemesure(cfg, report) {
  for (const t of cfg.deep && cfg.deep.writeProbes || []) {
    const gros = JSON.stringify({ x: "A".repeat(200_000) });
    const r = await http(cfg, t.url, { method: t.method || "POST", auth: true, body: gros });
    if (!r.ok) { report.add("info", "charge", `Injoignable : ${t.url}`, r.error); continue; }
    if (r.status === 413) report.pass("charge", `Corps dÃ©mesurÃ© rejetÃ© : ${t.url}`, "413");
    else if (r.status >= 500) report.add("medium", "charge", `Corps dÃ©mesurÃ© â†’ ${r.status} : ${t.url}`,
      "Un corps volumineux provoque une erreur serveur.",
      "Plafonnez la taille du corps et renvoyez 413, jamais une exception 500.");
    else report.pass("charge", `Corps dÃ©mesurÃ© gÃ©rÃ© : ${t.url}`, String(r.status));
  }
}

/** Les paramÃ¨tres rÃ©servÃ©s ne doivent pas Ãªtre modifiables par la route gÃ©nÃ©rique. */
async function checkParametresReserves(cfg, report) {
  for (const t of cfg.deep && cfg.deep.reservedParams || []) {
    const r = await http(cfg, t.url, { method: t.method || "PUT", auth: true, body: t.body || { valeur: "x" } });
    if (!r.ok) { report.add("info", "reserve", `Injoignable : ${t.url}`, r.error); continue; }
    if (r.status === 404 || r.status === 403) report.pass("reserve", `ParamÃ¨tre rÃ©servÃ© protÃ©gÃ© : ${t.url}`, String(r.status));
    else if (r.status >= 200 && r.status < 300)
      report.add("high", "reserve", `ParamÃ¨tre rÃ©servÃ© modifiable : ${t.url}`,
        `Status ${r.status} : la route gÃ©nÃ©rique a acceptÃ© d'Ã©crire un paramÃ¨tre sensible.`,
        "Excluez les paramÃ¨tres sensibles de la route de modification gÃ©nÃ©rique.");
  }
}

/** Les rÃ©ponses d'erreur ne doivent pas rÃ©vÃ©ler de dÃ©tail technique (pile, requÃªte SQL, chemin). */
async function checkFuiteErreur(cfg, report) {
  const cibles = (cfg.deep && cfg.deep.errorProbes) || [];
  const motifs = /at\s+\w+\s*\(|\.ts:\d+|\.js:\d+|node_modules|SELECT\s|INSERT\s|pg_|ECONNREFUSED|stack|Traceback|[A-Z]:\\\\|\/home\/|\/Users\//;
  for (const c of cibles) {
    const r = await http(cfg, c.url || c, { method: (c.method) || "GET", auth: true, body: c.body });
    if (!r.ok) continue;
    if (r.status >= 400 && motifs.test(r.body || "")) {
      report.add("medium", "fuite", `DÃ©tail technique dans une erreur : ${c.url || c}`,
        `La rÃ©ponse ${r.status} contient un extrait rÃ©vÃ©lateur : ${((r.body || "").match(motifs) || [""])[0]}`,
        "Renvoyez un message d'erreur gÃ©nÃ©rique ; journalisez le dÃ©tail cÃ´tÃ© serveur seulement.");
    } else if (r.status >= 400) {
      report.pass("fuite", `Erreur sans dÃ©tail technique : ${c.url || c}`, String(r.status));
    }
  }
}

/** En-tÃªtes de sÃ©curitÃ© prÃ©sents AUSSI sur les rÃ©ponses d'erreur (401, 404). */
async function checkEntetesPartout(cfg, report) {
  for (const path of ["/", ...(cfg.protectedEndpoints || []).slice(0, 2), "/route-inexistante-" + Date.now()]) {
    const r = await http(cfg, path);
    if (!r.ok) continue;
    const manquants = ["x-content-type-options", "x-frame-options", "content-security-policy"].filter((h) => !r.headers[h]);
    if (manquants.length === 0) report.pass("entetes", `En-tÃªtes de sÃ©curitÃ© sur ${path}`, `${r.status}`);
    else report.add("low", "entetes", `En-tÃªtes manquants sur ${path} (${r.status})`,
      `Manque : ${manquants.join(", ")}.`, "Posez les en-tÃªtes de sÃ©curitÃ© sur toutes les rÃ©ponses, erreurs comprises.");
  }
}

/** Force brute RÃ‰ELLE (opt-in) : vÃ©rifie que le blocage se dÃ©clenche. Bloque l'accÃ¨s ensuite. */
async function checkForceBrute(cfg, report, actif) {
  if (!cfg.login || !cfg.login.url) {
    if (actif) report.add("info", "force-brute", "Pas de page de connexion Ã  tester",
      "L'interface se protÃ¨ge par un mot de passe d'en-tÃªte (HTTP Basic), vÃ©rifiÃ© par les tests du projet.");
    return;
  }
  if (!actif) {
    report.add("info", "force-brute", "Test rÃ©el non lancÃ©",
      "Relancez avec --bruteforce pour dÃ©clencher volontairement le blocage (il coupe l'accÃ¨s ~10 minutes).");
    return;
  }
  const url = cfg.login.url, method = cfg.login.method || "POST";
  let bloque = false, a = 0;
  for (; a < (cfg.login.maxAttempts || 15); a++) {
    const r = await http(cfg, url, { method, body: { ...(cfg.login.badCredentials || {}), password: "x" + a } });
    if (r.ok && r.status === 429) { bloque = true; break; }
  }
  if (bloque) report.pass("force-brute", "Blocage dÃ©clenchÃ©", `429 aprÃ¨s ${a + 1} tentatives`);
  else report.add("high", "force-brute", "Aucun blocage aprÃ¨s de nombreuses tentatives",
    `${a} tentatives sans 429.`, "Ajoutez un blocage temporaire aprÃ¨s quelques Ã©checs.");
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------
const CHECKS = [
  ["En-tÃªtes de sÃ©curitÃ©", checkSecurityHeaders],
  ["CORS", checkCors],
  ["Cookies", checkCookies],
  ["Authentification requise", checkAuthRequired],
  ["Connexion (Ã©numÃ©ration + rate-limit)", checkLogin],
  ["IDOR / cloisonnement", checkIdor],
  ["Mass-assignment", checkMassAssignment],
  ["Validation d'entrÃ©e", checkInputValidation],
  ["MÃ©thodes HTTP", checkMethodes],
  ["Ã‰critures abusives (JSON/Origine)", checkEcrituresAbusives],
  ["Corps dÃ©mesurÃ©", checkCorpsDemesure],
  ["ParamÃ¨tres rÃ©servÃ©s", checkParametresReserves],
  ["Fuite de dÃ©tail technique", checkFuiteErreur],
  ["En-tÃªtes sur les erreurs", checkEntetesPartout],
];

function parseArgs(argv) {
  const args = { config: "security-agent.config.json", json: null, write: false, yes: false, bruteforce: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--config") args.config = argv[++i];
    else if (a === "--json") args.json = argv[++i];
    else if (a === "--write") args.write = true;
    else if (a === "--yes" || a === "-y") args.yes = true;
    else if (a === "--bruteforce") args.bruteforce = true;
    else if (a === "--help" || a === "-h") args.help = true;
  }
  return args;
}

function printReport(report, cfg) {
  const order = ["critical", "high", "medium", "low", "info", "pass"];
  console.log(`\n${COLOR.bold}=== Rapport security-agent â€” ${cfg.baseUrl} ===${COLOR.reset}\n`);
  for (const sev of order) {
    const items = report.findings.filter(f => f.severity === sev);
    if (!items.length) continue;
    for (const f of items) {
      const tag = `${COLOR[sev]} ${SEV_LABEL[sev].padEnd(8)} ${COLOR.reset}`;
      console.log(`${tag} ${COLOR.bold}[${f.check}]${COLOR.reset} ${f.title}`);
      if (f.detail && sev !== "pass") console.log(`${COLOR.dim}           ${f.detail}${COLOR.reset}`);
      if (f.recommendation) console.log(`           â†’ ${f.recommendation}`);
    }
  }
  const c = report.counts();
  console.log(`\n${COLOR.bold}SynthÃ¨se :${COLOR.reset} ` +
    `critique ${c.critical}, Ã©levÃ© ${c.high}, moyen ${c.medium}, faible ${c.low}, info ${c.info}, ok ${c.pass}\n`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log("Usage: node security-agent.mjs --config <fichier> [--json <sortie>] [--write] [--yes] [--bruteforce]");
    process.exit(0);
  }

  let cfg;
  try { cfg = JSON.parse(readFileSync(args.config, "utf8")); }
  catch (e) { console.error(`Config illisible (${args.config}) : ${e.message}`); process.exit(2); }

  if (!cfg.baseUrl) { console.error("`baseUrl` manquant dans la config."); process.exit(2); }

  // Garde-fou d'autorisation
  if (!cfg.authorized && !args.yes) {
    console.error(
      "\nâš ï¸  REFUS : vous devez confirmer Ãªtre autorisÃ© Ã  tester cette cible.\n" +
      "   Mettez \"authorized\": true dans la config, ou passez --yes.\n" +
      "   N'utilisez cet agent que sur des systÃ¨mes que vous possÃ©dez ou Ãªtes autorisÃ© Ã  tester.\n");
    process.exit(2);
  }
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(cfg.baseUrl);
  if (args.write && !isLocal) {
    console.warn("âš ï¸  Tests d'Ã©criture activÃ©s sur une cible NON locale â€” Ã  n'utiliser que sur un compte de test jetable.");
  }

  const report = new Report();
  for (const [name, fn] of CHECKS) {
    process.stdout.write(`${COLOR.dim}â€¢ ${name}â€¦${COLOR.reset}\n`);
    try {
      if (fn === checkMassAssignment) await fn(cfg, report, args.write);
      else await fn(cfg, report);
    } catch (e) {
      report.add("info", "runner", `ContrÃ´le Â« ${name} Â» interrompu`, String(e && e.message || e));
    }
  }

  await checkForceBrute(cfg, report, args.bruteforce).catch((e) => report.add("info", "force-brute", "Interrompu", String(e && e.message || e)));

  printReport(report, cfg);

  if (args.json) {
    writeFileSync(args.json, JSON.stringify({
      target: cfg.baseUrl, date: new Date().toISOString(),
      counts: report.counts(), findings: report.findings,
    }, null, 2));
    console.log(`Rapport JSON Ã©crit : ${args.json}`);
  }

  // Code de sortie pour la CI
  const failOn = SEV[cfg.failOn || "medium"] ?? SEV.medium;
  const worst = report.worst;
  if (worst >= failOn) {
    console.log(`\nâŒ Seuil d'Ã©chec atteint (pire = ${SEV_LABEL[Object.keys(SEV).find(k => SEV[k] === worst)]}, seuil = ${(cfg.failOn || "medium")}).`);
    process.exit(1);
  }
  console.log("\nâœ… Aucun problÃ¨me au-dessus du seuil configurÃ©.");
  process.exit(0);
}

main();



