const request = require('supertest');

jest.useFakeTimers();

jest.mock('@notionhq/client', () => {
  return {
    Client: jest.fn().mockImplementation(() => ({
      databases: { query: jest.fn().mockResolvedValue({ results: [] }) }
    }))
  };
});

const app = require('../index');
jest.useRealTimers();

afterAll(() => {
  jest.clearAllTimers();
});

describe('GET /search', () => {
  it('returns 200 and JSON', async () => {
    const res = await request(app).get('/search');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
