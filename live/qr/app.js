// brac QR Generator — all QR building runs client-side with the
// qr-code-styling library (vendor/qr-code-styling.js). No data ever leaves
// the browser: the server only serves these static files.
(function () {
  "use strict";

  // ---------- brand colours (sampled from the brac logo) ----------
  const LOGO_COLORS = {
    bevelDark: "#910156",
    bevelMid: "#bf5989",
    bevelLight: "#f1aac8",
    faceTop: "#eb008b",
    faceBottom: "#ba0072",
  };

  // ---------- element refs ----------
  const $ = (id) => document.getElementById(id);
  const els = {
    data: $("data"),
    shapeSeg: $("shapeSeg"),
    borderField: $("borderField"),
    borderStyle: $("borderStyle"),
    dotsType: $("dotsType"),
    cornersSquareType: $("cornersSquareType"),
    cornersDotType: $("cornersDotType"),
    dotsColor: $("dotsColor"),
    cornersSquareColor: $("cornersSquareColor"),
    cornersDotColor: $("cornersDotColor"),
    bgColor: $("bgColor"),
    bgTransparent: $("bgTransparent"),
    imageSeg: $("imageSeg"),
    imageUpload: $("imageUpload"),
    imageOptionsRow: $("imageOptionsRow"),
    ringNoImageHint: $("ringNoImageHint"),
    imageSize: $("imageSize"),
    imageSizeVal: $("imageSizeVal"),
    hideBgDots: $("hideBgDots"),
    ecLevel: $("ecLevel"),
    qrSize: $("qrSize"),
    qrSizeVal: $("qrSizeVal"),
    fileName: $("fileName"),
    qrHost: $("qrHost"),
    scanNote: $("scanNote"),
    presetRow: $("presetRow"),
  };

  const state = {
    shape: "square",
    borderStyle: "none",
    imageMode: "none", // "none" or "custom" — there is no built-in default logo
    customLogoDataUrl: null,
    customLogoRingDataUrl: null,
    lastComposedSvg: null, // set when a badge (bordered circle) is rendered
    qrInstance: null,
  };

  // Shrinks an image to at most maxDim px on its longest side (kept as PNG so
  // transparency survives) — used for the small logos repeated around a
  // circular badge border, so 16 copies don't bloat the SVG/download.
  function resizeDataUrl(dataUrl, maxDim) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  // ---------- small UI helpers ----------
  function setSegActive(container, value) {
    container.querySelectorAll(".seg-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.value === value);
    });
  }

  els.shapeSeg.addEventListener("click", (e) => {
    const btn = e.target.closest(".seg-btn");
    if (!btn) return;
    state.shape = btn.dataset.value;
    setSegActive(els.shapeSeg, state.shape);
    els.borderField.hidden = state.shape !== "circle";
    if (state.shape !== "circle") {
      state.borderStyle = "none";
      els.borderStyle.value = "none";
    }
    render();
  });

  els.imageSeg.addEventListener("click", (e) => {
    const btn = e.target.closest(".seg-btn");
    if (!btn) return;
    const mode = btn.dataset.value;
    if (mode === "custom") {
      els.imageUpload.click();
      return; // wait for file selection before switching UI state
    }
    state.imageMode = mode;
    setSegActive(els.imageSeg, mode);
    els.imageOptionsRow.style.display = mode === "none" ? "none" : "grid";
    render();
  });

  els.imageUpload.addEventListener("change", () => {
    const file = els.imageUpload.files && els.imageUpload.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      state.customLogoDataUrl = reader.result;
      state.customLogoRingDataUrl = await resizeDataUrl(reader.result, 220).catch(() => reader.result);
      state.imageMode = "custom";
      setSegActive(els.imageSeg, "custom");
      els.imageOptionsRow.style.display = "grid";
      render();
    };
    reader.readAsDataURL(file);
  });

  els.borderStyle.addEventListener("change", () => {
    state.borderStyle = els.borderStyle.value;
    render();
  });

  els.imageSize.addEventListener("input", () => {
    els.imageSizeVal.textContent = els.imageSize.value + "%";
  });
  els.qrSize.addEventListener("input", () => {
    els.qrSizeVal.textContent = els.qrSize.value;
  });

  let debounceTimer = null;
  function debouncedRender() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(render, 120);
  }

  [
    els.data,
    els.dotsType,
    els.cornersSquareType,
    els.cornersDotType,
    els.dotsColor,
    els.cornersSquareColor,
    els.cornersDotColor,
    els.bgColor,
    els.bgTransparent,
    els.imageSize,
    els.hideBgDots,
    els.ecLevel,
    els.qrSize,
  ].forEach((el) => {
    el.addEventListener("input", debouncedRender);
    el.addEventListener("change", debouncedRender);
  });

  // ---------- presets ----------
  const PRESETS = {
    classicPink: {
      shape: "square",
      borderStyle: "none",
      dotsType: "rounded",
      cornersSquareType: "extra-rounded",
      cornersDotType: "dot",
      dotsColor: "#c2006b",
      cornersSquareColor: "#8e0050",
      cornersDotColor: "#e6007e",
      bgColor: "#ffffff",
      bgTransparent: false,
      ecLevel: "H",
    },
    roundDots: {
      shape: "square",
      borderStyle: "none",
      dotsType: "dots",
      cornersSquareType: "dot",
      cornersDotType: "dot",
      dotsColor: LOGO_COLORS.faceBottom,
      cornersSquareColor: LOGO_COLORS.bevelDark,
      cornersDotColor: LOGO_COLORS.faceTop,
      bgColor: "#ffffff",
      bgTransparent: false,
      ecLevel: "H",
    },
    circleFrame: {
      shape: "circle",
      borderStyle: "frame",
      dotsType: "dots",
      cornersSquareType: "dot",
      cornersDotType: "dot",
      dotsColor: LOGO_COLORS.faceBottom,
      cornersSquareColor: LOGO_COLORS.bevelDark,
      cornersDotColor: LOGO_COLORS.faceTop,
      bgColor: "#ffffff",
      bgTransparent: false,
      ecLevel: "H",
    },
    circleLogoRing: {
      shape: "circle",
      borderStyle: "logoRing",
      dotsType: "dots",
      cornersSquareType: "dot",
      cornersDotType: "dot",
      dotsColor: LOGO_COLORS.faceBottom,
      cornersSquareColor: LOGO_COLORS.bevelDark,
      cornersDotColor: LOGO_COLORS.faceTop,
      bgColor: "#ffffff",
      bgTransparent: false,
      ecLevel: "H",
    },
    plain: {
      shape: "square",
      borderStyle: "none",
      dotsType: "square",
      cornersSquareType: "square",
      cornersDotType: "square",
      dotsColor: "#000000",
      cornersSquareColor: "#000000",
      cornersDotColor: "#000000",
      bgColor: "#ffffff",
      bgTransparent: false,
      ecLevel: "M",
    },
  };

  els.presetRow.addEventListener("click", (e) => {
    const btn = e.target.closest(".preset-btn");
    if (!btn) return;
    const preset = PRESETS[btn.dataset.preset];
    if (!preset) return;

    state.shape = preset.shape;
    state.borderStyle = preset.borderStyle;
    // Presets never touch the centre image — a logo only appears if the
    // user has uploaded one themselves.

    setSegActive(els.shapeSeg, state.shape);
    els.borderField.hidden = state.shape !== "circle";
    els.borderStyle.value = state.borderStyle;

    els.dotsType.value = preset.dotsType;
    els.cornersSquareType.value = preset.cornersSquareType;
    els.cornersDotType.value = preset.cornersDotType;
    els.dotsColor.value = preset.dotsColor;
    els.cornersSquareColor.value = preset.cornersSquareColor;
    els.cornersDotColor.value = preset.cornersDotColor;
    els.bgColor.value = preset.bgColor;
    els.bgTransparent.checked = preset.bgTransparent;
    els.ecLevel.value = preset.ecLevel;

    render();
  });

  // ---------- badge (circular border) composition, pure client-side ----------
  function circlePath(cx, cy, r) {
    return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
  }
  function ringPath(cx, cy, inner, outer) {
    return `${circlePath(cx, cy, outer)} ${circlePath(cx, cy, inner)}`;
  }
  function ringEl(cx, cy, inner, outer, fill) {
    return `<path fill-rule="evenodd" fill="${fill}" d="${ringPath(cx, cy, inner, outer)}"/>`;
  }

  function stripXmlProlog(svgText) {
    return svgText.replace(/<\?xml[^>]*\?>\s*/, "");
  }

  function buildBadge(innerQrSvgText, borderStyle, badgeSize, ringLogoDataUrl) {
    const C = badgeSize / 2;
    const qrSize = badgeSize * 0.7;
    const innerSvg = stripXmlProlog(innerQrSvgText).replace(
      "<svg ",
      `<svg x="${(C - qrSize / 2).toFixed(1)}" y="${(C - qrSize / 2).toFixed(1)}" width="${qrSize}" height="${qrSize}" `
    );

    const bevelDefs = `
      <linearGradient id="bevel-outer" x1="0" x2="1">
        <stop offset="0" stop-color="${LOGO_COLORS.bevelDark}"/>
        <stop offset="0.5" stop-color="${LOGO_COLORS.bevelMid}"/>
        <stop offset="1" stop-color="${LOGO_COLORS.bevelLight}"/>
      </linearGradient>
      <linearGradient id="bevel-inner" x1="0" x2="1">
        <stop offset="0" stop-color="${LOGO_COLORS.bevelLight}"/>
        <stop offset="0.5" stop-color="${LOGO_COLORS.bevelMid}"/>
        <stop offset="1" stop-color="${LOGO_COLORS.bevelDark}"/>
      </linearGradient>
      <clipPath id="qr-clip"><circle cx="${C}" cy="${C}" r="${qrSize / 2}"/></clipPath>`;

    const qrGroup = `<g clip-path="url(#qr-clip)">${innerSvg}</g>`;

    let defs = bevelDefs;
    let body;

    if (borderStyle === "frame") {
      defs += `<clipPath id="face"><path clip-rule="evenodd" d="${ringPath(C, C, badgeSize * 0.38, badgeSize * 0.465)}"/></clipPath>`;
      body = `
        <circle cx="${C}" cy="${C}" r="${badgeSize * 0.38}" fill="#ffffff"/>
        ${qrGroup}
        ${ringEl(C, C, badgeSize * 0.465, badgeSize * 0.4925, "url(#bevel-outer)")}
        <g clip-path="url(#face)">
          <rect width="${badgeSize}" height="${badgeSize}" fill="${LOGO_COLORS.faceBottom}"/>
          <path d="M 0 0 H ${badgeSize} V ${badgeSize * 0.435} Q ${C} ${badgeSize * 0.465} 0 ${badgeSize * 0.575} Z" fill="${LOGO_COLORS.faceTop}"/>
        </g>
        ${ringEl(C, C, badgeSize * 0.371, badgeSize * 0.38, "url(#bevel-inner)")}`;
    } else {
      // logoRing
      const r = badgeSize * 0.4275;
      const logoSize = badgeSize * 0.07;
      const count = 16;
      let logos = "";
      for (let i = 0; i < count; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / count;
        const x = (C + r * Math.cos(a) - logoSize / 2).toFixed(1);
        const y = (C + r * Math.sin(a) - logoSize / 2).toFixed(1);
        logos += ringLogoDataUrl
          ? `<image x="${x}" y="${y}" width="${logoSize}" height="${logoSize}" href="${ringLogoDataUrl}"/>`
          : // No image uploaded yet — show plain placeholder dots instead.
            `<circle cx="${(C + r * Math.cos(a)).toFixed(1)}" cy="${(C + r * Math.sin(a)).toFixed(1)}" r="${(logoSize / 2.6).toFixed(1)}" fill="${LOGO_COLORS.faceTop}"/>`;
      }
      body = `
        <circle cx="${C}" cy="${C}" r="${badgeSize * 0.4775}" fill="#ffffff"/>
        ${qrGroup}
        ${ringEl(C, C, badgeSize * 0.4775, badgeSize * 0.4925, "url(#bevel-outer)")}
        ${ringEl(C, C, badgeSize * 0.37, badgeSize * 0.3775, "url(#bevel-inner)")}
        ${logos}`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${badgeSize}" height="${badgeSize}" viewBox="0 0 ${badgeSize} ${badgeSize}">
<defs>${defs}</defs>
${body}
</svg>`;
  }

  // ---------- options builder ----------
  function currentImageDataUrl() {
    return state.imageMode === "custom" ? state.customLogoDataUrl : null;
  }
  // The "logo repeated around border" style needs an uploaded image — there
  // is no built-in default, so it returns null until the user uploads one.
  function ringLogoDataUrl() {
    return state.customLogoRingDataUrl || null;
  }

  function buildQrOptions(sizeOverride) {
    const data = els.data.value.trim();
    const size = sizeOverride || Number(els.qrSize.value);
    const imageDataUrl = currentImageDataUrl();

    const options = {
      width: size,
      height: size,
      margin: 24,
      data: data || "https://example.com",
      shape: state.borderStyle !== "none" ? "circle" : state.shape,
      qrOptions: { errorCorrectionLevel: els.ecLevel.value },
      dotsOptions: { type: els.dotsType.value, color: els.dotsColor.value },
      cornersSquareOptions: { type: els.cornersSquareType.value, color: els.cornersSquareColor.value },
      cornersDotOptions: { type: els.cornersDotType.value, color: els.cornersDotColor.value },
      backgroundOptions: { color: els.bgTransparent.checked ? "rgba(0,0,0,0)" : els.bgColor.value },
    };

    if (imageDataUrl) {
      options.image = imageDataUrl;
      options.imageOptions = {
        hideBackgroundDots: els.hideBgDots.checked,
        imageSize: Number(els.imageSize.value) / 100,
        margin: 6,
        crossOrigin: "anonymous",
      };
    }

    return options;
  }

  // ---------- render ----------
  async function render() {
    const hasData = els.data.value.trim().length > 0;
    state.lastComposedSvg = null;

    els.ringNoImageHint.hidden = !(state.borderStyle === "logoRing" && !ringLogoDataUrl());

    if (state.borderStyle !== "none" && state.shape === "circle") {
      // Composed circular badge: render the inner QR off-DOM as SVG, then wrap it.
      const innerOptions = buildQrOptions();
      const qr = new QRCodeStyling({ ...innerOptions, type: "svg", width: 1000, height: 1000, margin: 30 });
      const blob = await qr.getRawData("svg");
      const svgText = await blob.text();
      const badgeSvg = buildBadge(svgText, state.borderStyle, Number(els.qrSize.value), ringLogoDataUrl() || "");
      state.lastComposedSvg = badgeSvg;
      els.qrHost.innerHTML = hasData ? badgeSvg : '<p class="placeholder">Enter a link to see your QR code</p>';
    } else {
      const options = buildQrOptions();
      els.qrHost.innerHTML = "";
      if (!hasData) {
        els.qrHost.innerHTML = '<p class="placeholder">Enter a link to see your QR code</p>';
        state.qrInstance = null;
        els.scanNote.textContent = "";
        return;
      }
      state.qrInstance = new QRCodeStyling({ ...options, type: "canvas" });
      state.qrInstance.append(els.qrHost);
    }

    els.scanNote.textContent = hasData
      ? `${els.qrSize.value}px · error correction ${els.ecLevel.value}`
      : "";
  }

  // ---------- downloads ----------
  function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function svgTextToCanvas(svgText, size) {
    return new Promise((resolve, reject) => {
      const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        resolve({ canvas, ctx, img, cleanup: () => URL.revokeObjectURL(url) });
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      img.src = url;
    });
  }

  document.querySelectorAll(".download-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const ext = btn.dataset.ext;
      const name = (els.fileName.value.trim() || "brac-qr-code").replace(/[^a-z0-9-_]+/gi, "-");
      if (!els.data.value.trim()) return;

      if (state.lastComposedSvg) {
        const size = Number(els.qrSize.value);
        if (ext === "svg") {
          saveBlob(new Blob([state.lastComposedSvg], { type: "image/svg+xml" }), `${name}.svg`);
          return;
        }
        try {
          const { canvas, ctx, img, cleanup } = await svgTextToCanvas(state.lastComposedSvg, size);
          if (ext === "jpeg" || ext === "webp") {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, size, size);
          }
          ctx.drawImage(img, 0, 0, size, size);
          cleanup();
          const mime = ext === "jpeg" ? "image/jpeg" : ext === "webp" ? "image/webp" : "image/png";
          canvas.toBlob((blob) => blob && saveBlob(blob, `${name}.${ext}`), mime, 0.95);
        } catch (err) {
          console.error("Badge download failed", err);
        }
        return;
      }

      if (state.qrInstance) {
        state.qrInstance.download({ name, extension: ext });
      }
    });
  });

  // ---------- initial paint ----------
  els.imageOptionsRow.style.display = "none";
  render();
})();
