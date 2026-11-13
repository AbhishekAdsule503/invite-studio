import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import prisma from '../src/database/prisma.js';

test('Authentication Module - Full Flow', async (t) => {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1/auth`;

  const testMobile = '+919876500001';

  // Cleanup any previous test data for this test number
  await prisma.otpChallenge.deleteMany({ where: { mobile: testMobile } });
  await prisma.user.deleteMany({ where: { mobile: testMobile } });

  let accessToken = '';
  let refreshToken = '';

  t.after(async () => {
    // Teardown
    await prisma.otpChallenge.deleteMany({ where: { mobile: testMobile } });
    await prisma.user.deleteMany({ where: { mobile: testMobile } });
    await new Promise((resolve) => server.close(resolve));
  });

  await t.test('1. POST /send-otp with invalid mobile should fail with 400', async () => {
    const res = await fetch(`${baseUrl}/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '123' })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  await t.test('2. POST /send-otp with valid mobile sends OTP successfully', async () => {
    const res = await fetch(`${baseUrl}/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: testMobile })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.demoOtp, '12345');
    assert.strictEqual(typeof body.resendCooldownSeconds, 'number');

    // Verify OTP challenge was persisted to database
    const challenge = await prisma.otpChallenge.findFirst({
      where: { mobile: testMobile },
      orderBy: { createdAt: 'desc' }
    });
    assert.ok(challenge, 'Challenge record should exist in DB');
    assert.strictEqual(challenge.attempts, 0);
  });

  await t.test('3. POST /send-otp during cooldown window returns 429', async () => {
    const res = await fetch(`${baseUrl}/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: testMobile })
    });

    assert.strictEqual(res.status, 429);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.error, /Please wait \d+s before requesting a new code/);
  });

  await t.test('4. POST /verify-otp with incorrect OTP returns 400 and tracks attempts', async () => {
    const res = await fetch(`${baseUrl}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: testMobile, otp: '99999' })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.error, /Invalid verification code/);

    const challenge = await prisma.otpChallenge.findFirst({
      where: { mobile: testMobile },
      orderBy: { createdAt: 'desc' }
    });
    assert.strictEqual(challenge.attempts, 1);
  });

  await t.test('5. POST /verify-otp with valid 5-digit demo OTP (12345) logs in and issues JWT tokens', async () => {
    const res = await fetch(`${baseUrl}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: testMobile, otp: '12345' })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.accessToken, 'Access token should be issued');
    assert.ok(body.refreshToken, 'Refresh token should be issued');
    assert.strictEqual(body.user.mobile, testMobile);
    assert.strictEqual(body.user.role, 'HOST');
    assert.strictEqual(body.isNewUser, true);

    accessToken = body.accessToken;
    refreshToken = body.refreshToken;

    // Verify trial subscription bootstrap
    assert.ok(body.user.subscription, 'Subscription should be attached');
    assert.strictEqual(body.user.subscription.status, 'TRIAL');

    // Verify audit log entry was created
    const auditLog = await prisma.auditLog.findFirst({
      where: { actorId: body.user.id }
    });
    assert.ok(auditLog, 'Audit log must record login event');
  });

  await t.test('6. GET /me without token returns 401', async () => {
    const res = await fetch(`${baseUrl}/me`);
    assert.strictEqual(res.status, 401);
  });

  await t.test('7. GET /me with valid JWT Bearer returns authenticated host profile', async () => {
    const res = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.user.mobile, testMobile);
    assert.strictEqual(body.user.role, 'HOST');
    assert.strictEqual(body.user.subscription.status, 'TRIAL');
  });

  await t.test('8. POST /refresh returns a fresh access token', async () => {
    const res = await fetch(`${baseUrl}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.accessToken);
    assert.ok(body.refreshToken);
  });

  await t.test('9. POST /logout with valid token succeeds', async () => {
    const res = await fetch(`${baseUrl}/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
  });
});

