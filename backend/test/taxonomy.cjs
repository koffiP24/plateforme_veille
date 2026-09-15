const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const { DataSource } = require('typeorm');
const request = require('supertest');
const { TaxonomyController } = require('../dist/taxonomy/taxonomy.controller');
const { TaxonomyService } = require('../dist/taxonomy/taxonomy.service');
const { JwtAuthGuard } = require('../dist/auth/guards/jwt-auth.guard');

test('Routes taxonomie : authentification, droits administrateur et validation', async () => {
  const service = {
    list: async () => [], findOne: async (_, id) => ({ id }),
    create: async (_, dto) => ({ id: 1, ...dto }),
    update: async (_, id, dto) => ({ id, ...dto }),
    remove: async () => ({ message: 'Supprimé' }),
  };
  const module = await Test.createTestingModule({
    controllers: [TaxonomyController],
    providers: [{ provide: TaxonomyService, useValue: service }],
  }).overrideGuard(JwtAuthGuard).useValue({
    canActivate(context) {
      const req = context.switchToHttp().getRequest();
      if (!req.headers['x-test-role']) return false;
      req.user = { roles: [req.headers['x-test-role']] };
      return true;
    },
  }).compile();
  const app = module.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  try {
    for (const kind of ['topics', 'domains', 'laboratories', 'keywords', 'synonyms']) {
      const path = '/api/v1/taxonomy/' + kind;
      const body = ['domains', 'laboratories'].includes(kind) ? { name: ' Test ' } :
        kind === 'synonyms' ? { label: ' Test ', keywordId: 1 } : { label: ' Test ' };
      await request(app.getHttpServer()).get(path).expect(403);
      await request(app.getHttpServer()).get(path).set('x-test-role', 'LECTEUR').expect(200);
      await request(app.getHttpServer()).get(path + '/1').set('x-test-role', 'LECTEUR').expect(200);
      for (const method of ['post', 'patch', 'delete']) {
        const url = path + (method === 'post' ? '' : '/1');
        await request(app.getHttpServer())[method](url).set('x-test-role', 'LECTEUR').send(body).expect(403);
        await request(app.getHttpServer())[method](url).set('x-test-role', 'ADMIN').send(body).expect(method === 'post' ? 201 : 200);
      }
      await request(app.getHttpServer()).post(path).set('x-test-role', 'ADMIN').send({}).expect(400);
      await request(app.getHttpServer()).patch(path + '/bad').set('x-test-role', 'ADMIN').send(body).expect(400);
    }
    await request(app.getHttpServer()).post('/api/v1/taxonomy/topics').set('x-test-role', 'ADMIN').send({ label: '   ' }).expect(400);
    await request(app.getHttpServer()).patch('/api/v1/taxonomy/keywords/1').set('x-test-role', 'ADMIN').send({ weight: null }).expect(400);
    await request(app.getHttpServer()).patch('/api/v1/taxonomy/topics/1').set('x-test-role', 'ADMIN').send({ parentId: null }).expect(200);
  } finally { await app.close(); }
});

test('Service : références manquantes, cycle et conflits', async () => {
  const records = new Map([[1, { id: 1, parent: null }], [2, { id: 2, parent: { id: 1 } }]]);
  const repo = { findOne: async ({ where }) => records.get(where.id) ?? null };
  const service = new TaxonomyService({ getRepository: () => repo });
  await assert.rejects(service.findOne('topics', 99), { status: 404 });
  await assert.rejects(service.update('topics', 1, { parentId: 2 }), { status: 400 });
  await assert.rejects(service.create('synonyms', { label: 'Test', keywordId: 99 }), { status: 404 });
  repo.create = value => value;
  repo.save = async () => { throw { driverError: { code: '23505' } }; };
  await assert.rejects(service.create('keywords', { label: 'Test' }), { status: 409 });
  repo.delete = async () => { throw { driverError: { code: '23503' } }; };
  await assert.rejects(service.remove('domains', 1), { status: 409 });
});

test('Métadonnées et injection complètes sans connexion à la base', async () => {
  const { AppModule } = require('../dist/app.module');
  const ds = new DataSource({ type: 'postgres', entities: [__dirname + '/../dist/**/*.entity.js'], synchronize: false });
  ds.initialize = async () => { throw new Error('Connexion interdite pendant ce test'); };
  await ds.buildMetadatas();
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DataSource).useValue(ds).compile();
  await module.close();
});
