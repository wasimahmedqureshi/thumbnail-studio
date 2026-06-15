const promptEl = document.getElementById('prompt');
const negativeEl = document.getElementById('negative');
const formatEl = document.getElementById('format');
const styleEl = document.getElementById('style');

const generateBtn = document.getElementById('generateBtn');
const upscaleBtn = document.getElementById('upscaleBtn');
const downloadBtn = document.getElementById('downloadBtn');
const addTextBtn = document.getElementById('addTextBtn');

const overlayTextEl = document.getElementById('overlayText');
const overlayColorEl = document.getElementById('overlayColor');
const overlaySizeEl = document.getElementById('overlaySize');

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const placeholder = document.getElementById('placeholder');
const loading = document.getElementById('loading');
const loadingText = document.getElementById('loadingText');
const errorBox = document.getElementById('genError');

const hud = document.getElementById('hud');
const hudResolution = document.getElementById('hudResolution');
const hudRatio = document.getElementById('hudRatio');
const hudModel = document.getElementById('hudModel');

function hasImage() {
  return !canvas.hidden;
}

function setLoading(isLoading, text) {
  loading.hidden = !isLoading;
  if (text) loadingText.textContent = text;
  generateBtn.disabled = isLoading;
  upscaleBtn.disabled = isLoading || !hasImage();
  addTextBtn.disabled = isLoading || !hasImage();
}

function showError(message) {
  errorBox.textContent = message || '';
  errorBox.hidden = !message;
}

function updateHud(model) {
  hudResolution.textContent = `${canvas.width} × ${canvas.height}px`;
  hudRatio.textContent = formatEl.value;
  if (model) hudModel.textContent = model;
  hud.hidden = false;
}

function drawImageToCanvas(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      canvas.hidden = false;
      placeholder.hidden = true;
      resolve();
    };
    img.onerror = () => reject(new Error('Could not load generated image.'));
    img.src = dataUrl;
  });
}

function refreshDownload() {
  const dataUrl = canvas.toDataURL('image/png');
  downloadBtn.href = dataUrl;
  downloadBtn.hidden = false;
}

async function generate() {
  showError('');
  const prompt = promptEl.value.trim();
  if (!prompt) {
    showError('Enter a prompt first.');
    return;
  }

  setLoading(true, 'Generating image…');

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        negativePrompt: negativeEl.value.trim(),
        aspectRatio: formatEl.value,
        stylePreset: styleEl.value
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Generation failed.');

    await drawImageToCanvas(data.image);
    updateHud('SDXL CORE');
    refreshDownload();
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
}

async function upscale() {
  if (!hasImage()) return;
  showError('');
  setLoading(true, 'Upscaling to 4K…');

  try {
    const dataUrl = canvas.toDataURL('image/png');
    const res = await fetch('/api/upscale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upscale failed.');

    await drawImageToCanvas(data.image);
    updateHud('ESRGAN UPSCALE · 4x');
    refreshDownload();
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
}

function addText() {
  if (!hasImage()) return;
  const text = overlayTextEl.value.trim();
  if (!text) {
    showError('Type a title to stamp on the image.');
    return;
  }
  showError('');

  const color = overlayColorEl.value;
  const baseSize = parseInt(overlaySizeEl.value, 10) || 80;
  // Scale relative to a 1280px-wide reference so text stays proportional
  // whether the canvas is still at base resolution or already upscaled to 4K.
  const fontSize = Math.round(baseSize * (canvas.width / 1280));

  ctx.font = `900 ${fontSize}px "Arial Black", "Inter", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, fontSize * 0.12);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillStyle = color;

  const x = canvas.width / 2;
  const y = canvas.height * 0.88;

  ctx.strokeText(text.toUpperCase(), x, y);
  ctx.fillText(text.toUpperCase(), x, y);

  refreshDownload();
}

generateBtn.addEventListener('click', generate);
upscaleBtn.addEventListener('click', upscale);
addTextBtn.addEventListener('click', addText);
