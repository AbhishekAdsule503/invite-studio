import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';
import prisma from '../src/database/prisma.js';
import authService from '../src/services/auth.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Template Upload & Custom Invitation Design Integration Test Suite', async (t) => {
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  const hostMobile = '+919876543201';
  const otherMobile = '+919876543202';

  // Cleanup
  await prisma.otpChallenge.deleteMany({ where: { mobile: { in: [hostMobile, otherMobile] } } });
  await prisma.user.deleteMany({ where: { mobile: { in: [hostMobile, otherMobile] } } });

  // 1. Authenticate Host
  await authService.requestOtp(hostMobile);
  const hostAuth = await authService.verifyOtpAndLogin(hostMobile, '12345', { name: 'Host Tester' });
  const hostToken = hostAuth.accessToken;

  // 2. Authenticate non-HOST user (simulate a user with another role if applicable)
  // Default new user has role 'HOST', so let's verify hostToken
  assert.ok(hostToken, 'Host token must exist');

  // Dummy 1x1 pixel image buffers for test uploads
  const sampleJpgBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
    0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
    0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
    0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00,
    0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda,
    0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x7f, 0x00, 0xff, 0xd9
  ]);

  const samplePngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82
  ]);

  // Valid RIFF/WEBP header buffer
  const sampleWebpBuffer = Buffer.concat([
    Buffer.from('RIFF'),
    Buffer.from([0x1a, 0x00, 0x00, 0x00]),
    Buffer.from('WEBPVP8 '),
    Buffer.from([0x0e, 0x00, 0x00, 0x00]),
    Buffer.from([0x30, 0x01, 0x00, 0x9d, 0x01, 0x2a, 0x01, 0x00, 0x01, 0x00, 0x02, 0x00, 0x34, 0x25])
  ]);

  let uploadedJpgUrl = '';

  t.after(async () => {
    await prisma.otpChallenge.deleteMany({ where: { mobile: { in: [hostMobile, otherMobile] } } });
    await prisma.user.deleteMany({ where: { mobile: { in: [hostMobile, otherMobile] } } });
    await new Promise((resolve) => server.close(resolve));
  });

  await t.test('1. POST /templates/upload without authentication returns 401', async () => {
    const formData = new FormData();
    formData.append('image', new Blob([sampleJpgBuffer], { type: 'image/jpeg' }), 'invite_card.jpg');

    const res = await fetch(`${baseUrl}/templates/upload`, {
      method: 'POST',
      body: formData
    });

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error, 'Authentication required. Missing or malformed token.');
  });

  await t.test('2. POST /templates/upload with malformed token returns 401', async () => {
    const formData = new FormData();
    formData.append('image', new Blob([sampleJpgBuffer], { type: 'image/jpeg' }), 'invite_card.jpg');

    const res = await fetch(`${baseUrl}/templates/upload`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer invalid.malformed.token'
      },
      body: formData
    });

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error, 'Invalid authentication token.');
  });

  await t.test('3. POST /templates/upload with valid HOST token uploads JPG successfully (< 5MB)', async () => {
    const formData = new FormData();
    formData.append('image', new Blob([sampleJpgBuffer], { type: 'image/jpeg' }), 'royal_wedding.jpg');

    const res = await fetch(`${baseUrl}/templates/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hostToken}`
      },
      body: formData
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.imageUrl, 'Must return imageUrl');
    assert.ok(body.imageUrl.startsWith('/uploads/template_'), 'URL must point to static uploads');
    assert.ok(body.imageUrl.endsWith('.jpg'), 'File extension must be preserved');
    assert.strictEqual(body.previewImageUrl, body.imageUrl);
    assert.strictEqual(body.template?.previewImageUrl, body.imageUrl);

    uploadedJpgUrl = body.imageUrl;

    // Verify static serving of the uploaded image
    const staticRes = await fetch(`http://127.0.0.1:${port}${body.imageUrl}`);
    assert.strictEqual(staticRes.status, 200, 'Static uploads server must serve the uploaded image');
    assert.strictEqual(staticRes.headers.get('content-type'), 'image/jpeg');
  });

  await t.test('4. POST /templates/upload with valid PNG file succeeds', async () => {
    const formData = new FormData();
    formData.append('image', new Blob([samplePngBuffer], { type: 'image/png' }), 'birthday_art.png');

    const res = await fetch(`${baseUrl}/templates/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hostToken}`
      },
      body: formData
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.imageUrl.endsWith('.png'));

    const staticRes = await fetch(`http://127.0.0.1:${port}${body.imageUrl}`);
    assert.strictEqual(staticRes.status, 200);
    assert.strictEqual(staticRes.headers.get('content-type'), 'image/png');
  });

  await t.test('5. POST /templates/upload with valid WebP file succeeds', async () => {
    const formData = new FormData();
    formData.append('image', new Blob([sampleWebpBuffer], { type: 'image/webp' }), 'anniversary_luxe.webp');

    const res = await fetch(`${baseUrl}/templates/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hostToken}`
      },
      body: formData
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.imageUrl.endsWith('.webp'));
  });

  await t.test('6. POST /templates/upload with oversized file (> 5MB) returns 400', async () => {
    // 5.5 MB dummy buffer
    const oversizedBuffer = Buffer.alloc(5.5 * 1024 * 1024);
    const formData = new FormData();
    formData.append('image', new Blob([oversizedBuffer], { type: 'image/jpeg' }), 'huge_card.jpg');

    const res = await fetch(`${baseUrl}/templates/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hostToken}`
      },
      body: formData
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.error, /under 5MB/i);
  });

  await t.test('7. POST /templates/upload with invalid file type (e.g. text/plain) returns 400', async () => {
    const textBuffer = Buffer.from('Not an image file');
    const formData = new FormData();
    formData.append('image', new Blob([textBuffer], { type: 'text/plain' }), 'document.txt');

    const res = await fetch(`${baseUrl}/templates/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hostToken}`
      },
      body: formData
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.error, /Invalid image format/i);
  });

  await t.test('8. POST /templates/upload with missing file returns 400', async () => {
    const formData = new FormData();
    formData.append('title', 'Template without image');

    const res = await fetch(`${baseUrl}/templates/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hostToken}`
      },
      body: formData
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.error, /Please select an image file/i);
  });

  await t.test('9. Save custom template with uploaded image URL and verify in template list', async () => {
    assert.ok(uploadedJpgUrl, 'Must have uploaded image URL');

    const createRes = await fetch(`${baseUrl}/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hostToken}`
      },
      body: JSON.stringify({
        title: 'Royal Luxury Wedding Peacock',
        eventType: 'WEDDING',
        previewImageUrl: uploadedJpgUrl,
        defaultMessage: 'Namaste {{guestName}}, join our wedding celebration!'
      })
    });

    assert.strictEqual(createRes.status, 201);
    const createBody = await createRes.json();
    assert.strictEqual(createBody.success, true);
    assert.strictEqual(createBody.template.title, 'Royal Luxury Wedding Peacock');
    assert.strictEqual(createBody.template.previewImageUrl, uploadedJpgUrl);
    assert.strictEqual(createBody.template.isSystem, false);

    // Verify GET /templates returns the created custom template with its image
    const listRes = await fetch(`${baseUrl}/templates?eventType=WEDDING`, {
      headers: {
        Authorization: `Bearer ${hostToken}`
      }
    });

    assert.strictEqual(listRes.status, 200);
    const listBody = await listRes.json();
    assert.strictEqual(listBody.success, true);
    const customTmpl = listBody.templates.find((t) => t.id === createBody.template.id);
    assert.ok(customTmpl, 'Newly created custom template must appear in templates list');
    assert.strictEqual(customTmpl.previewImageUrl, uploadedJpgUrl);
  });
});
