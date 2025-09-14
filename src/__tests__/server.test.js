const request = require('supertest');
const app = require('../server');

describe('Server Health Check', () => {
  test('GET /health should return success response', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      message: 'Srinagar Local Gems API is running',
      timestamp: expect.any(String)
    });
  });

  test('GET /api/nonexistent should return 404', async () => {
    const response = await request(app)
      .get('/api/nonexistent')
      .expect(404);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'The requested endpoint does not exist',
        details: {
          method: 'GET',
          path: '/api/nonexistent'
        }
      },
      timestamp: expect.any(String)
    });
  });
});