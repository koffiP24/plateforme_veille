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

  async get(user: { id: number; roles: string[] }) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
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
        this.items.count({ where: { status: 'A_QUALIFIER' } }),
        this.items.count({ where: { criticality: 'CRITIQUE' } }),
        this.actions.count({ where: { status: In(['OPEN', 'IN_PROGRESS']) } }),
        this.runs.count({
          where: {
            status: In(['ERROR', 'COMPLETED_WITH_ERRORS']),
            startedAt: MoreThanOrEqual(sevenDaysAgo),
          },
        }),
        this.runs.count({ where: { startedAt: MoreThanOrEqual(sevenDaysAgo) } }),
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
          this.items.count({ where: { status: 'A_QUALIFIER' } }),
          this.items.count({ where: { criticality: 'CRITIQUE' } }),
          this.items.count({ where: { status: 'VALIDE' } }),
          this.items.count({ where: { status: 'PUBLIE' } }),
          this.actions.count({ where: { status: In(['OPEN', 'IN_PROGRESS']) } }),
          this.runs.count({
            where: {
              status: In(['ERROR', 'COMPLETED_WITH_ERRORS']),
              startedAt: MoreThanOrEqual(sevenDaysAgo),
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
          this.items.count({ where: { status: 'NOUVEAU' } }),
          this.items.count({ where: { status: 'A_QUALIFIER' } }),
          this.items.count({
            where: {
              status: In(['A_QUALIFIER', 'VALIDE', 'PUBLIE']),
            },
          }),
          this.runs.count({ where: { startedAt: MoreThanOrEqual(sevenDaysAgo) } }),
          this.runs.count({
            where: {
              status: In(['ERROR', 'COMPLETED_WITH_ERRORS']),
              startedAt: MoreThanOrEqual(sevenDaysAgo),
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
          this.items.count({ where: { status: 'PUBLIE' } }),
          this.items.count({
            where: { status: 'PUBLIE', criticality: 'CRITIQUE' },
          }),
        ]);

      return { ...personalMetrics, published, criticalPublished };
    }

    const [published, criticalPublished, recentlyPublished] = await Promise.all([
      this.items.count({ where: { status: 'PUBLIE' } }),
      this.items.count({
        where: { status: 'PUBLIE', criticality: 'CRITIQUE' },
      }),
      this.items.count({
        where: {
          status: 'PUBLIE',
          publishedAt: MoreThanOrEqual(sevenDaysAgo),
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
