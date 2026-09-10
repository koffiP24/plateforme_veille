import {
  BaseConnector,
  CollectionResult,
  ConnectorTestResult,
} from '../interfaces/connector.interface';

export class ManualConnector implements BaseConnector {
  async testConnection(): Promise<ConnectorTestResult> {
    return {
      success: true,
      message: 'Le connecteur manuel est disponible.',
    };
  }

  async collect(): Promise<CollectionResult> {
    return {
      items: [],
    };
  }
}
