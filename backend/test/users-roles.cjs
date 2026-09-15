const assert = require('node:assert/strict');
const { test } = require('node:test');
require('reflect-metadata');
const { validate } = require('class-validator');
const { UsersService } = require('../dist/users/users.service');
const { UsersController } = require('../dist/users/users.controller');
const { RolesController } = require('../dist/roles/roles.controller');
const { UpdateUserRolesDto } = require('../dist/users/dto/update-user-roles.dto');

test('le DTO refuse une liste vide ou des rôles en double', async () => {
  const empty = Object.assign(new UpdateUserRolesDto(), { roles: [] });
  const duplicate = Object.assign(new UpdateUserRolesDto(), { roles: ['LECTEUR', 'LECTEUR'] });
  const valid = Object.assign(new UpdateUserRolesDto(), { roles: ['LECTEUR', 'RESPONSABLE_VEILLE'] });
  assert.ok((await validate(empty)).length > 0);
  assert.ok((await validate(duplicate)).length > 0);
  assert.equal((await validate(valid)).length, 0);
});

test('le service ajoute et retire les rôles existants', async () => {
  const user = { id: 2, roles: [] };
  const available = [
    { id: 2, name: 'LECTEUR', description: null },
    { id: 3, name: 'RESPONSABLE_VEILLE', description: 'Responsable' },
  ];
  const userRepository = {
    findOne: async () => user,
    save: async (value) => value,
  };
  const roleRepository = { find: async () => available };
  const service = new UsersService(userRepository, roleRepository);
  const result = await service.setRoles(2, ['LECTEUR', 'RESPONSABLE_VEILLE'], 1);
  assert.deepEqual(user.roles, available);
  assert.deepEqual(result.roles.map((role) => role.name), ['LECTEUR', 'RESPONSABLE_VEILLE']);
});

test('les rôles inconnus et le retrait de son propre rôle admin sont refusés', async () => {
  const userRepository = { findOne: async () => ({ id: 2, roles: [] }), save: async value => value };
  const roleRepository = { find: async () => [{ id: 2, name: 'LECTEUR' }] };
  const service = new UsersService(userRepository, roleRepository);
  await assert.rejects(service.setRoles(2, ['LECTEUR', 'INCONNU'], 1), { status: 400 });
  await assert.rejects(service.setRoles(1, ['LECTEUR'], 1), { status: 400 });
});

test('les deux routes sont réservées aux administrateurs', () => {
  assert.deepEqual(Reflect.getMetadata('roles', UsersController.prototype.setRoles), ['ADMIN']);
  assert.deepEqual(Reflect.getMetadata('roles', RolesController.prototype.findAll), ['ADMIN']);
});
