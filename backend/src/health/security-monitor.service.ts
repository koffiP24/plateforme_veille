import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { DataSource } from 'typeorm';

@Injectable()
export class SecurityMonitorService {
  private readonly logger = new Logger(SecurityMonitorService.name);

  constructor(private readonly database: DataSource) {}

  @Interval(15 * 60 * 1000)
  async checkRecentActivity() {
    try {
      const [failedLogins, collectionErrors] = await Promise.all([
        this.database.query(`
          SELECT COALESCE(ip_address::text, 'unknown') AS ip, COUNT(*)::int AS count
          FROM audit_logs
          WHERE action = 'LOGIN_FAILED' AND created_at >= NOW() - INTERVAL '15 minutes'
          GROUP BY ip_address HAVING COUNT(*) >= 5`),
        this.database.query(`
          SELECT COUNT(*)::int AS count FROM collection_runs
          WHERE started_at >= NOW() - INTERVAL '15 minutes'
            AND (status = 'ERROR' OR error_count > 0)`),
      ]);
      for (const row of failedLogins as { ip: string; count: number }[]) {
        this.logger.warn(`${row.count} échecs de connexion en 15 minutes depuis ${row.ip}.`);
      }
      const errors = Number(collectionErrors[0]?.count ?? 0);
      if (errors > 0) this.logger.warn(`${errors} collecte(s) en erreur sur les 15 dernières minutes.`);
    } catch (error) {
      this.logger.error('Surveillance des événements de sécurité indisponible.',
        error instanceof Error ? error.stack : String(error));
    }
  }
}
