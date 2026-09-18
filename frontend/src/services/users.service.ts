import api from './api';

export interface AssignableUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export function getUsers() {
  return api.get<AssignableUser[]>('/users/assignable');
}
