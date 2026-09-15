const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Test } = require('@nestjs/testing');
const { UnauthorizedException } = require('@nestjs/common');
const { DataSource } = require('typeorm');
const request = require('supertest');
const { DashboardModule } = require('../dist/dashboard/dashboard.module');
const { DashboardService } = require('../dist/dashboard/dashboard.service');
const { JwtAuthGuard } = require('../dist/auth/guards/jwt-auth.guard');

test('Tableau de bord : données filtrées selon les rôles du compte', async () => {
  let queries = 0;
  const service = new DashboardService({ query: async (sql) => {
    queries++;
    if (sql.includes('activeUsers')) return [{ activeSources: 2, activeUsers: 3, failedRuns: 1 }];
    if (sql.includes('COUNT(*)')) return [{ total: 10, newItems: 8, toQualify: 8, qualificationFilled: 2, highCriticality: 1 }];
    return [{ id: 1, title: 'Test' }];
  } });
  for (const roles of [[], ['LECTEUR'], ['REFERENT_LABORATOIRE']]) {
    assert.deepEqual(await service.summary(roles), { access: 'welcome' });
  }
  assert.equal(queries, 0);
  for (const role of ['OPERATEUR_VEILLE', 'RESPONSABLE_VEILLE']) {
    const summary = await service.summary([role]);
    assert.equal(summary.access, 'qualification');
    assert.equal(summary.administration, undefined);
    assert.equal(summary.recentItems.length, 1);
  }
  const admin = await service.summary(['LECTEUR', 'ADMIN']);
  assert.equal(admin.administration.activeUsers, 3);
});

test('Route : authentification obligatoire et rôle non modifiable par la requête', async () => {
  const module = await Test.createTestingModule({ imports: [DashboardModule] })
    .overrideProvider(DashboardService).useValue(new DashboardService({ query: async () => { throw Error('Aucune requête permise'); } }))
    .overrideGuard(JwtAuthGuard).useValue({ canActivate(ctx) {
      const req = ctx.switchToHttp().getRequest();
      if (!req.headers['x-test-session']) throw new UnauthorizedException();
      req.user = { roles: ['LECTEUR'] }; return true;
    } }).compile();
  const app = module.createNestApplication();
  await app.init();
  try {
    await request(app.getHttpServer()).get('/api/v1/dashboard').expect(401);
    const response = await request(app.getHttpServer()).get('/api/v1/dashboard?roles=ADMIN')
      .set('x-test-session', 'reader').expect(200);
    assert.deepEqual(response.body, { access: 'welcome' });
  } finally { await app.close(); }
});
