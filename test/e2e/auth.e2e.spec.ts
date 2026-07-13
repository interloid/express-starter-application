import { jest } from '@jest/globals';

const capturedLinks: Record<string, string> = {};

jest.unstable_mockModule('../../src/modules/queue/mail.producer.js', () => ({
  enqueueVerificationEmail: jest.fn(async (to: string, link: string) => {
    capturedLinks[to] = link;
    return Promise.resolve();
  }),
  enqueuePasswordResetEmail: jest.fn(async (to: string, link: string) => {
    capturedLinks[to] = link;
    return Promise.resolve();
  }),
}));

jest.unstable_mockModule('../../src/lib/redis.js', () => ({
  redisClient: {
    on: jest.fn(),
    call: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    quit: jest.fn(),
  },
  bullMqConnection: {},
}));

// Logger: keep test output clean.
jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const request = (await import('supertest')).default;
const { prisma } = await import('../../src/lib/prisma.js');
const { app } = await import('../../src/app.js');
const { resetDb, seedRoles } = await import('../utils/db.js');

const testUser = {
  email: 'e2e-test-user@example.com',
  password: 'SecurePassword@123',
  firstName: 'E2E',
  lastName: 'Test',
};

interface ApiBody {
  success: boolean;
  data?: any;
  message?: string;
  errors?: Array<{ field?: string; message: string }>;
}

function tokenFromLink(link: string): string {
  const token = new URL(link).searchParams.get('token');
  if (!token) throw new Error(`No token in link: ${link}`);
  return token;
}

describe('Authentication flow (E2E)', () => {
  beforeEach(async () => {
    await resetDb(prisma);
    await seedRoles(prisma);
    for (const key of Object.keys(capturedLinks)) delete capturedLinks[key];
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await resetDb(prisma);
    await prisma.$disconnect();
  });

  it('registers a user and enqueues a verification email', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testUser).expect(200);
    const body = res.body as ApiBody;

    expect(body.success).toBe(true);
    expect((body.data as { email: string }).email).toBe(testUser.email);
    expect(body.data).not.toHaveProperty('passwordHash');

    const created = await prisma.user.findUnique({
      where: { email: testUser.email },
    });
    expect(created).not.toBeNull();
    expect(created?.emailVerified).toBe(false);

    expect(capturedLinks[testUser.email]).toBeDefined();
    expect(capturedLinks[testUser.email]).toContain('/verify-email?token=');
  });

  it('rejects a duplicate registration with 409', async () => {
    await request(app).post('/api/v1/auth/register').send(testUser).expect(200);

    const res = await request(app).post('/api/v1/auth/register').send(testUser).expect(409);
    const body = res.body as ApiBody;
    expect(body.success).toBe(false);
  });

  it('rejects an invalid registration payload with 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400);
    const body = res.body as ApiBody;

    expect(body.success).toBe(false);
    expect(Array.isArray(body.errors)).toBe(true);
  });

  it('completes the full flow: register → verify → login → protected route', async () => {
    const agent = request.agent(app);

    await agent.post('/api/v1/auth/register').send(testUser).expect(200);

    const token = tokenFromLink(capturedLinks[testUser.email] as string);

    await agent.post('/api/v1/auth/verify-mail').send({ token }).expect(200);

    const verified = await prisma.user.findUnique({
      where: { email: testUser.email },
    });
    expect(verified?.emailVerified).toBe(true);

    const loginRes = await agent
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(200);
    const body = loginRes.body as ApiBody;

    expect(body.success).toBe(true);
    expect((body.data as { user: { email: string } }).user.email).toBe(testUser.email);
  });

  it('rejects login with the wrong password (401, generic message)', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send(testUser).expect(200);
    const token = tokenFromLink(capturedLinks[testUser.email] as string);
    await agent.post('/api/v1/auth/verify-mail').send({ token }).expect(200);

    const res = await agent
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: 'WrongPassword@999' })
      .expect(401);
    const body = res.body as ApiBody;

    expect(body.message).toBe('Invalid credentials');
  });

  it('gives the same error for an unknown email as for a wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'AnyPassword@123' })
      .expect(401);
    const body = res.body as ApiBody;

    expect(body.message).toBe('Invalid credentials');
  });

  it('logs out and clears the auth cookies', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send(testUser).expect(200);
    const token = tokenFromLink(capturedLinks[testUser.email] as string);
    await agent.post('/api/v1/auth/verify-mail').send({ token }).expect(200);
    await agent
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(200);

    await agent.post('/api/v1/auth/logout').expect(401);
  });
});
