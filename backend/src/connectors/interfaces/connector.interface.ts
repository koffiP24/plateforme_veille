// Le contrat commun des connecteurs sera défini ici.
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
}

export interface BaseConnector {
  testConnection(): Promise<ConnectorTestResult>;

  collect(): Promise<ExternalItem[]>;
}