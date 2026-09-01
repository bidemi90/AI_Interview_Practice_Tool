import { loginUser, registerUser } from '../services/authService.js';

export async function register(request, response) {
  const result = await registerUser(request.validatedBody);
  response.status(201).json({ success: true, data: result });
}

export async function login(request, response) {
  const result = await loginUser(request.validatedBody);
  response.status(200).json({ success: true, data: result });
}
