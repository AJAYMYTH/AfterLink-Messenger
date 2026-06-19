import { z } from 'zod';
import supabase from '../db/supabase.js';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/zip'];
const MAX_SIZE = 10 * 1024 * 1024;

export function registerFileRoutes(server) {
  server.on('files.upload', async (req, res) => {
    const { fileName, contentType, fileSize } = req.body;

    if (fileSize > MAX_SIZE) {
      return res.send({ ok: false, error: 'File too large. Max 10MB' });
    }

    if (!ALLOWED_TYPES.includes(contentType)) {
      return res.send({ ok: false, error: 'File type not supported' });
    }

    const filePath = `${req.user.id}/${Date.now()}-${fileName}`;

    const { data, error } = await supabase.storage
      .from('attachments')
      .createSignedUploadUrl(filePath);

    if (error) return res.send({ ok: false, error: error.message });

    res.send({
      ok: true,
      data: {
        uploadUrl: data.signedUrl,
        filePath,
        publicUrl: `${process.env.SUPABASE_URL}/storage/v1/object/public/attachments/${filePath}`,
      },
    });
  }, z.object({
    fileName: z.string().min(1),
    contentType: z.string(),
    fileSize: z.number().int().positive(),
  }));
}
