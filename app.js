(() => {
  const TOTAL_FRAMES = 191;
  const FRAME_DIR = './ezgif-55a43c2183d5cdd3-jpg';

  const canvas = document.getElementById('sequenceCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const stageSection = document.getElementById('hero-stage');
  const heroTopHeading = document.getElementById('heroTopHeading');

  // Frame cache (1-indexed: frames[1]..frames[191])
  const frames = new Array(TOTAL_FRAMES + 1);

  // Animation state
  let targetFrame = 1;
  let currentFrame = 1;
  let lastRenderedFrameIndex = -1;

  const pad3 = (num) => String(num).padStart(3, '0');
  const getFramePath = (index) => `${FRAME_DIR}/ezgif-frame-${pad3(index)}.jpg`;

  // Resize canvas to crisp high-DPI dimensions
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    lastRenderedFrameIndex = -1;
    renderFrame(Math.round(currentFrame));
  }

  // Draw a specific frame index onto the canvas
  function renderFrame(index) {
    const clampedIndex = Math.max(1, Math.min(TOTAL_FRAMES, index));

    // Find requested frame or nearest loaded fallback frame
    let img = frames[clampedIndex];
    if (!img || !img.complete || img.naturalWidth === 0) {
      for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
        const prev = clampedIndex - offset;
        const next = clampedIndex + offset;
        if (prev >= 1 && frames[prev] && frames[prev].complete && frames[prev].naturalWidth > 0) {
          img = frames[prev];
          break;
        }
        if (next <= TOTAL_FRAMES && frames[next] && frames[next].complete && frames[next].naturalWidth > 0) {
          img = frames[next];
          break;
        }
      }
    }

    if (!img || !img.complete || img.naturalWidth === 0) return;

    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;

    ctx.fillStyle = '#020714';
    ctx.fillRect(0, 0, viewW, viewH);

    const scaleCover = Math.max(viewW / imgW, viewH / imgH);
    const scaleContain = Math.min(viewW / imgW, viewH / imgH);
    const viewAspect = viewW / viewH;

    const scale = viewAspect < 1.35
      ? scaleContain * 1.05
      : scaleCover * 0.98 + scaleContain * 0.02;

    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const drawX = (viewW - drawW) / 2;
    const drawY = (viewH - drawH) / 2;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    lastRenderedFrameIndex = clampedIndex;
  }

  // Update Top Heading fade-out based on smoothed progress (fades completely by 30% scroll)
  function updateHeadingFade(frameValue) {
    if (!heroTopHeading) return;

    const progress = (frameValue - 1) / (TOTAL_FRAMES - 1); // 0.0 to 1.0
    const fadeStart = 0.12; // Holds full opacity until 12%, then smoothly fades out to 0% by 30%
    const fadeEnd = 0.30;

    let alpha = 1;
    if (progress >= fadeEnd) {
      alpha = 0;
    } else if (progress > fadeStart) {
      alpha = 1 - (progress - fadeStart) / (fadeEnd - fadeStart);
    }

    const translateY = (1 - alpha) * -28;
    const blurPx = (1 - alpha) * 8;

    heroTopHeading.style.opacity = alpha.toFixed(3);
    heroTopHeading.style.transform = `translate3d(-50%, ${translateY.toFixed(1)}px, 0)`;
    heroTopHeading.style.filter = blurPx > 0.1 ? `blur(${blurPx.toFixed(1)}px)` : 'none';
  }

  // Map window scroll position inside #hero-stage to target frame (1..191)
  function syncTargetFrameFromScroll() {
    const rect = stageSection.getBoundingClientRect();
    const scrollableDistance = Math.max(1, rect.height - window.innerHeight);
    const scrolled = -rect.top;
    const progress = Math.max(0, Math.min(1, scrolled / scrollableDistance));

    targetFrame = 1 + progress * (TOTAL_FRAMES - 1);
  }

  // Main 60fps Animation Loop
  function tick() {
    const diff = targetFrame - currentFrame;
    if (Math.abs(diff) > 0.01) {
      currentFrame += diff * 0.16;
    } else {
      currentFrame = targetFrame;
    }

    const displayFrame = Math.round(currentFrame);
    if (displayFrame !== lastRenderedFrameIndex) {
      renderFrame(displayFrame);
    }

    updateHeadingFade(currentFrame);

    requestAnimationFrame(tick);
  }

  // Preload all 191 frames with frame 1 prioritized first
  function preloadAllFrames() {
    const onFrameLoaded = (index) => {
      if (index === 1 || index === Math.round(currentFrame)) {
        renderFrame(Math.round(currentFrame));
      }
    };

    const firstImg = new Image();
    firstImg.decoding = 'async';
    firstImg.src = getFramePath(1);
    firstImg.onload = () => onFrameLoaded(1);
    frames[1] = firstImg;

    for (let i = 2; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      img.decoding = 'async';
      img.src = getFramePath(i);
      img.onload = () => onFrameLoaded(i);
      frames[i] = img;
    }
  }

  window.addEventListener('resize', resizeCanvas, { passive: true });
  window.addEventListener('scroll', syncTargetFrameFromScroll, { passive: true });

  resizeCanvas();
  preloadAllFrames();
  syncTargetFrameFromScroll();
  requestAnimationFrame(tick);
})();
