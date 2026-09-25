import { Injectable } from '@nestjs/common';
import { DataSource, In, LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { WatchItem } from '../watch-items/entities/watch-item.entity';
import { Source } from '../sources/entities/source.entity';
import { FollowUpAction } from '../actions/entities/follow-up-action.entity';
import { User } from '../users/entities/user.entity';
import { CollectionRun } from '../collection/entities/collection-run.entity';

@Injectable()
export class DashboardService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(WatchItem)
    private readonly items: Repository<WatchItem>,
    @InjectRepository(Source)
    private readonly sources: Repository<Source>,
    @InjectRepository(FollowUpAction)
    private readonly actions: Repository<FollowUpAction>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(CollectionRun)
    private readonly runs: Repository<CollectionRun>,
  ) {}

  async get(user: { id: number; roles: string[] }, requestedDays = 30) {
    const days = [7, 30, 90, 365].includes(requestedDays) ? requestedDays : 30;
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - (days - 1));
    periodStart.setHours(0, 0, 0, 0);
    const personalMetrics = await this.getPersonalMetrics(user);

    if (user.roles.includes('ADMIN')) {
      const [
        sourcesActive,
        sourcesInactive,
        usersActive,
        toValidate,
        critical,
        openActions,
        collectionErrors,
        recentCollections,
      ] = await Promise.all([
        this.sources.count({ where: { active: true } }),
        this.sources.count({ where: { active: false } }),
        this.users.count({ where: { status: 'ACTIVE' } }),
        this.items.count({ where: { status: 'A_QUALIFIER', updatedAt: MoreThanOrEqual(periodStart) } }),
        this.items.count({ where: { criticality: 'CRITIQUE', updatedAt: MoreThanOrEqual(periodStart) } }),
        this.actions.count({ where: { status: In(['OPEN', 'IN_PROGRESS']) } }),
        this.runs.count({
          where: {
            status: In(['ERROR', 'COMPLETED_WITH_ERRORS']),
            startedAt: MoreThanOrEqual(periodStart),
          },
        }),
        this.runs.count({ where: { startedAt: MoreThanOrEqual(periodStart) } }),
      ]);

      return {
        ...personalMetrics,
        sourcesActive,
        sourcesInactive,
        usersActive,
        toValidate,
        critical,
        openActions,
        collectionErrors,
        recentCollections,
      };
    }

    if (user.roles.includes('RESPONSABLE_VEILLE')) {
      const [toValidate, critical, validated, published, openActions, collectionErrors] =
        await Promise.all([
          this.items.count({ where: { status: 'A_QUALIFIER', updatedAt: MoreThanOrEqual(periodStart) } }),
          this.items.count({ where: { criticality: 'CRITIQUE', updatedAt: MoreThanOrEqual(periodStart) } }),
          this.items.count({ where: { status: 'VALIDE', updatedAt: MoreThanOrEqual(periodStart) } }),
          this.items.count({ where: { status: 'PUBLIE', publishedAt: MoreThanOrEqual(periodStart) } }),
          this.actions.count({ where: { status: In(['OPEN', 'IN_PROGRESS']) } }),
          this.runs.count({
            where: {
              status: In(['ERROR', 'COMPLETED_WITH_ERRORS']),
              startedAt: MoreThanOrEqual(periodStart),
            },
          }),
        ]);

      return {
        ...personalMetrics,
        toValidate,
        critical,
        validated,
        published,
        openActions,
        collectionErrors,
      };
    }

    if (user.roles.includes('OPERATEUR_VEILLE')) {
      const [
        sourcesActive,
        newItems,
        toQualify,
        qualified,
        recentCollections,
        collectionErrors,
      ] =
        await Promise.all([
          this.sources.count({ where: { active: true } }),
          this.items.count({ where: { status: 'NOUVEAU', collectedAt: MoreThanOrEqual(periodStart) } }),
          this.items.count({ where: { status: 'A_QUALIFIER', collectedAt: MoreThanOrEqual(periodStart) } }),
          this.items.count({
            where: {
              status: In(['A_QUALIFIER', 'VALIDE', 'PUBLIE']), updatedAt: MoreThanOrEqual(periodStart),
            },
          }),
          this.runs.count({ where: { startedAt: MoreThanOrEqual(periodStart) } }),
          this.runs.count({
            where: {
              status: In(['ERROR', 'COMPLETED_WITH_ERRORS']),
              startedAt: MoreThanOrEqual(periodStart),
            },
          }),
        ]);

      return {
        ...personalMetrics,
        sourcesActive,
        newItems,
        toQualify,
        qualified,
        recentCollections,
        collectionErrors,
      };
    }

    if (user.roles.includes('REFERENT_LABORATOIRE')) {
      const [published, criticalPublished] =
        await Promise.all([
          this.items.count({ where: { status: 'PUBLIE', publishedAt: MoreThanOrEqual(periodStart) } }),
          this.items.count({
            where: { status: 'PUBLIE', criticality: 'CRITIQUE', publishedAt: MoreThanOrEqual(periodStart) },
          }),
        ]);

      return { ...personalMetrics, published, criticalPublished };
    }

    const [published, criticalPublished, recentlyPublished] = await Promise.all([
      this.items.count({ where: { status: 'PUBLIE', publishedAt: MoreThanOrEqual(periodStart) } }),
      this.items.count({
        where: { status: 'PUBLIE', criticality: 'CRITIQUE', publishedAt: MoreThanOrEqual(periodStart) },
      }),
      this.items.count({
        where: {
          status: 'PUBLIE',
          publishedAt: MoreThanOrEqual(periodStart),
        },
      }),
    ]);

    return { ...personalMetrics, published, criticalPublished, recentlyPublished };
  }

  private async getPersonalMetrics(user: { id: number; roles: string[] }) {
    const [notificationRow] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
      [user.id],
    );
    const metrics: Record<string, number> = {
      unreadNotifications: Number(notificationRow?.count) || 0,
    };
    const canReceiveActions = user.roles.some((role) =>
      ['ADMIN', 'RESPONSABLE_VEILLE', 'REFERENT_LABORATOIRE'].includes(role),
    );
    if (!canReceiveActions) return metrics;

    const today = new Date().toISOString().slice(0, 10);
    const [assignedOpenActions, assignedLateActions] = await Promise.all([
      this.actions.count({
        where: { owner: { id: user.id }, status: In(['OPEN', 'IN_PROGRESS']) },
      }),
      this.actions.count({
        where: {
          owner: { id: user.id },
          status: In(['OPEN', 'IN_PROGRESS']),
          dueDate: LessThan(today),
        },
      }),
    ]);
    return { ...metrics, assignedOpenActions, assignedLateActions };
  }

  async analytics(user: { id: number; roles: string[] }, requestedDays: number) {
    const days = [7, 30, 90, 365].includes(requestedDays) ? requestedDays : 30;
    const isOperator = user.roles.includes('OPERATEUR_VEILLE');
    const isReferent = user.roles.includes('REFERENT_LABORATOIRE');
    const hasQualificationAccess = user.roles.some((role) =>
      ['ADMIN', 'RESPONSABLE_VEILLE', 'OPERATEUR_VEILLE'].includes(role),
    );
    const isConsultation = !hasQualificationAccess;
    const publishedJoinClause = isConsultation ? "AND w.status = 'PUBLIE'" : '';
    const publishedWhereClause = isConsultation ? "WHERE status = 'PUBLIE'" : '';
    const publishedWhereAliasClause = isConsultation ? "AND w.status = 'PUBLIE'" : '';
    const actionOwnerClause = isReferent ? 'WHERE owner_id = $1' : '';
    const actionParameters = isReferent ? [user.id] : [];

    const [watchTimeline, collectionTimeline, watchStatuses, priorities, sourceTypes,
      actionStatuses, sourceHealth, topSources, urgentItems, dueActions] = await Promise.all([
      this.dataSource.query(
        `SELECT to_char(day, 'YYYY-MM-DD') AS date,
          COUNT(w.id) FILTER (WHERE w.collected_at >= day AND w.collected_at < day + INTERVAL '1 day')::int AS collected,
          COUNT(w.id) FILTER (WHERE w.published_at >= day AND w.published_at < day + INTERVAL '1 day')::int AS published
        FROM generate_series(CURRENT_DATE - ($1::int - 1), CURRENT_DATE, INTERVAL '1 day') day
        LEFT JOIN watch_items w ON ((w.collected_at >= day AND w.collected_at < day + INTERVAL '1 day')
          OR (w.published_at >= day AND w.published_at < day + INTERVAL '1 day')) ${publishedJoinClause}
        GROUP BY day ORDER BY day`, [days]),
      this.dataSource.query(
        `SELECT to_char(day, 'YYYY-MM-DD') AS date,
          COALESCE(SUM(r.received_count), 0)::int AS received,
          COALESCE(SUM(r.new_count), 0)::int AS created,
          COALESCE(SUM(r.filtered_count), 0)::int AS ignored,
          COALESCE(SUM(r.error_count), 0)::int AS errors
        FROM generate_series(CURRENT_DATE - ($1::int - 1), CURRENT_DATE, INTERVAL '1 day') day
        LEFT JOIN collection_runs r ON r.started_at >= day AND r.started_at < day + INTERVAL '1 day'
        GROUP BY day ORDER BY day`, [days]),
      this.dataSource.query(`SELECT status AS label, COUNT(*)::int AS value FROM watch_items ${publishedWhereClause} GROUP BY status ORDER BY value DESC`),
      this.dataSource.query(`SELECT COALESCE(criticality, 'NON_RENSEIGNEE') AS label, COUNT(*)::int AS value FROM watch_items ${publishedWhereClause} GROUP BY criticality ORDER BY value DESC`),
      this.dataSource.query(`SELECT source_type AS label, COUNT(*)::int AS value FROM sources GROUP BY source_type ORDER BY value DESC`),
      this.dataSource.query(`SELECT status AS label, COUNT(*)::int AS value FROM actions ${actionOwnerClause} GROUP BY status ORDER BY value DESC`, actionParameters),
      this.dataSource.query(`SELECT COALESCE(c.status, CASE WHEN s.active THEN 'SANS_CONNECTEUR' ELSE 'INACTIVE' END) AS label,
        COUNT(*)::int AS value FROM sources s LEFT JOIN connectors c ON c.id = (SELECT id FROM connectors WHERE source_id = s.id ORDER BY id DESC LIMIT 1)
        GROUP BY 1 ORDER BY value DESC`),
      this.dataSource.query(`SELECT s.name AS label, COUNT(w.id)::int AS value FROM sources s LEFT JOIN watch_items w ON w.source_id = s.id ${publishedJoinClause}
        GROUP BY s.id, s.name ORDER BY value DESC, s.name LIMIT 5`),
      this.dataSource.query(`SELECT w.id, w.title, w.status, w.criticality, s.name AS "sourceName"
        FROM watch_items w JOIN sources s ON s.id = w.source_id
        WHERE w.criticality IN ('CRITIQUE', 'ELEVEE') ${publishedWhereAliasClause} ORDER BY w.updated_at DESC LIMIT 5`),
      this.dataSource.query(`SELECT a.id, a.title, a.status, a.due_date AS "dueDate", w.title AS "watchItemTitle"
        FROM actions a JOIN watch_items w ON w.id = a.watch_item_id
        WHERE a.status IN ('OPEN', 'IN_PROGRESS') ${isReferent ? 'AND a.owner_id = $1' : ''}
        ORDER BY a.due_date ASC NULLS LAST, a.created_at DESC LIMIT 5`, actionParameters),
    ]);

    const timeline = isOperator
      ? {
          title: 'Activité de collecte',
          series: [
            { key: 'received', label: 'Reçus', color: '#2563eb' },
            { key: 'created', label: 'Nouveaux', color: '#10b981' },
            { key: 'ignored', label: 'Ignorés', color: '#f59e0b' },
            { key: 'errors', label: 'Erreurs', color: '#ef4444' },
          ],
          points: collectionTimeline,
        }
      : {
          title: isConsultation ? 'Évolution des publications' : 'Évolution de la veille',
          series: isConsultation
            ? [{ key: 'published', label: 'Publiées', color: '#10b981' }]
            : [
                { key: 'collected', label: 'Collectées', color: '#2563eb' },
                { key: 'published', label: 'Publiées', color: '#10b981' },
              ],
          points: watchTimeline,
        };

    return {
      days,
      timeline,
      distributions: {
        primary: {
          title: isOperator ? 'Résultats des collectes' : 'Statuts des veilles',
          items: isOperator
            ? [
                { label: 'Nouveaux', value: collectionTimeline.reduce((sum: number, row: any) => sum + Number(row.created), 0) },
                { label: 'Ignorés', value: collectionTimeline.reduce((sum: number, row: any) => sum + Number(row.ignored), 0) },
                { label: 'Erreurs', value: collectionTimeline.reduce((sum: number, row: any) => sum + Number(row.errors), 0) },
              ]
            : watchStatuses,
        },
        secondary: {
          title: isReferent ? 'Statuts de mes actions' : isConsultation ? 'Importance des publications' : 'Importance des veilles',
          items: isReferent ? actionStatuses : priorities,
        },
        tertiary: {
          title: user.roles.includes('ADMIN') ? 'Santé des sources' : 'Types de source',
          items: user.roles.includes('ADMIN') ? sourceHealth : sourceTypes,
        },
      },
      topSources,
      urgentItems,
      dueActions: isConsultation && !isReferent ? [] : dueActions,
    };
  }

  async summary(userId: number, roles: string[]) {
    const roleMetrics = await this.get({ id: userId, roles });
    const isAdmin = roles.includes('ADMIN');
    const hasQualificationAccess = roles.some((role) =>
      ['ADMIN', 'RESPONSABLE_VEILLE', 'OPERATEUR_VEILLE'].includes(role),
    );

    if (!hasQualificationAccess) {
      const isReferent = roles.includes('REFERENT_LABORATOIRE');
      const [counts] = await this.dataSource.query(
        `SELECT
          (SELECT COUNT(*)::int FROM watch_items WHERE status = 'PUBLIE') AS "publishedItems",
          (SELECT COUNT(*)::int FROM favorites WHERE user_id = $1) AS favorites,
          (SELECT COUNT(*)::int FROM saved_views WHERE user_id = $1) AS "savedViews",
          (SELECT COUNT(*)::int FROM actions
            WHERE owner_id = $1 AND status IN ('OPEN', 'IN_PROGRESS')) AS "openActions"`,
        [userId],
      );
      const recentItems = await this.dataSource.query(`
        SELECT w.id, w.title, w.watch_type AS "watchType", w.status,
          w.published_at AS "publishedAt", s.name AS "sourceName"
        FROM watch_items w JOIN sources s ON s.id = w.source_id
        WHERE w.status = 'PUBLIE'
        ORDER BY COALESCE(w.published_at, w.collected_at) DESC, w.id DESC
        LIMIT 5
      `);
      const assignedActions = isReferent
        ? await this.dataSource.query(
            `SELECT a.id, a.title, a.status, a.due_date AS "dueDate",
              w.id AS "watchItemId", w.title AS "watchItemTitle"
            FROM actions a JOIN watch_items w ON w.id = a.watch_item_id
            WHERE a.owner_id = $1 AND a.status IN ('OPEN', 'IN_PROGRESS')
            ORDER BY a.due_date ASC NULLS LAST, a.created_at DESC
            LIMIT 5`,
            [userId],
          )
        : [];

      return {
        access: 'consultation' as const,
        scope: isReferent ? ('referent' as const) : ('reader' as const),
        counts,
        roleMetrics,
        recentItems,
        assignedActions,
      };
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
    let administration:
      | { activeSources: number; activeUsers: number; failedRuns: number }
      | undefined;
    if (isAdmin) {
      [administration] = await this.dataSource.query(`
        SELECT (SELECT COUNT(*)::int FROM sources WHERE active = true) AS "activeSources",
          (SELECT COUNT(*)::int FROM users WHERE status = 'ACTIVE') AS "activeUsers",
          (SELECT COUNT(*)::int FROM collection_runs
            WHERE started_at >= NOW() - INTERVAL '7 days'
            AND (status IN ('ERROR', 'COMPLETED_WITH_ERRORS') OR error_count > 0)) AS "failedRuns"
      `);
    }
    return {
      access: 'qualification' as const,
      counts,
      roleMetrics,
      recentItems,
      administration,
    };
  }
}
