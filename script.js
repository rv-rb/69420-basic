(function () {
    'use strict';

    // -------------------------------------------------------------
    // DEFAULT CONFIGURATION SCHEMA (Overridden by cfg.js)
    // -------------------------------------------------------------
    const defaultConfig = {
        scaleMode: 'auto',       // 'auto' (responsive to window) | 'fixed' (pixel-based)
        scaleMultiplier: 1.0,    // Multiplier for auto-fit (1.0 = 100%, 0.8 = 80%, 1.2 = 120%)
        fontFamily: 'Ubuntu Mono',
        lineHeight: 0.92,
        letterSpacing: '0px',
        excludedFrames: [],      // 0-based indices of excluded arts

        shift: {
            enabled: true,
            maxDisplacementX: 60,
            maxDisplacementY: 45,
            maxTiltX: 14,
            maxTiltY: 18,
            perspective: 900,
            inertia: 0.075,
            rgbSplitEnabled: true,
            rgbSplitIntensity: 3.5
        },

        effects: {
            glow: {
                enabled: true,
                intensity: 0.4,
                radius: 18,
                colorMode: 'auto',
                customColor: '#22d3ee'
            },
            scanlines: {
                enabled: false,
                opacity: 0.20,
                spacing: 3,
                rollingBar: false,
                beamSpeed: 6
            },
            crtCurvature: {
                enabled: false,
                depth: 0.06
            },
            shadowMask: {
                enabled: false,
                opacity: 0.15
            },
            vignette: {
                enabled: true,
                darkness: 0.85,
                spread: 45
            },
            colorGrading: {
                enabled: false,
                mode: 'natural',
                contrast: 100,
                saturation: 100,
                brightness: 100
            },
            glitch: {
                enabled: false,
                intensity: 3,
                onCycle: true
            },
            backgroundColor: '#000000'
        },

        animation: {
            autoplay: true,
            intervalMs: 500,
            startIndex: 0
        }
    };

    // Deep merge configuration from window.SITE_CONFIG (cfg.js)
    let config = JSON.parse(JSON.stringify(defaultConfig));
    if (typeof window !== 'undefined' && window.SITE_CONFIG) {
        config = deepMerge(config, window.SITE_CONFIG);
    }

    function deepMerge(target, source) {
        for (const key of Object.keys(source)) {
            if (source[key] instanceof Object && !Array.isArray(source[key]) && key in target) {
                Object.assign(source[key], deepMerge(target[key], source[key]));
            } else {
                target[key] = source[key];
            }
        }
        return target;
    }

    // -------------------------------------------------------------
    // DOM ELEMENTS
    // -------------------------------------------------------------
    const artEl = document.getElementById('ascii-art');
    const stageEl = document.getElementById('stage');
    const crtOverlay = document.getElementById('crt-overlay');
    const crtBeam = document.getElementById('crt-beam');
    const shadowMaskOverlay = document.getElementById('shadow-mask-overlay');
    const crtCurvatureOverlay = document.getElementById('crt-curvature-overlay');
    const vignetteOverlay = document.getElementById('vignette-overlay');
    const colorGradeOverlay = document.getElementById('color-grade-overlay');
    const colorArts = (typeof window !== 'undefined' && window.ASCII_COLOR_ARTS) ? window.ASCII_COLOR_ARTS : [];

    let currentIndex = config.animation.startIndex || 0;
    let cycleTimer = null;
    let isPlaying = config.animation.autoplay !== false;

    let currentLines = 0;
    let currentCols = 0;

    function analyzeCurrentArt() {
        if (!colorArts[currentIndex]) return;
        const raw = colorArts[currentIndex].replace(/<[^>]+>/g, '');
        const lines = raw.split('\n');
        currentLines = lines.length;
        currentCols = Math.max(...lines.map(l => l.length), 1);
    }

    // -------------------------------------------------------------
    // DYNAMIC AUTO-FIT SCALE WORKING ALONGSIDE SCALE MULTIPLIER
    // -------------------------------------------------------------
    function updateScale() {
        if (!artEl || colorArts.length === 0) return;

        analyzeCurrentArt();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const multiplier = typeof config.scaleMultiplier === 'number' ? config.scaleMultiplier : 1.0;

        if (config.scaleMode === 'auto') {
            const targetWidthPx = (vw * 0.88) * multiplier;
            const targetHeightPx = (vh * 0.78) * multiplier;

            const fontAspect = 0.60;
            const lh = parseFloat(config.lineHeight) || 0.92;

            const maxFontSizeByWidth = targetWidthPx / (currentCols * fontAspect);
            const maxFontSizeByHeight = targetHeightPx / (currentLines * lh);

            let optimalFontSize = Math.min(maxFontSizeByWidth, maxFontSizeByHeight);
            optimalFontSize = Math.max(4, Math.min(optimalFontSize, 140));

            artEl.style.fontSize = `${optimalFontSize.toFixed(1)}px`;
            artEl.style.transformOrigin = 'center center';
        } else {
            const baseFontSize = 14;
            const computedSize = baseFontSize * (multiplier * 4.0);
            artEl.style.fontSize = `${computedSize.toFixed(1)}px`;
        }
    }

    // -------------------------------------------------------------
    // APPLY STYLES & VISUAL FX (CONFIG-DRIVEN)
    // -------------------------------------------------------------
    function applyStyles() {
        if (!artEl) return;
        const root = document.documentElement;

        // Font & Gap Tuning
        artEl.style.fontFamily = `'${config.fontFamily}', monospace`;
        artEl.style.lineHeight = config.lineHeight;
        artEl.style.letterSpacing = config.letterSpacing;

        // Background
        document.body.style.backgroundColor = config.effects.backgroundColor || '#000000';

        // Phosphor Glow / Bloom
        const glowCfg = config.effects.glow || {};
        if (glowCfg.enabled) {
            const intensity = glowCfg.intensity || 0.4;
            const radius = glowCfg.radius || 18;
            let glowColor = `rgba(34, 211, 238, ${intensity})`;

            switch (glowCfg.colorMode) {
                case 'cyan':    glowColor = `rgba(34, 211, 238, ${intensity})`; break;
                case 'matrix':  glowColor = `rgba(34, 197, 94, ${intensity})`; break;
                case 'amber':   glowColor = `rgba(245, 158, 11, ${intensity})`; break;
                case 'magenta': glowColor = `rgba(244, 63, 94, ${intensity})`; break;
                case 'purple':  glowColor = `rgba(168, 85, 247, ${intensity})`; break;
                case 'white':   glowColor = `rgba(255, 255, 255, ${intensity})`; break;
                case 'auto':
                default:
                    glowColor = `rgba(34, 211, 238, ${intensity})`;
                    break;
            }
            root.style.setProperty('--glow-filter', `drop-shadow(0 0 ${radius}px ${glowColor})`);
        } else {
            root.style.setProperty('--glow-filter', 'none');
        }

        // CRT Scanlines
        const scCfg = config.effects.scanlines || {};
        if (scCfg.enabled) {
            root.style.setProperty('--scanline-opacity', scCfg.opacity || 0.20);
            const spacing = scCfg.spacing || 3;
            root.style.setProperty('--scanline-density', `${spacing}px`);
            root.style.setProperty('--scanline-half', `${Math.max(1, Math.floor(spacing / 2))}px`);
            root.style.setProperty('--beam-opacity', scCfg.rollingBar ? 1 : 0);
            root.style.setProperty('--beam-speed', `${scCfg.beamSpeed || 6}s`);
        } else {
            root.style.setProperty('--scanline-opacity', 0);
            root.style.setProperty('--beam-opacity', 0);
        }

        // CRT Screen Curvature
        const curvCfg = config.effects.crtCurvature || {};
        root.style.setProperty('--curvature-opacity', curvCfg.enabled ? 1 : 0);

        // CRT Shadow Mask
        const maskCfg = config.effects.shadowMask || {};
        root.style.setProperty('--mask-opacity', maskCfg.enabled ? (maskCfg.opacity || 0.15) : 0);

        // Vignette
        const vigCfg = config.effects.vignette || {};
        if (vigCfg.enabled) {
            root.style.setProperty('--vignette-opacity', 1);
            root.style.setProperty('--vignette-darkness', vigCfg.darkness || 0.85);
            root.style.setProperty('--vignette-spread', `${vigCfg.spread || 45}%`);
        } else {
            root.style.setProperty('--vignette-opacity', 0);
        }

        // Color Grading & Matrix Filters
        const cgCfg = config.effects.colorGrading || {};
        if (cgCfg.enabled) {
            root.style.setProperty('--contrast', `${cgCfg.contrast || 100}%`);
            root.style.setProperty('--saturation', `${cgCfg.saturation || 100}%`);
            root.style.setProperty('--brightness', `${cgCfg.brightness || 100}%`);

            let tintColor = 'transparent';
            let tintOpacity = 0;
            switch (cgCfg.mode) {
                case 'matrix':
                    tintColor = 'rgba(34, 197, 94, 0.45)';
                    tintOpacity = 1;
                    break;
                case 'amber':
                    tintColor = 'rgba(245, 158, 11, 0.45)';
                    tintOpacity = 1;
                    break;
                case 'cyberpunk':
                    tintColor = 'rgba(236, 72, 153, 0.35)';
                    tintOpacity = 1;
                    break;
                case 'gameboy':
                    tintColor = 'rgba(139, 172, 15, 0.55)';
                    tintOpacity = 1;
                    break;
                case 'monochrome':
                    tintColor = 'rgba(255, 255, 255, 0.25)';
                    tintOpacity = 1;
                    break;
                case 'invert':
                    tintColor = 'rgba(255, 255, 255, 0.8)';
                    tintOpacity = 1;
                    break;
                default:
                    tintOpacity = 0;
            }
            root.style.setProperty('--color-grade-opacity', tintOpacity);
            root.style.setProperty('--color-grade-tint', tintColor);
        } else {
            root.style.setProperty('--contrast', '100%');
            root.style.setProperty('--saturation', '100%');
            root.style.setProperty('--brightness', '100%');
            root.style.setProperty('--color-grade-opacity', 0);
        }

        // Perspective
        if (stageEl) {
            stageEl.style.perspective = `${config.shift.perspective || 900}px`;
        }

        updateScale();
    }

    // -------------------------------------------------------------
    // FRAME EXCLUSION & NAVIGATION
    // -------------------------------------------------------------
    function getNextValidFrame(fromIdx, direction = 1) {
        if (colorArts.length === 0) return 0;
        const excluded = new Set(config.excludedFrames || []);
        if (excluded.size >= colorArts.length) return fromIdx;

        let idx = fromIdx;
        for (let i = 0; i < colorArts.length; i++) {
            idx = (idx + direction + colorArts.length) % colorArts.length;
            if (!excluded.has(idx)) return idx;
        }
        return fromIdx;
    }

    function renderArt() {
        if (!artEl || colorArts.length === 0) return;
        artEl.innerHTML = colorArts[currentIndex];
        updateScale();

        if (config.effects.glitch && config.effects.glitch.enabled && config.effects.glitch.onCycle) {
            triggerGlitch();
        }
    }

    function triggerGlitch() {
        if (!artEl) return;
        artEl.classList.remove('glitch-active');
        void artEl.offsetWidth;
        artEl.classList.add('glitch-active');
        setTimeout(() => artEl.classList.remove('glitch-active'), 140);
    }

    function cycleArt() {
        if (!artEl || colorArts.length === 0) return;
        currentIndex = getNextValidFrame(currentIndex, 1);
        renderArt();
    }

    if (artEl && colorArts.length > 0) {
        if ((config.excludedFrames || []).includes(currentIndex)) {
            currentIndex = getNextValidFrame(currentIndex, 1);
        }
        renderArt();
        if (config.animation.autoplay !== false) {
            cycleTimer = setInterval(cycleArt, config.animation.intervalMs || 500);
        }
    }

    window.addEventListener('resize', updateScale);

    // -------------------------------------------------------------
    // THE SHIFT EFFECT (3D MOUSE PARALLAX & CHROMATIC SHIFT)
    // -------------------------------------------------------------
    let targetX = 0;
    let targetY = 0;
    let targetRotX = 0;
    let targetRotY = 0;

    let currentX = 0;
    let currentY = 0;
    let currentRotX = 0;
    let currentRotY = 0;

    function onPointerMove(e) {
        if (!config.shift.enabled) return;

        const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : null);
        const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : null);
        if (clientX === null || clientY === null) return;

        const normX = (clientX / window.innerWidth) - 0.5;
        const normY = (clientY / window.innerHeight) - 0.5;

        targetX = normX * config.shift.maxDisplacementX;
        targetY = normY * config.shift.maxDisplacementY;
        targetRotY = normX * config.shift.maxTiltY;
        targetRotX = -normY * config.shift.maxTiltX;
    }

    function onPointerLeave() {
        targetX = 0;
        targetY = 0;
        targetRotX = 0;
        targetRotY = 0;
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave, { passive: true });
    window.addEventListener('blur', onPointerLeave);

    function animate() {
        const inertia = config.shift.inertia || 0.075;
        currentX += (targetX - currentX) * inertia;
        currentY += (targetY - currentY) * inertia;
        currentRotX += (targetRotX - currentRotX) * inertia;
        currentRotY += (targetRotY - currentRotY) * inertia;

        if (artEl && config.shift.enabled) {
            artEl.style.transform = `perspective(${config.shift.perspective}px) translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0) rotateX(${currentRotX.toFixed(2)}deg) rotateY(${currentRotY.toFixed(2)}deg)`;

            if (config.shift.rgbSplitEnabled) {
                const normSplitX = currentX / (config.shift.maxDisplacementX || 1);
                const normSplitY = currentY / (config.shift.maxDisplacementY || 1);
                const intensity = config.shift.rgbSplitIntensity || 3.5;

                const splitX = normSplitX * intensity;
                const splitY = normSplitY * intensity;

                artEl.style.textShadow = `
                    ${(-splitX).toFixed(2)}px ${(-splitY).toFixed(2)}px 0 rgba(239, 68, 68, 0.65),
                    ${splitX.toFixed(2)}px ${splitY.toFixed(2)}px 0 rgba(6, 182, 212, 0.65)
                `;
            } else {
                artEl.style.textShadow = 'none';
            }
        }

        requestAnimationFrame(animate);
    }

    applyStyles();
    requestAnimationFrame(animate);
})();
