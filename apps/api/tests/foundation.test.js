import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { prisma, testDatabaseConnection } from '../src/database/prisma.js';
import { scopeToTenant } from '../src/middlewares/tenant.js';
import {
  normalizePhone,
  sendOtpSchema,
  verifyOtpSchema,
  eventCreateSchema,
  rsvpSubmitSchema
} from '@smart-invitation/shared';

test('Project Foundation - Express Application', async (t) => {
  await t.test('createApp initializes without throwing', () => {
    const app = createApp();
    assert.ok(app, 'Express app should be created');
  });

  await t.test('createApp sets trust proxy to 1 for reverse proxy deployment', () => {
    const app = createApp();
    assert.strictEqual(app.get('trust proxy'), 1, 'Express trust proxy must be configured to 1');
  });

  await t.test('testDatabaseConnection handles unreachable DB gracefully without crashing', async () => {
    const result = await testDatabaseConnection();
    assert.strictEqual(typeof result.ok, 'boolean');
    assert.strictEqual(typeof result.message, 'string');
  });

  await t.test('Tenant scoping helper enforces userId filter', () => {
    const scoped = scopeToTenant('user-123', { name: 'Family Wedding' });
    assert.deepStrictEqual(scoped, {
      name: 'Family Wedding',
      userId: 'user-123'
    });
  });
});

test('Shared Validation Schemas & Utilities', async (t) => {
  await t.test('normalizePhone formats 10-digit Indian numbers to E.164', () => {
    assert.strictEqual(normalizePhone('9876543210'), '+919876543210');
    assert.strictEqual(normalizePhone('+919876543210'), '+919876543210');
  });

  await t.test('verifyOtpSchema validates 5-digit OTP', () => {
    const valid = verifyOtpSchema.safeParse({ mobile: '+919876543210', otp: '12345' });
    assert.strictEqual(valid.success, true);

    const invalidLength = verifyOtpSchema.safeParse({ mobile: '+919876543210', otp: '123' });
    assert.strictEqual(invalidLength.success, false);
  });

  await t.test('rsvpSubmitSchema validates IN/OUT', () => {
    const validIn = rsvpSubmitSchema.safeParse({ status: 'IN' });
    assert.strictEqual(validIn.success, true);

    const validOut = rsvpSubmitSchema.safeParse({ status: 'OUT' });
    assert.strictEqual(validOut.success, true);

    const invalid = rsvpSubmitSchema.safeParse({ status: 'MAYBE' });
    assert.strictEqual(invalid.success, false);
  });
});

