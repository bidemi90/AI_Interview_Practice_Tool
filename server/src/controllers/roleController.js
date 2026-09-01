import { predefinedRoles } from '../config/predefinedRoles.js';

export function listRoles(_request, response) {
  const roles = predefinedRoles.map(({ key, title, description }) => ({ key, title, description }));
  response.status(200).json({ success: true, data: { roles } });
}
