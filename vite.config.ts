import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = /data:(.*?);base64/.exec(header || '');
  const mime = mimeMatch?.[1] || 'image/png';
  const buf = Buffer.from(base64, 'base64');
  return new Blob([buf], { type: mime });
}

function extractResultUrl(data: unknown): string | null {
  if (!data) return null;
  if (typeof data === 'string' && (data.startsWith('http') || data.startsWith('data:'))) {
    return data;
  }
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = extractResultUrl(item);
      if (found) return found;
    }
  }
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (typeof obj.url === 'string' && obj.url.startsWith('http')) return obj.url;
    if (typeof obj.path === 'string' && obj.path.startsWith('http')) return obj.path;
    for (const v of Object.values(obj)) {
      const found = extractResultUrl(v);
      if (found) return found;
    }
  }
  return null;
}

async function fetchImageAsDataUrl(url: string, hfToken?: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  const headers: Record<string, string> = {};
  if (hfToken) headers.Authorization = `Bearer ${hfToken}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Failed to fetch generated image (${res.status})`);
  const contentType = res.headers.get('content-type') || 'image/png';
  const arrBuf = await res.arrayBuffer();
  const base64 = Buffer.from(arrBuf).toString('base64');
  return `data:${contentType};base64,${base64}`;
}

function synthTryOnApiPlugin(): Plugin {
  return {
    name: 'synth-era-vton-api',
    configureServer(server) {
      server.middlewares.use('/api/tryon', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
            personDataUrl: string;
            garmentDataUrl: string;
            garmentDescription: string;
            category: 'hoodies' | 'jackets' | 'pants' | 'tshirts';
            hfToken?: string;
          };

          const personBlob = dataUrlToBlob(body.personDataUrl);
          const garmentBlob = dataUrlToBlob(body.garmentDataUrl);
          const hfToken = (body.hfToken || process.env.HF_TOKEN || '').trim() || undefined;
          const isPants = body.category === 'pants';

          const { Client } = await import('@gradio/client');
          const connectOpts = hfToken ? { token: hfToken as `hf_${string}` } : undefined;

          const errors: string[] = [];

          // 1. Primary Engine: franciszzj/Leffa (NVIDIA A10G — supports both Upper Body & Lower Body Pants!)
          try {
            const leffa = await Client.connect('franciszzj/Leffa', connectOpts);
            const pred = await leffa.predict('/leffa_predict_vt', {
              src_image_path: personBlob,
              ref_image_path: garmentBlob,
              ref_acceleration: false,
              step: 25,
              scale: 2.5,
              seed: 42,
              vt_model_type: isPants ? 'dress_code' : 'viton_hd',
              vt_garment_type: isPants ? 'lower_body' : 'upper_body',
              vt_repaint: false,
            });
            const outUrl = extractResultUrl(pred.data);
            if (outUrl) {
              const imageDataUrl = await fetchImageAsDataUrl(outUrl, hfToken);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ imageDataUrl, engine: 'Leffa AI (NVIDIA A10G)' }));
              return;
            }
          } catch (err) {
            errors.push(`Leffa: ${err instanceof Error ? err.message : String(err)}`);
          }

          // 2. Fallback Engine A: yisol/IDM-VTON (NVIDIA A10G)
          try {
            const idm = await Client.connect('yisol/IDM-VTON', connectOpts);
            const pred = await idm.predict('/tryon', {
              dict: { background: personBlob, layers: [], composite: null },
              garm_img: garmentBlob,
              garment_des: body.garmentDescription || 'Stylish modern streetwear garment',
              is_checked: true,
              is_checked_crop: false,
              denoise_steps: 25,
              seed: 42,
            });
            const outUrl = extractResultUrl(pred.data);
            if (outUrl) {
              const imageDataUrl = await fetchImageAsDataUrl(outUrl, hfToken);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ imageDataUrl, engine: 'IDM-VTON (NVIDIA A10G)' }));
              return;
            }
          } catch (err) {
            errors.push(`IDM-VTON: ${err instanceof Error ? err.message : String(err)}`);
          }

          // 3. Fallback Engine B: Nymbo/Virtual-Try-On (NVIDIA A10G)
          try {
            const nymbo = await Client.connect('Nymbo/Virtual-Try-On', connectOpts);
            const pred = await nymbo.predict('/tryon', {
              dict: { background: personBlob, layers: [], composite: null },
              garm_img: garmentBlob,
              garment_des: body.garmentDescription || 'Stylish modern streetwear garment',
              is_checked: true,
              is_checked_crop: false,
              denoise_steps: 25,
              seed: 42,
            });
            const outUrl = extractResultUrl(pred.data);
            if (outUrl) {
              const imageDataUrl = await fetchImageAsDataUrl(outUrl, hfToken);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ imageDataUrl, engine: 'Nymbo VTON (NVIDIA A10G)' }));
              return;
            }
          } catch (err) {
            errors.push(`Nymbo: ${err instanceof Error ? err.message : String(err)}`);
          }

          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error:
                'Free public GPU quota is temporarily busy. Add a free Hugging Face token (huggingface.co/settings/tokens) in the key icon above for instant priority access!',
              details: errors.join(' | '),
            })
          );
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error: err instanceof Error ? err.message : 'Virtual Try-On server error',
            })
          );
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), synthTryOnApiPlugin()],
  optimizeDeps: {
    exclude: ['@decartai/sdk'],
  },
  server: {
    port: 5173,
    host: true,
  },
});
