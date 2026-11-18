'use strict';
// Utilidades y controles táctiles del móvil

// =========================================================================
// 6. MOTOR DE COMBATE (TEKKEN JUGGLE COMBOS & BLOQUEO DIRECCIONAL)
// =========================================================================

// =========================================================================
// UTILIDADES: escape HTML (los nombres llegan por red) y CONTROLES TÁCTILES
// =========================================================================
function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const TouchPad = {
    held: {},          // código -> nº de dedos que lo mantienen
    pointers: new Map(), // pointerId -> [códigos]
    ready: false,
    isTouchDevice() {
        const mm = q => window.matchMedia && window.matchMedia(q).matches;
        return mm('(pointer: coarse)') || (navigator.maxTouchPoints > 0 && !mm('(hover: hover)'));
    },
    pref() { try { return localStorage.getItem('touch_controls_v1'); } catch (e) { return null; } },
    shouldShow() {
        const p = this.pref();
        if (p === 'on') return true;
        if (p === 'off') return false;
        return this.isTouchDevice();
    },
    refresh() { document.body.classList.toggle('touch-on', this.shouldShow()); },
    toggle() {
        try { localStorage.setItem('touch_controls_v1', this.shouldShow() ? 'off' : 'on'); } catch (e) {}
        this.refresh();
    },
    press(codes) { codes.forEach(c => { this.held[c] = (this.held[c] || 0) + 1; }); this.paint(); },
    release(codes) { codes.forEach(c => { this.held[c] = Math.max(0, (this.held[c] || 0) - 1); }); this.paint(); },
    releaseAll() {
        this.held = {}; this.pointers.clear(); this.paint();
    },
    paint() {
        document.querySelectorAll('#touch-controls .touch-btn').forEach(b => {
            const codes = (b.dataset.key || '').split(',');
            b.classList.toggle('pressed', codes.every(c => (this.held[c] || 0) > 0));
        });
    },
    isDown(code) { return (this.held[code] || 0) > 0; },
    codesAt(x, y) {
        const el = document.elementFromPoint(x, y);
        const btn = el && el.closest ? el.closest('#touch-controls .touch-btn') : null;
        return btn ? (btn.dataset.key || '').split(',') : [];
    },
    init() {
        if (this.ready) return;
        this.ready = true;
        const root = document.getElementById('touch-controls');
        const move = (e, codes) => {
            const prev = this.pointers.get(e.pointerId) || [];
            if (prev.join() === codes.join()) return;
            this.release(prev);
            this.pointers.set(e.pointerId, codes);
            this.press(codes);
        };
        root.addEventListener('pointerdown', (e) => {
            const codes = this.codesAt(e.clientX, e.clientY);
            if (!codes.length) return;
            e.preventDefault();
            try { root.setPointerCapture(e.pointerId); } catch (err) {}
            move(e, codes);
        });
        // Deslizar el dedo por la cruceta cambia de dirección sin soltar; las acciones se mantienen
        root.addEventListener('pointermove', (e) => {
            if (!this.pointers.has(e.pointerId)) return;
            e.preventDefault();
            const cur = this.pointers.get(e.pointerId) || [];
            const isDir = cur.some(c => c.startsWith('Arrow'));
            if (!isDir) return;
            const codes = this.codesAt(e.clientX, e.clientY);
            if (codes.length && codes.some(c => c.startsWith('Arrow'))) move(e, codes);
        });
        const end = (e) => {
            if (!this.pointers.has(e.pointerId)) return;
            this.release(this.pointers.get(e.pointerId));
            this.pointers.delete(e.pointerId);
        };
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => root.addEventListener(t, end));
        root.addEventListener('contextmenu', e => e.preventDefault());
        window.addEventListener('blur', () => this.releaseAll());
        document.addEventListener('visibilitychange', () => { if (document.hidden) this.releaseAll(); });
        window.matchMedia && window.matchMedia('(pointer: coarse)').addEventListener &&
            window.matchMedia('(pointer: coarse)').addEventListener('change', () => this.refresh());
        this.refresh();
    }
};
document.addEventListener('contextmenu', (e) => { if (!document.getElementById('screen-game').classList.contains('hidden')) e.preventDefault(); });
