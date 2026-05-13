import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import mongoose from 'mongoose';

const API_URL = 'http://localhost:3000/api';
const request = supertest('http://localhost:3000');

describe('VQuest Requirements Verification', () => {
  let authToken;
  let roomId;
  let questionId;

  // 1. Ömer Said Karakuş - Register & Login
  describe('Auth & Profile (Ömer)', () => {
    it('should register a new user', async () => {
      const res = await request.post('/api/auth/register').send({
        username: 'testuser_' + Date.now(),
        email: `test_${Date.now()}@vquest.com`,
        password: 'Password123!'
      });
      expect(res.status).toBe(201);
    });

    it('should login and get token', async () => {
      // First register a dedicated test user
      const userData = {
        username: 'loginuser_' + Date.now(),
        email: `login_${Date.now()}@vquest.com`,
        password: 'Password123!'
      };
      await request.post('/api/auth/register').send(userData);
      
      const res = await request.post('/api/auth/login').send({
        email: userData.email,
        password: userData.password
      });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      authToken = res.body.token;
    });

    it('should view profile', async () => {
      const res = await request.get('/api/profile')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('username');
    });
  });

  // 2. Sedat Bakla - Room Management
  describe('Room Management (Sedat)', () => {
    it('should create a new game room', async () => {
      const res = await request.post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Room',
          maxParticipants: 5,
          duration: 30
        });
      expect(res.status).toBe(201);
      roomId = res.body._id;
      expect(res.body).toHaveProperty('joinCode');
    });

    it('should list active rooms', async () => {
      const res = await request.get('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should submit an answer (and fix logic)', async () => {
      // We need a question ID from the room
      const roomRes = await request.get(`/api/rooms/${roomId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      if (roomRes.body.questions && roomRes.body.questions.length > 0) {
        questionId = roomRes.body.questions[0]._id;
        const qText = roomRes.body.questions[0].text;
        const qCorrect = roomRes.body.questions[0].correctAnswer;

        const res = await request.post(`/api/rooms/${roomId}/answers`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questionId: questionId,
            answer: qCorrect
          });
        expect(res.status).toBe(200);
        expect(res.body.isCorrect).toBe(true);
      }
    });

    it('should get leaderboard', async () => {
      const res = await request.get(`/api/rooms/${roomId}/leaderboard`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // 3. Emir Omrak - Packages & Suggestions
  describe('Packages & Suggestions (Emir)', () => {
    it('should list packages', async () => {
      const res = await request.get('/api/packages')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
    });

    it('should make a suggestion', async () => {
      const res = await request.post('/api/suggestions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          questionText: 'What is JS?',
          options: ['A lang', 'A fruit'],
          correctAnswer: 'A lang'
        });
      expect(res.status).toBe(201);
    });
  });
});
