# PixelForge — AI Image & Thumbnail Studio

A self-hosted web app that turns a text prompt into an image, then upscales it
toward 4K — built for YouTube thumbnails, social posts, wallpapers, and
general AI art. Includes a simple text-stamping tool so you can add a bold
title straight onto a thumbnail before downloading.

## Features

- **Prompt → image**: generate with Stable Diffusion (Stability AI's
  `core` model), with optional negative prompt and style presets
  (photographic, cinematic, anime, neon-punk, etc.)
- **Format presets**: YouTube (16:9), Instagram/Facebook (1:1), Reels/Story
  (9:16), Pinterest (2:3), and more
- **One-click 4K upscale**: runs the result through Stability's fast
  upscaler (up to 4x — e.g. ~1024×576 → ~4096×2304)
- **Thumbnail text overlay**: stamp a bold title with custom color/size
  directly onto the canvas
- **Download**: export the final PNG at full resolution
- Everything runs through your own API key — no third-party server stores
  your images

## Requirements

- [Node.js](https://nodejs.org/) 18 or newer
- A Stability AI API key (free tier available): create one at
  <https://platform.stability.ai/account/keys>

## Setup

```bash
git clone <your-repo-url>
cd pixelforge-ai-thumbnail-studio
npm install
cp .env.example .env
```

Open `.env` and paste your key:

```
STABILITY_API_KEY=sk-...
```

Then start the server:

```bash
npm start
```

Open <http://localhost:3000> in your browser.

## How it works

```
public/        Frontend (vanilla HTML/CSS/JS, no build step)
  index.html   Layout
  style.css    Theme
  app.js       UI logic: calls the backend, draws to <canvas>, text overlay
server.js      Express server with two endpoints:
  /api/generate  -> Stability "Stable Image Core" (text-to-image)
  /api/upscale   -> Stability "Fast Upscaler" (up to 4x)
```

The frontend never talks to Stability directly — your API key stays on the
server side, in `.env` (which is git-ignored).

## Costs

Stability AI charges per generation/upscale via credits on your account.
Check current pricing at <https://platform.stability.ai/pricing> before
heavy use. The "fast" upscaler is the cheapest upscale tier; for higher
quality (at higher cost and slower, async processing) you can switch the
upscale endpoint to `/v2beta/stable-image/upscale/creative` or
`/conservative` — see Stability's docs for the polling flow those require.

## Swapping the AI backend

This project is intentionally a thin wrapper: `server.js` is the only place
that talks to an external AI provider, so it's straightforward to swap in a
different one if you'd rather not use Stability AI:

- **Replicate** (pay-per-use, huge model selection — e.g. SDXL, Flux,
  Real-ESRGAN for upscaling): replace the `fetch` calls with calls to
  `https://api.replicate.com/v1/predictions`, passing a `model` version ID.
- **Hugging Face Inference API** (free tier for many open models): replace
  the generate endpoint with a call to
  `https://api-inference.huggingface.co/models/<model-id>`.
- **Local Stable Diffusion** (e.g. via [AUTOMATIC1111](https://github.com/AUTOMATIC1111/stable-diffusion-webui)
  or [ComfyUI](https://github.com/comfyanonymous/ComfyUI) running on your own
  GPU): point the fetch calls at your local API's `/sdapi/v1/txt2img` and a
  Real-ESRGAN upscale script — no API key or per-image cost, but you need a
  capable GPU.

The request/response shape your frontend expects is simple either way:
`/api/generate` and `/api/upscale` both just need to return
`{ image: "data:image/png;base64,...." }`.

## Deploying

Any Node host works (Render, Railway, Fly.io, a VPS, etc.). Set
`STABILITY_API_KEY` as an environment variable on the host — don't commit
your `.env` file. If you'd rather run this as a serverless function (e.g.
Firebase Cloud Functions), move the two route handlers in `server.js` into
individual function exports and keep the `public/` folder as static hosting.

## License

MIT — use, modify, and ship this however you like.
