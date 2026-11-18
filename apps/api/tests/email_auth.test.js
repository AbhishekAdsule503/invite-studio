 import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import prisma from '../src/database/prisma.js';
import mailService from '../src/services/mail.service.js';

test('Email Authentication Module - Independent Flow', async (t) => {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1/auth`;

  const testEmail = 'test_user_unique_99@example.com';
  const testMobile = '+919876543999';
  const identifier = `email:${testEmail}`;
  let capturedSentOtp = '';

  // Cleanup test records
  await prisma.otpChallenge.deleteMany({ where: { mobile: { in: [identifier, testMobile] } } });
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await prisma.user.deleteMany({ where: { mobile: testMobile } });

  t.after(async () => {
    await prisma.otpChallenge.deleteMany({ where: { mobile: { in: [identifier, testMobile] } } });
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.user.deleteMany({ where: { mobile: testMobile } });
    await new Promise((resolve) => server.close(resolve));
  });

  await t.test('1. POST /send-email-otp with invalid email format should fail with 400', async () => {
    const res = await fetch(`${baseUrl}/send-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid-email' })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  await t.test('2. POST /send-email-otp sends OTP and persists hashed challenge', async () => {
    // Stub mailService to avoid sending external emails during automated unit tests
    const originalSend = mailService.sendOtpEmail;
    let sentTo = '';
    let sentOtp = '';
    mailService.sendOtpEmail = async ({ to, otp }) => {
      sentTo = to;
      sentOtp = otp;
      capturedSentOtp = otp;
      return { success: true, messageId: '<test-message-id@example.com>' };
    };

    try {
      const res = await fetch(`${baseUrl}/send-email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, name: 'Priya Sharma', isRegistration: true })
      });

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.email, testEmail);
      assert.strictEqual(sentTo, testEmail);
      assert.strictEqual(typeof sentOtp, 'string');
      assert.strictEqual(sentOtp.length, 5);
      // Ensure demoOtp is NEVER exposed in the response
      assert.strictEqual(body.demoOtp, undefined, 'demoOtp must never be returned in email OTP response');

      // Verify challenge in DB
      const challenge = await prisma.otpChallenge.findFirst({
        where: { mobile: identifier },
        orderBy: { createdAt: 'desc' }
      });
      assert.ok(challenge, 'Challenge record should exist in DB');
      assert.strictEqual(challenge.attempts, 0);
      // Verify never stored in plaintext
      assert.notStrictEqual(challenge.hashedOtp, sentOtp);
      assert.ok(challenge.hashedOtp.startsWith('$2'), 'Must be bcrypt hash');
    } finally {
      mailService.sendOtpEmail = originalSend;
    }
  });

  await t.test('3. POST /send-email-otp within 60s cooldown fails with 429', async () => {
    const res = await fetch(`${baseUrl}/send-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, isRegistration: true })
    });

    assert.strictEqual(res.status, 429);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.error, /Please wait \d+s before requesting a new code/i);
  });

  await t.test('4. POST /verify-email-otp with invalid code fails and increments attempt counter', async () => {
    const res = await fetch(`${baseUrl}/verify-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otp: '00000' })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);

    const challenge = await prisma.otpChallenge.findFirst({
      where: { mobile: identifier },
      orderBy: { createdAt: 'desc' }
    });
    assert.strictEqual(challenge.attempts, 1);
  });

  await t.test('5. POST /verify-email-otp with correct OTP creates user and sets emailVerifiedAt', async () => {
    // Verify using the actual cryptographically generated OTP (not demo code)
    assert.ok(capturedSentOtp, 'Must have captured OTP from sendEmailOtp');
    const res = await fetch(`${baseUrl}/verify-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otp: capturedSentOtp, name: 'Priya Sharma' })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.accessToken, 'Access token must be returned');
    assert.ok(body.refreshToken, 'Refresh token must be returned');
    assert.strictEqual(body.user.email, testEmail);
    assert.strictEqual(body.user.name, 'Priya Sharma');
    assert.ok(body.user.emailVerifiedAt, 'emailVerifiedAt must be set');
    assert.strictEqual(body.isNewUser, true);

    // Verify single-use in DB
    const challenge = await prisma.otpChallenge.findFirst({
      where: { mobile: identifier },
      orderBy: { createdAt: 'desc' }
    });
    assert.ok(challenge.verifiedAt, 'Challenge must be marked verified (single-use)');
  });

  await t.test('6. Single-use: Reusing the same OTP immediately fails', async () => {
    const res = await fetch(`${baseUrl}/verify-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, otp: capturedSentOtp })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.error, /No active verification challenge found/i);
  });

  await t.test('7. Duplicate registration: Registering with existing email fails with 400', async () => {
    const res = await fetch(`${baseUrl}/send-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, isRegistration: true })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.error, /already exists/i);
  });

  await t.test('8. Mobile OTP regression: Existing mobile OTP flow works 100% independently', async () => {
    // 1. Send mobile OTP
    const resSend = await fetch(`${baseUrl}/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobile: testMobile,
        name: 'Mobile User',
        email: 'mobile_user_test@example.com',
        isRegistration: true
      })
    });
    assert.strictEqual(resSend.status, 200);

    // 2. Verify mobile OTP
    const resVerify = await fetch(`${baseUrl}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobile: testMobile,
        otp: '12345',
        name: 'Mobile User',
        email: 'mobile_user_test@example.com'
      })
    });
    assert.strictEqual(resVerify.status, 200);
    const body = await resVerify.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.user.mobile, testMobile);
    assert.strictEqual(body.user.name, 'Mobile User');
  });
});
