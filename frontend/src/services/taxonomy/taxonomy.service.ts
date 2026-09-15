import api from "../api";

export interface Topic {
  id: number;
  label: string;
  description: string | null;

  parent?: {
    id: number;
    label: string;
  } | null;
}

export interface Domain {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
}

export interface Laboratory {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
}

export interface KeywordSynonym {
  id: number;
  label: string;
}

export interface Keyword {
  id: number;
  label: string;
  weight: number;
  active: boolean;
  synonyms?: KeywordSynonym[];
}

/* =========================
   TOPICS
========================= */

export function getTopics() {
  return api.get<Topic[]>("/taxonomy/topics");
}

export function createTopic(payload: {
  label: string;
  description?: string;
  parentId?: number | null;
}) {
  return api.post("/taxonomy/topics", payload);
}

export function updateTopic(
  id: number,
  payload: {
    label?: string;
    description?: string;
    parentId?: number | null;
  },
) {
  return api.patch(`/taxonomy/topics/${id}`, payload);
}

/* =========================
   DOMAINS
========================= */

export function getDomains() {
  return api.get<Domain[]>("/taxonomy/domains");
}

export function createDomain(payload: {
  name: string;
  description?: string;
  active?: boolean;
}) {
  return api.post("/taxonomy/domains", payload);
}

export function updateDomain(
  id: number,
  payload: {
    name?: string;
    description?: string;
    active?: boolean;
  },
) {
  return api.patch(`/taxonomy/domains/${id}`, payload);
}

/* =========================
   LABORATORIES
========================= */

export function getLaboratories() {
  return api.get<Laboratory[]>("/taxonomy/laboratories");
}

export function createLaboratory(payload: {
  name: string;
  description?: string;
  active?: boolean;
}) {
  return api.post("/taxonomy/laboratories", payload);
}

export function updateLaboratory(
  id: number,
  payload: {
    name?: string;
    description?: string;
    active?: boolean;
  },
) {
  return api.patch(`/taxonomy/laboratories/${id}`, payload);
}

/* =========================
   KEYWORDS
========================= */

export function getKeywords() {
  return api.get<Keyword[]>("/taxonomy/keywords");
}

export function createKeyword(payload: {
  label: string;
  weight?: number;
  active?: boolean;
}) {
  return api.post("/taxonomy/keywords", payload);
}

export function updateKeyword(
  id: number,
  payload: {
    label?: string;
    weight?: number;
    active?: boolean;
  },
) {
  return api.patch(`/taxonomy/keywords/${id}`, payload);
}
