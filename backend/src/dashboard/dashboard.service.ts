import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DashboardService {
  constructor(private readonly dataSource: DataSource) {}

  async summary(roles: string[]) {
    const isAdmin = roles.includes('ADMIN');
    if (!roles.some(role => ['ADMIN', 'RESPONSABLE_VEILLE', 'OPERATEUR_VEILLE'].includes(role))) {
      return { access: 'welcome' as const };
    }
    const [counts] = await this.dataSource.query(`
      SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'NOUVEAU')::int AS "newItems",
        COUNT(*) FILTER (WHERE status IN ('NOUVEAU', 'A_QUALIFIER')
          AND (relevance IS NULL OR criticality IS NULL OR criticality = ''))::int AS "toQualify",
        COUNT(*) FILTER (WHERE relevance IS NOT NULL AND criticality IS NOT NULL
          AND criticality <> '')::int AS "qualificationFilled",
        COUNT(*) FILTER (WHERE criticality IN ('ELEVEE', 'CRITIQUE'))::int AS "highCriticality"
      FROM watch_items
    `);
    const recentItems = await this.dataSource.query(`
      SELECT w.id, w.title, w.watch_type AS "watchType", w.status,
        w.collected_at AS "collectedAt", s.name AS "sourceName"
      FROM watch_items w JOIN sources s ON s.id = w.source_id
      WHERE w.status IN ('NOUVEAU', 'A_QUALIFIER')
        AND (w.relevance IS NULL OR w.criticality IS NULL OR w.criticality = '')
      ORDER BY w.collected_at DESC, w.id DESC LIMIT 5
    `);
    let administration: { activeSources: number; activeUsers: number; failedRuns: number } | undefined;
    if (isAdmin) {
      [administration] = await this.dataSource.query(`
        SELECT (SELECT COUNT(*)::int FROM sources WHERE active = true) AS "activeSources",
          (SELECT COUNT(*)::int FROM users WHERE status = 'ACTIVE') AS "activeUsers",
          (SELECT COUNT(*)::int FROM collection_runs
            WHERE started_at >= NOW() - INTERVAL '7 days'
            AND (status IN ('ERROR', 'COMPLETED_WITH_ERRORS') OR error_count > 0)) AS "failedRuns"
      `);
    }
    return { access: 'qualification' as const, counts, recentItems, administration };
  }
}