test('Authentication Module - Name and Email Registration & Profile Flow', async (t) => {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1/auth`;

  const newRegMobile = '+919876500088';
  const newRegEmail = 'Priya.Sharma@Example.COM'; // Test normalization
  const incompleteMobile = '+919876500077';

  // Cleanup test numbers before run
  await prisma.otpChallenge.deleteMany({
    where: { mobile: { in: [newRegMobile, incompleteMobile] } }
  });
  await prisma.user.deleteMany({
    where: {
      OR: [
        { mobile: { in: [newRegMobile, incompleteMobile] } },
        { email: 'priya.sharma@example.com' }
      ]
    }
  });

  t.after(async () => {
    // Teardown
    await prisma.otpChallenge.deleteMany({
      where: { mobile: { in: [newRegMobile, incompleteMobile] } }
    });
    await prisma.user.deleteMany({
      where: {
        OR: [
          { mobile: { in: [newRegMobile, incompleteMobile] } },
          { email: 'priya.sharma@example.com' }
        ]
      }
    });
    await new Promise((resolve) => server.close(resolve));
  });

  await t.test('1. Registration with missing or short name is rejected with 400', async () => {
    const res = await fetch(`${baseUrl}/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobile: newRegMobile,
        name: ' ',
        email: 'test@example.com',
        isRegistration: true
      })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    const nameMatch =
      /name/i.test(body.error) ||
      (body.details && body.details.some((d) => /name/i.test(d.field) || /name/i.test(d.message)));
    assert.ok(nameMatch, 'Error response should mention name validation error');
  });

  await t.test('2. Registration with invalid email format is rejected with 400', async () => {
    const res = await fetch(`${baseUrl}/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobile: newRegMobile,
        name: 'Priya Sharma',
        email: 'not-an-email',
        isRegistration: true
      })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    const emailMatch =
      /email/i.test(body.error) ||
      (body.details && body.details.some((d) => /email/i.test(d.field) || /email/i.test(d.message)));
    assert.ok(emailMatch, 'Error response should mention email validation error');
  });

  await t.test('3. Valid registration sends OTP successfully', async () => {
    const res = await fetch(`${baseUrl}/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobile: newRegMobile,
        name: 'Priya Sharma',
        email: newRegEmail,
        isRegistration: true
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.demoOtp, '12345');
  });

  let newRegToken = '';
  let newRegUserId = '';

  await t.test('4. Verify OTP for new registration saves name, normalized email and 30-day trial', async () => {
    const res = await fetch(`${baseUrl}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobile: newRegMobile,
        otp: '12345',
        name: 'Priya Sharma',
        email: newRegEmail
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.isNewUser, true);
    assert.strictEqual(body.isProfileComplete, true);
    assert.strictEqual(body.user.name, 'Priya Sharma');
    assert.strictEqual(body.user.email, 'priya.sharma@example.com');
    assert.strictEqual(body.user.subscription.status, 'TRIAL');

    newRegToken = body.accessToken;
    newRegUserId = body.user.id;

    // Verify exactly one trial subscription exists
    const subCount = await prisma.userSubscription.count({
      where: { userId: newRegUserId }
    });
    assert.strictEqual(subCount, 1, 'Only one trial subscription must be created');
  });

  await t.test('5. Duplicate email registration attempt is rejected with 400', async () => {
    const res = await fetch(`${baseUrl}/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobile: '+919876500055',
        name: 'Another User',
        email: 'PRIYA.sharma@example.com', // Duplicate email under different mobile
        isRegistration: true
      })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.error, /already exists/i);
  });

  await t.test('6. Existing user login without entering name or email succeeds', async () => {
    // Clear cooldown for test mobile
    await prisma.otpChallenge.deleteMany({ where: { mobile: newRegMobile } });

    const sendRes = await fetch(`${baseUrl}/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobile: newRegMobile,
        isRegistration: false
      })
    });

    assert.strictEqual(sendRes.status, 200);

    const verifyRes = await fetch(`${baseUrl}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobile: newRegMobile,
        otp: '12345'
      })
    });

    assert.strictEqual(verifyRes.status, 200);
    const verifyBody = await verifyRes.json();
    assert.strictEqual(verifyBody.success, true);
    assert.strictEqual(verifyBody.isNewUser, false);
    assert.strictEqual(verifyBody.user.name, 'Priya Sharma');
    assert.strictEqual(verifyBody.user.email, 'priya.sharma@example.com');
    assert.strictEqual(verifyBody.isProfileComplete, true);

    // Verify trial subscription is NOT duplicated
    const subCount = await prisma.userSubscription.count({
      where: { userId: newRegUserId }
    });
    assert.strictEqual(subCount, 1, 'Subscription count must remain 1');
  });

  let incompleteToken = '';
  let incompleteUserId = '';

  await t.test('7. Existing user with incomplete profile is detected with isProfileComplete=false', async () => {
    // Create an incomplete user directly (simulating legacy user without name/email)
    let trialPlan = await prisma.subscriptionPlan.findUnique({ where: { code: 'TRIAL' } });
    if (!trialPlan) {
      trialPlan = await prisma.subscriptionPlan.create({
        data: {
          name: 'Free Trial',
          code: 'TRIAL',
          priceYearly: 0,
          currency: 'INR',
          maxEvents: 3,
          maxGuestsPerEvent: 50,
          isActive: true
        }
      });
    }

    const incompleteUser = await prisma.user.create({
      data: {
        mobile: incompleteMobile,
        role: 'HOST',
        isActive: true,
        name: null,
        email: null,
        subscription: {
          create: {
            planId: trialPlan.id,
            status: 'TRIAL',
            startsAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        }
      }
    });

    incompleteUserId = incompleteUser.id;

    // Send OTP and verify login
    await fetch(`${baseUrl}/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: incompleteMobile })
    });

    const verifyRes = await fetch(`${baseUrl}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobile: incompleteMobile,
        otp: '12345'
      })
    });

    assert.strictEqual(verifyRes.status, 200);
    const verifyBody = await verifyRes.json();
    assert.strictEqual(verifyBody.isProfileComplete, false);
    assert.strictEqual(verifyBody.user.name, null);
    assert.strictEqual(verifyBody.user.email, null);

    incompleteToken = verifyBody.accessToken;

    // Check /me also returns isProfileComplete=false
    const meRes = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${incompleteToken}` }
    });
    const meBody = await meRes.json();
    assert.strictEqual(meBody.user.isProfileComplete, false);
  });

  await t.test('8. POST /complete-profile rejects duplicate email with 400', async () => {
    const res = await fetch(`${baseUrl}/complete-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${incompleteToken}`
      },
      body: JSON.stringify({
        name: 'Rahul Verma',
        email: 'priya.sharma@example.com' // Already belongs to Priya
      })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.error, /already exists/i);
  });

  await t.test('9. POST /complete-profile successfully completes profile without duplicating subscription', async () => {
    const res = await fetch(`${baseUrl}/complete-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${incompleteToken}`
      },
      body: JSON.stringify({
        name: 'Rahul Verma',
        email: 'rahul.verma@example.com'
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.user.name, 'Rahul Verma');
    assert.strictEqual(body.user.email, 'rahul.verma@example.com');
    assert.strictEqual(body.user.isProfileComplete, true);

    // Verify DB state
    const userInDb = await prisma.user.findUnique({
      where: { id: incompleteUserId },
      include: { subscription: true }
    });
    assert.strictEqual(userInDb.name, 'Rahul Verma');
    assert.strictEqual(userInDb.email, 'rahul.verma@example.com');

    const subCount = await prisma.userSubscription.count({
      where: { userId: incompleteUserId }
    });
    assert.strictEqual(subCount, 1, 'Subscription must not be duplicated on profile completion');

    // GET /me should now report isProfileComplete=true
    const meRes = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${incompleteToken}` }
    });
    const meBody = await meRes.json();
    assert.strictEqual(meBody.user.isProfileComplete, true);
    assert.strictEqual(meBody.user.name, 'Rahul Verma');
  });
});
