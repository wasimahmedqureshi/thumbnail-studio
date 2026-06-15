require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
const STABILITY_HOST = 'https://api.stability.ai';

if (!STABILITY_API_KEY) {
  console.warn('⚠️  STABILITY_API_KEY is not set. Add it to a .env file (see .env.example).');
}

/**
 * POST /api/generate
 * Body: { prompt, negativePrompt, aspectRatio, stylePreset }
 * Generates a base image from a text prompt using Stable Diffusion (SDXL/Core).
 */
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, negativePrompt, aspectRatio, stylePreset } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const form = new FormData();
    form.append('prompt', prompt.trim());
    if (negativePrompt && negativePrompt.trim()) {
      form.append('negative_prompt', negativePrompt.trim());
    }
    form.append('aspect_ratio', aspectRatio || '16:9');
    form.append('output_format', 'png');
    if (stylePreset && stylePreset !== 'none') {
      form.append('style_preset', stylePreset);
    }

    const response = await fetch(`${STABILITY_HOST}/v2beta/stable-image/generate/core`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STABILITY_API_KEY}`,
        Accept: 'image/*'
      },
      body: form
    });

    if (!response.ok) {
      const detail = await response.text();
      return res.status(response.status).json({ error: parseStabilityError(detail) });
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    res.json({ image: `data:image/png;base64,${base64}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Generation failed: ${err.message}` });
  }
});

/**
 * POST /api/upscale
 * Body: { image } - a base64 data URL (PNG)
 * Upscales an image up to 4x (e.g. ~1MP -> ~4K) using Stability's fast upscaler.
 */
app.post('/api/upscale', async (req, res) => {
  try {
    const { image } = req.body;

    if (!image || !image.includes(',')) {
      return res.status(400).json({ error: 'A valid image is required.' });
    }

    const base64Data = image.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');

    const form = new FormData();
    form.append('image', new Blob([buffer], { type: 'image/png' }), 'input.png');
    form.append('output_format', 'png');

    const response = await fetch(`${STABILITY_HOST}/v2beta/stable-image/upscale/fast`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STABILITY_API_KEY}`,
        Accept: 'image/*'
      },
      body: form
    });

    if (!response.ok) {
      const detail = await response.text();
      return res.status(response.status).json({ error: parseStabilityError(detail) });
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    res.json({ image: `data:image/png;base64,${base64}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Upscale failed: ${err.message}` });
  }
});

/** Try to turn a Stability error response into a readable message. */
function parseStabilityError(detail) {
  try {
    const json = JSON.parse(detail);
    if (json.errors && json.errors.length) return json.errors.join(' ');
    if (json.message) return json.message;
    if (json.name) return json.name;
  } catch (_) {
    // not JSON, fall through
  }
  return detail || 'Unknown error from Stability AI.';
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎬 PixelForge running at http://localhost:${PORT}`);
});
