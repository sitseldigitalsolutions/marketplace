import Busboy from 'busboy';
import type { Readable } from 'node:stream';
import { AppError } from '../shared/errors';
import type { UploadedFile, UploadOptions } from './types';

const MIME: Record<UploadOptions['allowed'], string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  document: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  spreadsheet: [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
};

/**
 * Detect the real file type from its magic bytes. The client-declared MIME type and file
 * extension are never trusted on their own.
 */
export function sniffMime(buf: Buffer, declared: string, filename: string): string | null {
  const b = buf;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return 'image/png';
  if (b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP')
    return 'image/webp';
  if (b.length >= 6 && (b.toString('ascii', 0, 6) === 'GIF87a' || b.toString('ascii', 0, 6) === 'GIF89a'))
    return 'image/gif';
  if (b.length >= 5 && b.toString('ascii', 0, 5) === '%PDF-') return 'application/pdf';
  // XLSX is a ZIP container
  if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04 && /\.xlsx$/i.test(filename))
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  // CSV: plain text without NUL bytes
  if (/\.csv$/i.test(filename) || declared === 'text/csv') {
    const sample = b.subarray(0, Math.min(b.length, 4096));
    if (!sample.includes(0)) return 'text/csv';
  }
  return null;
}

export function parseMultipart(
  stream: Readable,
  headers: Record<string, string | undefined>,
  opts: UploadOptions,
): Promise<{ fields: Record<string, string>; files: UploadedFile[] }> {
  return new Promise((resolve, reject) => {
    const contentType = headers['content-type'] ?? '';
    if (!contentType.startsWith('multipart/form-data')) {
      reject(new AppError(415, 'UNSUPPORTED_MEDIA', 'Expected multipart/form-data'));
      return;
    }
    let bb: Busboy.Busboy;
    try {
      bb = Busboy({
        headers: { 'content-type': contentType },
        limits: { files: opts.maxFiles, fileSize: opts.maxFileBytes, fields: 50, fieldSize: 100_000 },
      });
    } catch {
      reject(new AppError(400, 'VALIDATION_ERROR', 'Malformed multipart body'));
      return;
    }
    const fields: Record<string, string> = {};
    const files: UploadedFile[] = [];
    let failed: AppError | null = null;
    const pending: Promise<void>[] = [];

    bb.on('field', (name, value) => {
      fields[name] = value;
    });
    bb.on('file', (field, file, info) => {
      const chunks: Buffer[] = [];
      let truncated = false;
      file.on('limit', () => {
        truncated = true;
      });
      pending.push(
        new Promise<void>((res) => {
          file.on('data', (c: Buffer) => chunks.push(c));
          file.on('end', () => {
            if (truncated) {
              failed ??= new AppError(
                413,
                'PAYLOAD_TOO_LARGE',
                `File exceeds the ${Math.round(opts.maxFileBytes / 1024 / 1024)}MB limit`,
              );
              return res();
            }
            const buffer = Buffer.concat(chunks);
            if (buffer.length === 0) return res();
            const mime = sniffMime(buffer, info.mimeType, info.filename);
            if (!mime || !MIME[opts.allowed].includes(mime)) {
              failed ??= new AppError(415, 'UNSUPPORTED_MEDIA', `Unsupported file type for "${info.filename}"`);
              return res();
            }
            files.push({
              field,
              filename: info.filename.replace(/[^\w.\- ]+/g, '_').slice(0, 200),
              mimeType: mime,
              buffer,
              size: buffer.length,
            });
            res();
          });
        }),
      );
    });
    bb.on('filesLimit', () => {
      failed ??= new AppError(413, 'PAYLOAD_TOO_LARGE', `At most ${opts.maxFiles} files can be uploaded at once`);
    });
    bb.on('error', () => reject(new AppError(400, 'VALIDATION_ERROR', 'Malformed multipart body')));
    bb.on('close', async () => {
      await Promise.all(pending);
      if (failed) reject(failed);
      else resolve({ fields, files });
    });
    stream.pipe(bb);
  });
}
