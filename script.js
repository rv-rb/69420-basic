(function () {
    'use strict';

    const artEl = document.getElementById('ascii-art');
    const colorArts = (typeof window !== 'undefined' && window.ASCII_COLOR_ARTS) ? window.ASCII_COLOR_ARTS : [];
    let currentIndex = 0;

    function cycleArt() {
        if (!artEl || colorArts.length === 0) return;
        currentIndex = (currentIndex + 1) % colorArts.length;
        artEl.innerHTML = colorArts[currentIndex];
    }

    if (artEl && colorArts.length > 0) {
        artEl.innerHTML = colorArts[0];
        setInterval(cycleArt, 500);
    }

    // ---------------------------------------------------------
    // MOUSE REACTIVITY (SMOOTH PARALLAX TILT & DISPLACEMENT)
    // ---------------------------------------------------------
    let targetX = 0;
    let targetY = 0;
    let targetRotX = 0;
    let targetRotY = 0;

    let currentX = 0;
    let currentY = 0;
    let currentRotX = 0;
    let currentRotY = 0;

    function onPointerMove(e) {
        const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : null);
        const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : null);
        if (clientX === null || clientY === null) return;

        const normX = (clientX / window.innerWidth) - 0.5;
        const normY = (clientY / window.innerHeight) - 0.5;

        // Subtle displacement (max ±11px) and gentle 3D tilt (max ±4deg)
        targetX = normX * 22;
        targetY = normY * 18;
        targetRotY = normX * 8;
        targetRotX = -normY * 8;
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
        // Smooth lerp (0.075 for natural inertia)
        currentX += (targetX - currentX) * 0.075;
        currentY += (targetY - currentY) * 0.075;
        currentRotX += (targetRotX - currentRotX) * 0.075;
        currentRotY += (targetRotY - currentRotY) * 0.075;

        if (artEl) {
            artEl.style.transform = `perspective(900px) translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0) rotateX(${currentRotX.toFixed(2)}deg) rotateY(${currentRotY.toFixed(2)}deg)`;
        }

        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
})();
