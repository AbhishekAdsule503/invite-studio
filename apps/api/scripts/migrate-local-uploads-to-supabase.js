/**
 * Safe Migration Script: Migrate Local Uploads to Supabase Storage
 * 
 * Scans PostgreSQL Event and InvitationTemplate records for local `/uploads/...` references,
 * uploads corresponding local files to Supabase Storage, and updates the database records
 * with stable public URLs.
 * 
 * Usage:
 *   node apps/api/scripts/migrate-local-uploads-to-supabase.js
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { prisma } from '../src/database/prisma.js';
import storageService from '../src/services/storage.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_UPLOADS_DIR = path.resolve(__dirname, '../uploads');

async function main() {
  console.log('--- INVITE STUDIO: Local Uploads to Supabase Storage Migration ---');

  if (!storageService.isSupabaseActive()) {
    console.warn('[ABORTED] Supabase Storage credentials are not configured in environment.');
    console.warn('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to perform migration.');
    process.exit(0);
  }

  console.log(`Target Supabase bucket: ${storageService.bucketName}`);
  console.log(`Local uploads directory: ${LOCAL_UPLOADS_DIR}`);

  let eventsMigrated = 0;
  let templatesMigrated = 0;

  // 1. Migrate Event Cover Images
  const events = await prisma.event.findMany({
    where: {
      coverImageUrl: {
        contains: '/uploads/'
      }
    }
  });

  console.log(`Found ${events.length} Event record(s) with local upload paths.`);

  for (const ev of events) {
    const filename = ev.coverImageUrl.split('/uploads/').pop();
    const localPath = path.join(LOCAL_UPLOADS_DIR, filename);

    if (fs.existsSync(localPath)) {
      try {
        const buffer = await fs.promises.readFile(localPath);
        const ext = path.extname(filename).toLowerCase();
        const mimeMap = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.webp': 'image/webp'
        };
        const mimetype = mimeMap[ext] || 'image/jpeg';

        const uploadRes = await storageService.uploadFile(
          { buffer, mimetype, originalname: filename },
          { folder: 'events' }
        );

        await prisma.event.update({
          where: { id: ev.id },
          data: { coverImageUrl: uploadRes.url }
        });

        console.log(`✔ Migrated Event [${ev.id}] "${ev.name}": ${uploadRes.url}`);
        eventsMigrated++;
      } catch (err) {
        console.error(`✖ Failed to migrate Event [${ev.id}]:`, err.message);
      }
    } else {
      console.warn(`⚠ Local file not found on disk for Event [${ev.id}]: ${filename}`);
    }
  }

  // 2. Migrate Custom Template Preview Images
  const templates = await prisma.invitationTemplate.findMany({
    where: {
      previewImageUrl: {
        contains: '/uploads/'
      }
    }
  });

  console.log(`Found ${templates.length} InvitationTemplate record(s) with local upload paths.`);

  for (const tmpl of templates) {
    const filename = tmpl.previewImageUrl.split('/uploads/').pop();
    const localPath = path.join(LOCAL_UPLOADS_DIR, filename);

    if (fs.existsSync(localPath)) {
      try {
        const buffer = await fs.promises.readFile(localPath);
        const ext = path.extname(filename).toLowerCase();
        const mimeMap = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.webp': 'image/webp'
        };
        const mimetype = mimeMap[ext] || 'image/jpeg';

        const uploadRes = await storageService.uploadFile(
          { buffer, mimetype, originalname: filename },
          { folder: 'templates' }
        );

        await prisma.invitationTemplate.update({
          where: { id: tmpl.id },
          data: { previewImageUrl: uploadRes.url }
        });

        console.log(`✔ Migrated Template [${tmpl.id}] "${tmpl.title}": ${uploadRes.url}`);
        templatesMigrated++;
      } catch (err) {
        console.error(`✖ Failed to migrate Template [${tmpl.id}]:`, err.message);
      }
    } else {
      console.warn(`⚠ Local file not found on disk for Template [${tmpl.id}]: ${filename}`);
    }
  }

  console.log('\n--- Migration Summary ---');
  console.log(`Events updated: ${eventsMigrated}`);
  console.log(`Templates updated: ${templatesMigrated}`);
  console.log('Migration completed safely without deleting local backup files.');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
