import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import app from '../src/app.js';
import { User } from '../src/models/User.js';

const validUser = { name: 'Example User', email: 'USER@example.com', password: 'secure password' };
let mongoServer;

async function register(overrides = {}) {
  return request(app).post('/api/v1/auth/register').send({ ...validUser, ...overrides });
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await User.syncIndexes();
});

beforeEach(async () => {
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('authentication and profile API', () => {
  it('registers a user, normalizes email, hashes the password, and returns a JWT', async () => {
    const response = await register();
    expect(response.status).toBe(201);
    expect(response.body.data.token).toEqual(expect.any(String));
    expect(response.body.data.user.email).toBe('user@example.com');
    expect(response.body.data.user).not.toHaveProperty('passwordHash');
    const storedUser = await User.findOne({ email: 'user@example.com' }).select('+passwordHash');
    expect(storedUser.passwordHash).not.toBe(validUser.password);
    expect(await bcrypt.compare(validUser.password, storedUser.passwordHash)).toBe(true);
  });

  it('rejects duplicate registrations', async () => {
    await register();
    const response = await register({ email: 'user@example.com' });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EMAIL_IN_USE');
  });

  it('logs in with valid credentials and updates lastLoginAt', async () => {
    await register();
    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'USER@EXAMPLE.COM', password: validUser.password,
    });
    expect(response.status).toBe(200);
    expect(response.body.data.token).toEqual(expect.any(String));
    expect(response.body.data.user).not.toHaveProperty('passwordHash');
    expect(await User.findOne({ email: 'user@example.com' })).toHaveProperty('lastLoginAt');
  });

  it('returns the same generic error for incorrect credentials', async () => {
    await register();
    const wrongPassword = await request(app).post('/api/v1/auth/login').send({
      email: 'user@example.com', password: 'incorrect password',
    });
    const unknownEmail = await request(app).post('/api/v1/auth/login').send({
      email: 'unknown@example.com', password: 'incorrect password',
    });
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });

  it('rejects a protected route without a token', async () => {
    const response = await request(app).get('/api/v1/users/me');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('accepts a protected route with a valid token', async () => {
    const registration = await register();
    const response = await request(app).get('/api/v1/users/me')
      .set('Authorization', `Bearer ${registration.body.data.token}`);
    expect(response.status).toBe(200);
  });

  it('retrieves a safe user profile', async () => {
    const registration = await register();
    const response = await request(app).get('/api/v1/users/me')
      .set('Authorization', `Bearer ${registration.body.data.token}`);
    expect(response.body.data.user.name).toBe(validUser.name);
    expect(response.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('updates only allowed profile fields', async () => {
    const registration = await register();
    const response = await request(app).patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${registration.body.data.token}`)
      .send({
        name: 'Updated User', targetRoles: ['Software Developer', 'Software Developer'],
        experienceLevel: 'mid', yearsOfExperience: 4, preferredJobTitle: 'Frontend Developer',
      });
    expect(response.status).toBe(200);
    expect(response.body.data.user.name).toBe('Updated User');
    expect(response.body.data.user.targetRoles).toEqual(['Software Developer']);
    expect(response.body.data.user.profile.yearsOfExperience).toBe(4);

    const forbidden = await request(app).patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${registration.body.data.token}`)
      .send({ email: 'changed@example.com' });
    expect(forbidden.status).toBe(400);
  });

  it('changes the password after verifying the current password', async () => {
    const registration = await register();
    const response = await request(app).patch('/api/v1/users/me/password')
      .set('Authorization', `Bearer ${registration.body.data.token}`)
      .send({ currentPassword: validUser.password, newPassword: 'a newer secure password' });
    expect(response.status).toBe(200);

    const oldLogin = await request(app).post('/api/v1/auth/login').send({
      email: validUser.email, password: validUser.password,
    });
    const newLogin = await request(app).post('/api/v1/auth/login').send({
      email: validUser.email, password: 'a newer secure password',
    });
    expect(oldLogin.status).toBe(401);
    expect(newLogin.status).toBe(200);
  });
});
