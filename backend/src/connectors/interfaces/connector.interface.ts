export interface ConnectorTestResult {
  success: boolean;
  message: string;
}

export interface ExternalItem {
  externalId?: string;
  title: string;
  summary?: string;
  url?: string;
  publishedAt?: Date;
  raw?: unknown;
}

export interface CollectionResult {
  items: ExternalItem[];
  nextCursor?: string;
}

export interface BaseConnector {
  testConnection(): Promise<ConnectorTestResult>;

  collect(): Promise<CollectionResult>;
}
