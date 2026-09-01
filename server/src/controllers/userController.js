import { changePassword } from '../services/authService.js';
import { updateUserProfile } from '../services/userService.js';

export function getMe(request, response) {
  response.status(200).json({ success: true, data: { user: request.user } });
}

export async function updateMe(request, response) {
  const user = await updateUserProfile(request.user.id, request.validatedBody);
  response.status(200).json({ success: true, data: { user } });
}

export async function updatePassword(request, response) {
  const { currentPassword, newPassword } = request.validatedBody;
  await changePassword(request.user.id, currentPassword, newPassword);
  response.status(200).json({ success: true, data: { message: 'Password updated successfully.' } });
}
