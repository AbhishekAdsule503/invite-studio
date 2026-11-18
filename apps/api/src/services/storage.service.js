import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_UPLOAD_DIR = path.resolve(__dirname, '../../uploads');

export class StorageService {
  constructor() {
    this.provider = config.storage?.provider || 'local';
    this.bucketName = config.storage?.supabase?.bucket || 'invitations';
    this.supabaseClient = null;

    if (
      this.provider === 'supabase' &&
      config.storage?.supabase?.url &&
      config.storage?.supabase?.serviceRoleKey
    ) {
      try {
        this.supabaseClient = createClient(
          config.storage.supabase.url,
          config.storage.supabase.serviceRoleKey,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false
            }
          }
        );
      } catch (err) {
        console.error('[StorageService] Failed to initialize Supabase client:', err.message);
      }
    }

    // Ensure local uploads directory exists for local development fallback
    if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
      try {
        fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
      } catch {
        // ignore in readonly or ephemeral setups
      }
    }
  }

  /**
   * Returns whether Supabase Storage is active and configured
   */
  isSupabaseActive() {
    return Boolean(this.supabaseClient);
  }

  /**
   * Uploads a file buffer to storage (Supabase or local fallback)
   * @param {Object} file Multer file object with buffer
   * @param {Object} options Upload options (folder, customName, userId)
   * @returns {Promise<{ url: string, path: string, provider: string }>}
   */
  async uploadFile(file, options = {}) {
    if (!file || !file.buffer) {
      const err = new Error('No file buffer provided for upload.');
      err.statusCode = 400;
      throw err;
    }

    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const folder = options.folder ? options.folder.replace(/^\/+|\/+$/g, '') : 'templates';
    const prefix = folder === 'templates' ? 'template' : folder;
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1e6);
    const safeFilename = `${prefix}_${timestamp}_${randomSuffix}${ext}`;
    const storagePath = `${folder}/${safeFilename}`;

    // 1. Supabase Storage Provider
    if (this.isSupabaseActive()) {
      try {
        const { error: uploadError } = await this.supabaseClient.storage
          .from(this.bucketName)
          .upload(storagePath, file.buffer, {
            contentType: file.mimetype || 'image/jpeg',
            cacheControl: '31536000',
            upsert: true
          });

        if (uploadError) {
          // If bucket does not exist, attempt auto-creation of public bucket
          if (uploadError.message?.toLowerCase().includes('not found') || uploadError.statusCode === 404) {
            console.warn(`[StorageService] Bucket "${this.bucketName}" not found. Attempting creation...`);
            await this.supabaseClient.storage.createBucket(this.bucketName, {
              public: true,
              fileSizeLimit: 10 * 1024 * 1024,
              allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
            });

            // Retry upload
            const { error: retryError } = await this.supabaseClient.storage
              .from(this.bucketName)
              .upload(storagePath, file.buffer, {
                contentType: file.mimetype || 'image/jpeg',
                cacheControl: '31536000',
                upsert: true
              });

            if (retryError) throw retryError;
          } else {
            throw uploadError;
          }
        }

        const { data: publicUrlData } = this.supabaseClient.storage
          .from(this.bucketName)
          .getPublicUrl(storagePath);

        const stablePublicUrl = publicUrlData.publicUrl;

        return {
          url: stablePublicUrl,
          previewImageUrl: stablePublicUrl,
          path: storagePath,
          provider: 'supabase'
        };
      } catch (err) {
        console.error('[StorageService] Supabase Storage upload failed:', err.message);
        // If Supabase upload fails and we are not strictly in production, fallback gracefully
        if (!config.isProduction) {
          console.warn('[StorageService] Falling back to local disk storage for development...');
        } else {
          const customErr = new Error(`File upload failed: ${err.message}`);
          customErr.statusCode = 502;
          throw customErr;
        }
      }
    }

    // 2. Local Disk Fallback (Development & Offline Mode)
    const localFilePath = path.join(LOCAL_UPLOAD_DIR, safeFilename);
    await fs.promises.writeFile(localFilePath, file.buffer);

    // Local file path
    const localUrl = `/uploads/${safeFilename}`;

    return {
      url: localUrl,
      previewImageUrl: localUrl,
      path: safeFilename,
      provider: 'local'
    };
  }

  /**
   * Deletes a file from storage if applicable
   * @param {string} pathOrUrl File path or public URL
   */
  async deleteFile(pathOrUrl) {
    if (!pathOrUrl) return;

    if (this.isSupabaseActive() && pathOrUrl.includes(this.bucketName)) {
      try {
        const parts = pathOrUrl.split(`${this.bucketName}/`);
        if (parts[1]) {
          await this.supabaseClient.storage.from(this.bucketName).remove([parts[1]]);
        }
      } catch (err) {
        console.warn('[StorageService] Failed to delete file from Supabase:', err.message);
      }
      return;
    }

    if (pathOrUrl.includes('/uploads/')) {
      try {
        const filename = pathOrUrl.split('/uploads/').pop();
        const localPath = path.join(LOCAL_UPLOAD_DIR, filename);
        if (fs.existsSync(localPath)) {
          await fs.promises.unlink(localPath);
        }
      } catch (err) {
        console.warn('[StorageService] Failed to delete local file:', err.message);
      }
    }
  }
}

export const storageService = new StorageService();
export default storageService;
