/* ════════════════════════════════════════════════════════════════════════
   OXLYN-WAYPOINTS • app.js
   The Waypoint Studio editor. Schema-driven controls, an HSV colour picker,
   throttled live updates (every tweak previews on the real in-world GPS) and a
   live speed/turn-risk readout. No framework, no build step.
   ════════════════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const $  = (s, r) => (r || document).querySelector(s);

    const DEFAULT_CFG = {
        showRoute: true, routeStyle: 'chevron3d', routeColor: '#3aa0ff',
        chevronSpacing: 5.0, chevronScale: 1.0, chevronLift: 0.08, chevronHeight: 0.24,
        routeWidth: 3.2, baseOpacity: 0.95, drawDistance: 150.0, flowAnim: true, fadeEnds: true,
        show3D: true, markerStyle: 'beam', markerColor: '#ffffff', markerAccent: '#ffcf4a',
        beamHeight: 30.0, showDistance: true, markerLabel: '',
        hudEnabled: true, hudStyle: 'minibox', hudX: 0.02, hudY: 0.04, hudScale: 1.0,
        hudAccent: '#3aa0ff', hudShowStreet: true, hudShowEta: true,
        turnRisk: true, riskOnFoot: false, gripAuto: true, gripManual: 0.95, safetyMargin: 0.12,
        riskSafe: '#34d399', riskCaution: '#ffd23f', riskWarning: '#ff8c42', riskDanger: '#ff3b3b',
        onlyInVehicle: false, hideGameRoute: false, autoStart: true,
        perfMode: 'balanced', uiAccent: '#3aa0ff',
    };

    function encSafe(str, maxEncodedLen = 640) {
        const clean = String(str == null ? '' : str).replace(/[\r\n\t]+/g, ' ');
        let out = encodeURIComponent(clean);
        if (out.length <= maxEncodedLen) return out;
        const chars = Array.from(clean);
        while (chars.length > 0) {
            chars.pop();
            out = encodeURIComponent(chars.join(''));
            if (out.length <= maxEncodedLen) return out;
        }
        return '';
    }

    function decUriSafe(str) {
        const s = String(str == null ? '' : str);
        try {
            return decodeURIComponent(s);
        } catch (_) {
            return s;
        }
    }

    function parseCfg(str) {
        const out = {};
        if (!str || typeof str !== 'string') return out;
        str.split(';').forEach((pair) => {
            const idx = pair.indexOf('=');
            if (idx <= 0) return;
            const k = pair.slice(0, idx);
            const v = pair.slice(idx + 1);
            if (k === 'markerLabel') out[k] = decUriSafe(v);
            else if (v === 'true') out[k] = true;
            else if (v === 'false') out[k] = false;
            else if (v !== '' && !isNaN(v) && !v.startsWith('#')) out[k] = Number(v);
            else out[k] = v;
        });
        return out;
    }

    function post(name, data) {
        if (typeof cef !== 'undefined' && cef && typeof cef.emit === 'function') {
            if (name === 'update' && data) {
                const payload = data.key === 'markerLabel'
                    ? 'markerLabel|' + encSafe(String(data.value == null ? '' : data.value), 600)
                    : String(data.key) + '|' + String(data.value);
                cef.emit('rotwp.update', payload);
            } else if (name === 'demo' && data) {
                cef.emit('rotwp.demo', data.on ? '1' : '0');
            } else {
                cef.emit('rotwp.' + name, '1');
            }
        }
        return Promise.resolve();
    }

    // ── inline SVG icons (self-contained, no kit/CDN) ──────────────────────
    const ICON = {
        route:  'M9 20l-5.5 1.6L3 21V6l6-2 6 2 6-2v15l-.5.4L15 18l-6 2zm0-2.2l6-2V5.8l-6 2v10z',
        pin:    'M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z',
        turns:  'M6 20v-4c0-3 2-4 4-4h2V8l5 4-5 4v-4h-2c-1 0-2 .5-2 2v6H6z',
        gear:   'M12 8a4 4 0 100 8 4 4 0 000-8zm9 4l-2 1.7.4 2.6-2.5 1-1.4 2.2-2.6-.5L10 22l-2-1.5-2.6.5L4 18.8 1.5 17.8 2 15.2 0 13.5 0 12l.5-1.7L-.6 8.8 1.9 7.8 3.3 5.6 5.9 6 8 4.5 10 3l2.6.5L15 2l1.4 2.2 2.6-.4 1.1 2.5L23 8l-.5 1.7L24 12z',
        bolt:   'M13 2L4 14h6l-1 8 10-12h-6l1-8z',
        swatch: 'M12 2a10 10 0 000 20 2.8 2.8 0 002.8-2.8c0-.74-.3-1.4-.77-1.9-.45-.48-.73-1.12-.73-1.8a2.7 2.7 0 012.7-2.7H18a4 4 0 004-4c0-4.42-4.48-8-10-8zM6.5 13A1.5 1.5 0 116.5 10a1.5 1.5 0 010 3zm3-4A1.5 1.5 0 119.5 6a1.5 1.5 0 010 3zm5 0A1.5 1.5 0 1114.5 6a1.5 1.5 0 010 3z',
        info:   'M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-6h2v6zm-1-8.2A1.3 1.3 0 1112 6.2a1.3 1.3 0 010 2.6z',
    };
    const svg = (p) => `<svg viewBox="0 0 24 24" class="ic"><path d="${p}"/></svg>`;

    // ── control schema ─────────────────────────────────────────────────────
    const ROUTE_CARDS = [
        { value: 'chevron',       label: 'opt_chevron',   icon: 'fa-sharp fa-solid fa-chevron-up',  prev: 'stack3' },
        { value: 'chevron3d',     label: 'opt_chevron3d', icon: 'fa-sharp fa-solid fa-chevron-up',  prev: 'stack3', cls: 'raised' },
        { value: 'arrow',         label: 'opt_arrow',     icon: 'fa-sharp fa-solid fa-caret-up',    prev: 'stack3' },
        { value: 'doublechevron', label: 'opt_double',    icon: 'fa-sharp fa-solid fa-angles-up',   prev: 'stack3' },
        { value: 'dash',          label: 'opt_dash',      icon: 'fa-sharp fa-solid fa-grip-lines',  prev: 'stack3' },
        { value: 'ribbon',        label: 'opt_ribbon',    icon: '',                                  prev: 'bar' },
        { value: 'dot',           label: 'opt_dot',       icon: 'fa-sharp fa-solid fa-circle',      prev: 'stack3 small' },
        { value: 'pulse',         label: 'opt_pulse',     icon: 'fa-sharp fa-solid fa-chevron-up',  prev: 'stack3', cls: 'pulse' },
        { value: 'diamond',       label: 'opt_diamond',   icon: 'fa-sharp fa-solid fa-diamond',     prev: 'stack3' },
        { value: 'blade',         label: 'opt_blade',     icon: 'fa-sharp fa-solid fa-up-long',     prev: 'stack3' },
        { value: 'spike',         label: 'opt_spike',     icon: 'fa-sharp fa-solid fa-caret-up',    prev: 'stack3' },
    ];
    // ready-made looks — one click sets style + colour + shape together
    const ROUTE_PRESETS = [
        { label: 'Forza',   icon: 'fa-flag-checkered', set: { routeStyle: 'chevron3d', routeColor: '#3aa0ff', chevronSpacing: 5, routeWidth: 3.2, chevronHeight: 0.24, chevronLift: 0.08, baseOpacity: 0.95, flowAnim: true } },
        { label: 'Neon',    icon: 'fa-bolt',           set: { routeStyle: 'pulse', routeColor: '#ff3df0', chevronSpacing: 4, routeWidth: 3.0, chevronHeight: 0.18, baseOpacity: 1.0, flowAnim: true } },
        { label: 'Racing',  icon: 'fa-gauge-high',     set: { routeStyle: 'arrow', routeColor: '#2dd4bf', chevronSpacing: 4.5, routeWidth: 3.4, chevronHeight: 0.26, baseOpacity: 1.0, flowAnim: true } },
        { label: 'Minimal', icon: 'fa-minus',          set: { routeStyle: 'dash', routeColor: '#ffffff', chevronSpacing: 6, routeWidth: 2.4, chevronHeight: 0.05, baseOpacity: 0.72, flowAnim: false } },
        { label: 'Cyber',   icon: 'fa-microchip',      set: { routeStyle: 'ribbon', routeColor: '#22d3ee', routeWidth: 2.0, chevronLift: 0.08, baseOpacity: 0.85, flowAnim: true } },
        { label: 'Lava',    icon: 'fa-fire',           set: { routeStyle: 'spike', routeColor: '#ff6a2b', chevronSpacing: 4.5, routeWidth: 3.2, chevronHeight: 0.28, baseOpacity: 1.0, flowAnim: true } },
    ];
    const MARKER_CARDS = [
        { value: 'beam',   label: 'opt_beam',   icon: '',                                         prev: 'beam' },
        { value: 'pillar', label: 'opt_pillar', icon: 'fa-sharp fa-solid fa-grip-lines-vertical', prev: 'single' },
        { value: 'pin',    label: 'opt_pin',    icon: 'fa-sharp fa-solid fa-location-dot',        prev: 'single' },
    ];
    const HUD_CARDS = [
        { value: 'compass',  label: 'opt_compass',  icon: 'fa-sharp fa-solid fa-location-arrow', prev: 'single' },
        { value: 'arrow3d',  label: 'opt_arrow3d',  icon: 'fa-sharp fa-solid fa-location-arrow', prev: 'single' },
        { value: 'neon',     label: 'opt_neon',     icon: 'fa-sharp fa-solid fa-location-arrow', prev: 'single' },
        { value: 'chevrons', label: 'opt_chevrons', icon: 'fa-sharp fa-solid fa-angles-up',      prev: 'single' },
        { value: 'minibox', label: 'opt_minibox', icon: 'fa-sharp fa-solid fa-diamond-turn-right',    prev: 'single' },
        { value: 'glass',   label: 'opt_glass',   icon: 'fa-sharp fa-regular fa-gem',                 prev: 'single' },
        { value: 'modern',  label: 'opt_modern',  icon: 'fa-sharp fa-solid fa-location-dot',          prev: 'single' },
        { value: 'sharp',   label: 'opt_sharp',   icon: 'fa-sharp fa-solid fa-square-chevron-right',  prev: 'single' },
        { value: 'strip',   label: 'opt_strip',   icon: 'fa-sharp fa-solid fa-grip-lines',            prev: 'single' },
        { value: 'line',    label: 'opt_line',    icon: 'fa-sharp fa-solid fa-chart-simple',          prev: 'single' },
    ];

    const TABS = [
        { id: 'route', fa: 'fa-sharp fa-solid fa-route', label: 'tab_route', groups: [
            { title: 'grp_route_presets', rows: [
                { type: 'presets', key: 'routePreset', label: 'set_routePreset', items: ROUTE_PRESETS },
            ]},
            { title: 'grp_route_style', rows: [
                { type: 'gallery', key: 'routeStyle', label: 'set_routeStyle', cards: ROUTE_CARDS },
            ]},
            { title: 'grp_route_main', rows: [
                { type: 'toggle', key: 'showRoute', label: 'set_showRoute' },
                { type: 'color',  key: 'routeColor', label: 'set_routeColor' },
                { type: 'slider', key: 'baseOpacity', label: 'set_baseOpacity', min: 0.1, max: 1, step: 0.01, pct: true },
                { type: 'slider', key: 'drawDistance', label: 'set_drawDistance', min: 40, max: 300, step: 5, unit: 'u_m' },
            ]},
            { title: 'grp_route_shape', collapsible: true, collapsed: true, rows: [
                { type: 'slider', key: 'chevronSpacing', label: 'set_chevronSpacing', min: 2, max: 14, step: 0.5, unit: 'u_m', dp: 1 },
                { type: 'slider', key: 'chevronScale', label: 'set_chevronScale', min: 0.4, max: 2.5, step: 0.05, unit: 'u_x', dp: 2 },
                { type: 'slider', key: 'routeWidth', label: 'set_routeWidth', min: 1, max: 6, step: 0.1, unit: 'u_m', dp: 1 },
                { type: 'slider', key: 'chevronLift', label: 'set_chevronLift', min: 0, max: 0.6, step: 0.01, unit: 'u_m', dp: 2 },
                { type: 'slider', key: 'chevronHeight', label: 'set_chevronHeight', min: 0, max: 0.6, step: 0.01, unit: 'u_m', dp: 2 },
                { type: 'toggle', key: 'flowAnim', label: 'set_flowAnim' },
                { type: 'toggle', key: 'fadeEnds', label: 'set_fadeEnds' },
            ]},
        ]},
        { id: 'marker', fa: 'fa-sharp fa-solid fa-location-dot', label: 'tab_marker', groups: [
            { title: 'grp_marker_style', rows: [
                { type: 'gallery', key: 'markerStyle', label: 'set_markerStyle', cards: MARKER_CARDS },
            ]},
            { title: 'grp_marker', rows: [
                { type: 'toggle', key: 'show3D', label: 'set_show3D' },
                { type: 'color',  key: 'markerColor', label: 'set_markerColor' },
                { type: 'color',  key: 'markerAccent', label: 'set_markerAccent' },
                { type: 'slider', key: 'beamHeight', label: 'set_beamHeight', min: 6, max: 60, step: 1, unit: 'u_m' },
                { type: 'toggle', key: 'showDistance', label: 'set_showDistance' },
                { type: 'text',   key: 'markerLabel', label: 'set_markerLabel', placeholder: 'lbl_waypoint' },
            ]},
        ]},
        { id: 'hud', fa: 'fa-sharp fa-solid fa-diamond-turn-right', label: 'tab_hud', groups: [
            { title: 'grp_hud_style', rows: [
                { type: 'gallery', key: 'hudStyle', label: 'set_hudStyle', cards: HUD_CARDS },
            ]},
            { hint: 'hud_drag_hint' },
            { title: 'grp_hud', rows: [
                { type: 'toggle', key: 'hudEnabled', label: 'set_hudEnabled' },
                { type: 'color',  key: 'hudAccent', label: 'set_hudAccent' },
                { type: 'slider', key: 'hudScale', label: 'set_hudScale', min: 0.7, max: 1.6, step: 0.05, unit: 'u_x', dp: 2 },
                { type: 'toggle', key: 'hudShowStreet', label: 'set_hudShowStreet' },
                { type: 'toggle', key: 'hudShowEta', label: 'set_hudShowEta' },
            ]},
        ]},
        { id: 'turns', fa: 'fa-sharp fa-solid fa-route-interstate', label: 'tab_turns', groups: [
            { hint: 'turns_hint' },
            { title: 'grp_turns', rows: [
                { type: 'toggle', key: 'turnRisk', label: 'set_turnRisk' },
                { type: 'toggle', key: 'riskOnFoot', label: 'set_riskOnFoot', dep: 'turnRisk' },
                { type: 'toggle', key: 'gripAuto', label: 'set_gripAuto', dep: 'turnRisk' },
                { type: 'slider', key: 'gripManual', label: 'set_gripManual', min: 0.5, max: 1.3, step: 0.01, unit: 'u_g', dp: 2, dep: 'turnRisk', depNot: 'gripAuto' },
                { type: 'slider', key: 'safetyMargin', label: 'set_safetyMargin', min: 0, max: 0.4, step: 0.01, pct: true, dep: 'turnRisk' },
            ]},
            { title: 'grp_turns_colors', collapsible: true, collapsed: true, rows: [
                { type: 'color', key: 'riskSafe', label: 'set_riskSafe', dep: 'turnRisk' },
                { type: 'color', key: 'riskCaution', label: 'set_riskCaution', dep: 'turnRisk' },
                { type: 'color', key: 'riskWarning', label: 'set_riskWarning', dep: 'turnRisk' },
                { type: 'color', key: 'riskDanger', label: 'set_riskDanger', dep: 'turnRisk' },
            ]},
        ]},
        { id: 'behaviour', fa: 'fa-sharp fa-solid fa-sliders', label: 'tab_behaviour', groups: [
            { title: 'grp_behaviour', rows: [
                { type: 'toggle', key: 'onlyInVehicle', label: 'set_onlyInVehicle' },
                { type: 'toggle', key: 'hideGameRoute', label: 'set_hideGameRoute' },
                { type: 'toggle', key: 'autoStart', label: 'set_autoStart' },
            ]},
        ]},
        { id: 'perf', fa: 'fa-sharp fa-solid fa-gauge-high', label: 'tab_perf', groups: [
            { hint: 'perf_hint' },
            { title: 'grp_perf', rows: [
                { type: 'select', key: 'perfMode', label: 'set_perfMode', opts: [['quality','opt_quality'],['balanced','opt_balanced'],['performance','opt_performance']] },
            ]},
        ]},
        { id: 'theme', fa: 'fa-sharp fa-solid fa-palette', label: 'tab_theme', groups: [
            { hint: 'theme_hint' },
            { title: 'grp_theme', rows: [
                { type: 'color', key: 'uiAccent', label: 'set_uiAccent' },
            ]},
        ]},
    ];

    const PRESETS = ['#3aa0ff','#5b8cff','#8b7bff','#c061ff','#ff5db1','#ff5252','#ff8c42',
                     '#ffd23f','#34d399','#2dd4bf','#22d3ee','#ffffff','#cfd6e4','#0a0e16','#7c8597','#1ea7ff'];

    const T = (k, ...a) => window.I18n.t(k, ...a);

    // ── state ──────────────────────────────────────────────────────────────
    let state = {};                 // current settings mirror
    let defaults = {};
    let built = false;
    let dirty = false;
    let demoOn = false;
    const ctlRefs = {};             // key -> { sync(value), row }
    const rowDeps = [];             // { el, dep, depNot }

    // ── colour helpers ─────────────────────────────────────────────────────
    function hexToRgb(h) {
        h = (h || '').replace('#', '');
        if (h.length === 3) h = h.split('').map(c => c + c).join('');
        const n = parseInt(h, 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    function rgbToHex(r, g, b) {
        const h = (x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0');
        return ('#' + h(r) + h(g) + h(b)).toUpperCase();
    }
    function rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
        let h = 0;
        if (d) {
            if (mx === r) h = ((g - b) / d) % 6;
            else if (mx === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h *= 60; if (h < 0) h += 360;
        }
        return { h, s: mx ? d / mx : 0, v: mx };
    }
    function hsvToRgb(h, s, v) {
        const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
        let r = 0, g = 0, b = 0;
        if (h < 60) [r, g, b] = [c, x, 0];
        else if (h < 120) [r, g, b] = [x, c, 0];
        else if (h < 180) [r, g, b] = [0, c, x];
        else if (h < 240) [r, g, b] = [0, x, c];
        else if (h < 300) [r, g, b] = [x, 0, c];
        else [r, g, b] = [c, 0, x];
        return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
    }
    const rgbaStr = (hex, a) => { const c = hexToRgb(hex); return `rgba(${c.r},${c.g},${c.b},${a})`; };

    // ── live-update throttle (one rAF flush per key) ───────────────────────
    let pending = {}, scheduled = false;
    function pushUpdate(key, value) {
        state[key] = value;
        pending[key] = value;
        markDirty();
        if (!scheduled) {
            scheduled = true;
            requestAnimationFrame(() => {
                scheduled = false;
                const batch = pending; pending = {};
                for (const k in batch) post('update', { key: k, value: batch[k] });
            });
        }
    }

    function markDirty() {
        if (dirty) return;
        dirty = true;
        const tag = $('#dirty-tag');
        tag.textContent = T('ui_unsaved'); tag.className = 'dirty on';
    }
    function markSaved() {
        dirty = false;
        const tag = $('#dirty-tag');
        tag.textContent = T('ui_saved_tag'); tag.className = 'dirty saved';
        setTimeout(() => { if (!dirty) tag.textContent = ''; }, 1800);
    }

    // ── accent theming (uiAccent drives the whole panel) ───────────────────
    function applyAccent(hex) {
        const root = document.documentElement.style;
        root.setProperty('--acc', hex);
        root.setProperty('--acc-soft', rgbaStr(hex, 0.16));
        root.setProperty('--acc-line', rgbaStr(hex, 0.42));
        const c = hexToRgb(hex);
        // readable ink on the accent (white on dark accents, near-black on light)
        const lum = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
        root.setProperty('--acc-ink', lum > 0.62 ? '#0a1422' : '#ffffff');
    }

    // ════════════════════════════════════════════════════════════════════
    //  BUILD UI
    // ════════════════════════════════════════════════════════════════════
    function build() {
        const rail = $('#rail'), content = $('#content');
        rail.innerHTML = ''; content.innerHTML = '';

        TABS.forEach((tab, ti) => {
            const tb = document.createElement('div');
            tb.className = 'tab' + (ti === 0 ? ' active' : '');
            tb.innerHTML = `<i class="${tab.fa}"></i><span>${T(tab.label)}</span>`;
            tb.onclick = () => selectTab(tab.id);
            tb.dataset.tab = tab.id;
            rail.appendChild(tb);

            const page = document.createElement('div');
            page.className = 'page' + (ti === 0 ? ' active' : '');
            page.dataset.page = tab.id;

            tab.groups.forEach(g => {
                if (g.hint) {
                    const h = document.createElement('div');
                    h.className = 'hint';
                    h.innerHTML = `<i class="fa-sharp fa-solid fa-circle-info"></i><span>${T(g.hint)}</span>`;
                    page.appendChild(h);
                    return;
                }
                const grp = document.createElement('div');
                grp.className = 'group' + (g.collapsible ? ' collapsible' : '') + (g.collapsed ? ' collapsed' : '');
                const title = document.createElement('div');
                title.className = 'group-title';
                title.innerHTML = `<span>${T(g.title)}</span>` + (g.collapsible ? '<i class="fa-sharp fa-solid fa-chevron-down gchev"></i>' : '');
                if (g.collapsible) title.onclick = () => grp.classList.toggle('collapsed');
                grp.appendChild(title);
                const card = document.createElement('div');
                card.className = 'card';
                g.rows.forEach(r => card.appendChild(buildRow(r)));
                grp.appendChild(card);
                page.appendChild(grp);
            });
            content.appendChild(page);
        });
    }

    function selectTab(id) {
        document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === id));
        document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.dataset.page === id));
    }

    function buildRow(r) {
        const row = document.createElement('div');
        row.className = 'row';
        if (r.dep || r.depNot) rowDeps.push({ el: row, dep: r.dep, depNot: r.depNot });

        if (r.type === 'toggle') {
            row.innerHTML = `<div class="row-label">${T(r.label)}</div>`;
            const tg = document.createElement('div');
            tg.className = 'toggle';
            tg.onclick = () => { const v = !state[r.key]; tg.classList.toggle('on', v); pushUpdate(r.key, v); refreshDeps(); };
            row.appendChild(tg);
            ctlRefs[r.key] = { row, sync: (v) => tg.classList.toggle('on', !!v) };

        } else if (r.type === 'select') {
            row.classList.add('col');
            row.innerHTML = `<div class="row-top"><div class="row-label">${T(r.label)}</div></div>`;
            const seg = document.createElement('div');
            seg.className = 'seg wide';
            const optEls = {};
            r.opts.forEach(([val, lab]) => {
                const o = document.createElement('div');
                o.className = 'seg-opt'; o.textContent = T(lab);
                o.onclick = () => { setSeg(r.key, optEls, val); pushUpdate(r.key, val); };
                seg.appendChild(o); optEls[val] = o;
            });
            row.appendChild(seg);
            ctlRefs[r.key] = { row, sync: (v) => setSeg(r.key, optEls, v) };

        } else if (r.type === 'slider') {
            row.classList.add('col');
            const valId = `v-${r.key}`;
            row.innerHTML = `<div class="slider-wrap">
                <div class="slider-head"><div class="row-label">${T(r.label)}</div><div class="slider-val" id="${valId}"></div></div></div>`;
            const wrap = $('.slider-wrap', row);
            const inp = document.createElement('input');
            inp.type = 'range'; inp.className = 'slider';
            inp.min = r.min; inp.max = r.max; inp.step = r.step;
            const valEl = $('#' + valId, row);
            const fmt = (v) => {
                if (r.pct) return Math.round(v * 100) + (T('u_pct'));
                const s = r.dp ? Number(v).toFixed(r.dp) : String(Math.round(v));
                return s + (r.unit ? ' ' + T(r.unit) : '');
            };
            const paint = (v) => {
                inp.style.setProperty('--fill', ((v - r.min) / (r.max - r.min) * 100) + '%');
                valEl.textContent = fmt(v);
            };
            inp.oninput = () => { const v = parseFloat(inp.value); paint(v); pushUpdate(r.key, v); };
            wrap.appendChild(inp);
            ctlRefs[r.key] = { row, sync: (v) => { inp.value = v; paint(parseFloat(v)); } };

        } else if (r.type === 'color') {
            row.innerHTML = `<div class="row-label">${T(r.label)}</div>`;
            const ctl = document.createElement('div');
            ctl.className = 'colorctl';
            ctl.innerHTML = `<span class="sw"></span><span class="hx"></span>`;
            ctl.onclick = (e) => openPicker(r.key, e.currentTarget);
            row.appendChild(ctl);
            const sw = $('.sw', ctl), hx = $('.hx', ctl);
            ctlRefs[r.key] = { row, sync: (v) => { sw.style.background = v; hx.textContent = v; } };

        } else if (r.type === 'text') {
            row.classList.add('col');
            row.innerHTML = `<div class="row-top"><div class="row-label">${T(r.label)}</div></div>`;
            const inp = document.createElement('input');
            inp.type = 'text'; inp.maxLength = 40; inp.className = 'cp-hex'; inp.spellcheck = false;
            inp.style.textTransform = 'none';
            if (r.placeholder) inp.placeholder = T(r.placeholder);
            inp.oninput = () => pushUpdate(r.key, inp.value);
            row.appendChild(inp);
            ctlRefs[r.key] = { row, sync: (v) => { inp.value = v; } };

        } else if (r.type === 'gallery') {
            row.classList.add('col', 'gallery-row');
            row.innerHTML = `<div class="row-top"><div class="row-label">${T(r.label)}</div></div>`;
            const grid = document.createElement('div');
            grid.className = 'gallery';
            const cards = {};
            r.cards.forEach(c => {
                const card = document.createElement('div');
                card.className = 'gcard';
                card.innerHTML = `<div class="gprev ${c.prev || ''} ${c.cls || ''}">${renderPrev(c)}</div><div class="gtag">${T(c.label)}</div>`;
                card.onclick = () => { setGallery(cards, c.value); pushUpdate(r.key, c.value); };
                grid.appendChild(card); cards[c.value] = card;
            });
            row.appendChild(grid);
            ctlRefs[r.key] = { row, sync: (v) => setGallery(cards, v) };

        } else if (r.type === 'presets') {
            row.classList.add('col');
            row.innerHTML = `<div class="row-top"><div class="row-label">${T(r.label)}</div></div>`;
            const grid = document.createElement('div');
            grid.className = 'presets';
            r.items.forEach(p => {
                const card = document.createElement('div');
                card.className = 'pcard';
                card.innerHTML = `<i class="fa-sharp fa-solid ${p.icon}"></i><span>${p.label}</span>`;
                card.onclick = () => applyPreset(p.set);
                grid.appendChild(card);
            });
            row.appendChild(grid);
            ctlRefs[r.key] = { row, sync: () => {} };
        }
        return row;
    }

    // apply a preset: set several keys at once, sync their controls, push live
    function applyPreset(set) {
        for (const k in set) {
            state[k] = set[k];
            if (ctlRefs[k]) ctlRefs[k].sync(set[k]);
            pushUpdate(k, set[k]);
        }
        refreshDeps();
    }

    function renderPrev(c) {
        if (c.prev === 'bar') return '<span class="prev-bar"></span>';
        if (c.prev === 'beam') return '<span class="prev-beam"></span>';
        const ic = c.icon ? `<i class="${c.icon}"></i>` : '';
        if (c.prev && c.prev.indexOf('stack3') === 0) return ic + ic + ic;
        return ic;
    }
    function setGallery(cards, val) {
        for (const v in cards) cards[v].classList.toggle('active', v === val);
    }

    function setSeg(key, optEls, val) {
        for (const v in optEls) optEls[v].classList.toggle('active', v === val);
    }

    function refreshDeps() {
        rowDeps.forEach(d => {
            let off = false;
            if (d.dep && !state[d.dep]) off = true;
            if (d.depNot && state[d.depNot]) off = true;
            d.el.classList.toggle('disabled', off);
        });
    }

    function syncAll() {
        for (const k in ctlRefs) if (state[k] !== undefined) ctlRefs[k].sync(state[k]);
        refreshDeps();
        applyAccent(state.uiAccent || '#3aa0ff');
        // localise marker label key if it's a known locale key (pretty preview)
    }

    // ════════════════════════════════════════════════════════════════════
    //  COLOUR PICKER
    // ════════════════════════════════════════════════════════════════════
    let cpTarget = null, cpH = 210, cpS = 1, cpV = 1;
    const cp = $('#cp'), cpSv = $('#cp-sv'), cpHue = $('#cp-hue');
    const cpSvCur = $('#cp-sv-cursor'), cpHueCur = $('#cp-hue-cursor');
    const cpHex = $('#cp-hex'), cpSwatch = $('#cp-swatch');

    // presets
    (function () {
        const wrap = $('#cp-presets');
        PRESETS.forEach(p => {
            const b = document.createElement('div');
            b.className = 'pr'; b.style.background = p;
            b.onclick = () => { const c = hexToRgb(p); const hsv = rgbToHsv(c.r, c.g, c.b); cpH = hsv.h; cpS = hsv.s; cpV = hsv.v; cpRender(true); };
            wrap.appendChild(b);
        });
    })();

    function openPicker(key, anchor) {
        cpTarget = key;
        const c = hexToRgb(state[key] || '#ffffff');
        const hsv = rgbToHsv(c.r, c.g, c.b);
        cpH = hsv.h; cpS = hsv.s; cpV = hsv.v;
        cp.classList.remove('hidden');
        // position to the right of the control, clamped to viewport
        const ar = anchor.getBoundingClientRect();
        const cw = 256, ch = 280;
        let left = ar.right + 10, top = ar.top - 6;
        if (left + cw > window.innerWidth) left = ar.left - cw - 10;
        if (top + ch > window.innerHeight) top = window.innerHeight - ch - 10;
        if (top < 8) top = 8;
        cp.style.left = left + 'px'; cp.style.top = top + 'px';
        cpRender(false);
    }
    function closePicker() { cp.classList.add('hidden'); cpTarget = null; }

    function cpRender(emit, fromHex) {
        cpSv.style.setProperty('--cp-h', cpH);
        cpSvCur.style.left = (cpS * 100) + '%';
        cpSvCur.style.top = ((1 - cpV) * 100) + '%';
        cpHueCur.style.left = (cpH / 360 * 100) + '%';
        const rgb = hsvToRgb(cpH, cpS, cpV);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        cpSwatch.style.background = hex;
        if (!fromHex) cpHex.value = hex;   // don't fight the caret while the user types in the hex box
        if (cpTarget) {
            ctlRefs[cpTarget].sync(hex);
            if (cpTarget === 'uiAccent') applyAccent(hex);
            if (emit) pushUpdate(cpTarget, hex);   // only a real drag/typed change is "unsaved"
        }
    }

    function dragSV(e) {
        const r = cpSv.getBoundingClientRect();
        cpS = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        cpV = Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height));
        cpRender(true);
    }
    function dragHue(e) {
        const r = cpHue.getBoundingClientRect();
        cpH = Math.max(0, Math.min(360, (e.clientX - r.left) / r.width * 360));
        cpRender(true);
    }
    function bindDrag(el, fn) {
        el.addEventListener('mousedown', (e) => {
            e.preventDefault(); fn(e);
            const mv = (ev) => fn(ev);
            const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
            document.addEventListener('mousemove', mv);
            document.addEventListener('mouseup', up);
        });
    }
    bindDrag(cpSv, dragSV);
    bindDrag(cpHue, dragHue);
    cpHex.addEventListener('input', () => {
        let v = cpHex.value.trim(); if (v[0] !== '#') v = '#' + v;
        if (/^#[0-9a-fA-F]{6}$/.test(v)) { const c = hexToRgb(v); const hsv = rgbToHsv(c.r, c.g, c.b); cpH = hsv.h; cpS = hsv.s; cpV = hsv.v; cpRender(true, true); }
    });
    document.addEventListener('mousedown', (e) => {
        if (cp.classList.contains('hidden')) return;
        if (!cp.contains(e.target) && !e.target.closest('.colorctl')) closePicker();
    });

    // ════════════════════════════════════════════════════════════════════
    //  LIVE READOUT
    // ════════════════════════════════════════════════════════════════════
    const BAND_LABEL = { safe: 'set_riskSafe', caution: 'set_riskCaution', warning: 'set_riskWarning', danger: 'set_riskDanger' };
    function updateLive(d) {
        $('#lv-speed').textContent = Math.round(d.speed || 0);
        const pill = $('#lv-risk');
        const band = d.band || 'none';
        pill.className = 'risk-pill ' + (band === 'none' ? '' : band);
        if (band === 'none') {
            pill.textContent = '—'; pill.style.color = ''; pill.style.background = '';
        } else {
            pill.textContent = T(BAND_LABEL[band] || 'set_riskSafe');
            const hex = state['risk' + band.charAt(0).toUpperCase() + band.slice(1)];
            if (hex) { pill.style.color = hex; pill.style.background = rgbaStr(hex, 0.16); }
        }
        const st = $('#lv-state');
        st.className = 'state-dot' + (d.active ? ' on' : '');
        st.textContent = d.active ? T('live_active') : T('live_none');
    }

    // ════════════════════════════════════════════════════════════════════
    //  NAVIGATION HUD (turn-by-turn overlay — renders any time, no focus)
    // ════════════════════════════════════════════════════════════════════
    const hudEl = $('#hud');
    const TURN_ICON = {
        'straight': 'fa-arrow-up',
        'slight-left': 'fa-arrow-up-left', 'slight-right': 'fa-arrow-up-right',
        'left': 'fa-arrow-turn-left', 'right': 'fa-arrow-turn-right',
        'sharp-left': 'fa-arrow-left', 'sharp-right': 'fa-arrow-right',
        'uturn': 'fa-arrow-turn-down', 'arrive': 'fa-location-dot',
    };
    let hudStyleCur = null, hudDragging = false, hudGrab = null;
    const m3 = $('#marker3d');

    // ── 3D destination billboard (positioned by Lua via World3dToScreen2d) ──
    function applyMarker(d) {
        if (!d.v) { m3.classList.add('hidden'); return; }
        m3.classList.remove('hidden');
        m3.style.left = (d.x * 100) + '%';
        m3.style.top = (d.y * 100) + '%';
        m3.style.setProperty('--macc', d.accent || '#ffcf4a');
        const num = m3.querySelector('.m-num'); if (num) num.textContent = d.dist;
        const unit = m3.querySelector('.m-unit'); if (unit) unit.textContent = d.unit;
        const lab = m3.querySelector('.m-label'); if (lab) lab.textContent = d.label || 'WAYPOINT';
    }

    // ── HUD dragging (active while the editor is open) ──────────────────────
    hudEl.addEventListener('mousedown', (e) => {
        if (!hudEl.classList.contains('editing')) return;
        hudDragging = true;
        const r = hudEl.getBoundingClientRect();
        hudGrab = { dx: e.clientX - r.left, dy: e.clientY - r.top };
        e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
        if (!hudDragging) return;
        let nx = (e.clientX - hudGrab.dx) / window.innerWidth;
        let ny = (e.clientY - hudGrab.dy) / window.innerHeight;
        nx = Math.max(0, Math.min(0.96, nx)); ny = Math.max(0, Math.min(0.96, ny));
        hudEl.style.left = (nx * 100) + '%'; hudEl.style.top = (ny * 100) + '%';
        state.hudX = nx; state.hudY = ny;
        pushUpdate('hudX', nx); pushUpdate('hudY', ny);
    });
    document.addEventListener('mouseup', () => { hudDragging = false; });
    hudEl.addEventListener('touchstart', (e) => {
        if (!hudEl.classList.contains('editing') || !e.touches.length) return;
        hudDragging = true;
        const r = hudEl.getBoundingClientRect();
        hudGrab = { dx: e.touches[0].clientX - r.left, dy: e.touches[0].clientY - r.top };
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
        if (!hudDragging || !e.touches.length) return;
        let nx = (e.touches[0].clientX - hudGrab.dx) / window.innerWidth;
        let ny = (e.touches[0].clientY - hudGrab.dy) / window.innerHeight;
        nx = Math.max(0, Math.min(0.96, nx)); ny = Math.max(0, Math.min(0.96, ny));
        hudEl.style.left = (nx * 100) + '%'; hudEl.style.top = (ny * 100) + '%';
        state.hudX = nx; state.hudY = ny;
        pushUpdate('hudX', nx); pushUpdate('hudY', ny);
    }, { passive: true });
    document.addEventListener('touchend', () => { hudDragging = false; });

    function fmtMeters(m) {
        if (m == null) return '';
        if (m >= 1000) return (m / 1000).toFixed(1) + ' km';
        return Math.round(m) + ' m';
    }
    function hudSkeleton(style) {
        if (style === 'compass')
            return `<div class="hud-compass"><div class="h-ring"><div class="h-arrow"></div></div><div class="h-dist"></div></div>`;
        if (style === 'arrow3d')
            return `<div class="hud-arrow3d"><div class="h-arrow"></div><div class="h-dist"></div></div>`;
        if (style === 'neon')
            return `<div class="hud-neon"><div class="h-arrow"></div><div class="h-dist"></div></div>`;
        if (style === 'chevrons')
            return `<div class="hud-chevrons"><div class="h-arrow"><i class="fa-sharp fa-solid fa-angles-up"></i></div><div class="h-dist"></div></div>`;
        if (style === 'strip')
            return `<div class="hud-strip"><span class="h-turn"><i></i></span><span class="h-dist"></span><span class="h-sep"></span><span class="h-street"></span></div>`;
        if (style === 'modern')
            return `<div class="hud-modern"><span class="h-street"></span><span class="h-dist"></span><span class="h-turn"><i></i></span></div>`;
        if (style === 'sharp')
            return `<div class="hud-sharp"><span class="h-turn"><i></i></span><div class="h-main"><span class="h-street"></span><span class="h-dist"></span></div></div>`;
        if (style === 'line')
            return `<div class="hud-line"><span class="h-bar"></span><div class="h-main"><div class="h-dist"></div><div class="h-sub"><span class="h-street"></span> · <span class="h-eta"></span></div></div></div>`;
        const cls = style === 'glass' ? 'hud-glass' : 'hud-minibox';
        return `<div class="${cls}"><div class="h-turn"><i></i></div><div class="h-main"><div class="h-dist"></div><div class="h-street"></div><div class="h-sub"><span class="h-remaining"></span> · <span class="h-eta"></span></div></div></div>`;
    }
    function applyHud(d) {
        if (!d.active) { hudEl.classList.add('hidden'); return; }
        hudEl.classList.remove('hidden');
        if (d.style !== hudStyleCur) { hudEl.innerHTML = hudSkeleton(d.style); hudStyleCur = d.style; }
        if (!hudDragging) {
            hudEl.style.left = ((d.x != null ? d.x : 0.02) * 100) + '%';
            hudEl.style.top  = ((d.y != null ? d.y : 0.04) * 100) + '%';
        }
        hudEl.style.setProperty('--hacc', d.accent || '#3aa0ff');
        hudEl.style.setProperty('--hscale', d.scale || 1);
        const q = (s) => hudEl.querySelector(s);
        const ic = q('.h-turn i'); if (ic) ic.className = 'fa-sharp fa-solid ' + (TURN_ICON[d.turn] || 'fa-arrow-up');
        const cmp = q('.h-arrow'); if (cmp && d.bearing != null) cmp.style.transform = 'rotate(' + d.bearing + 'deg)';
        // arrow styles point at the FINAL destination → show distance to destination;
        // turn-by-turn styles show distance to the next maneuver.
        const arrowStyle = (d.style === 'compass' || d.style === 'arrow3d' || d.style === 'neon' || d.style === 'chevrons');
        const dist = q('.h-dist');
        if (dist) {
            if (arrowStyle) dist.textContent = (d.destDist != null) ? fmtMeters(d.destDist) : fmtMeters(d.remaining);
            else dist.textContent = (d.turn === 'arrive') ? T('hud_arrive') : fmtMeters(d.turnDist);
        }
        const st = q('.h-street'); if (st) st.textContent = d.street || '';
        const rem = q('.h-remaining'); if (rem) rem.textContent = fmtMeters(d.remaining);
        const eta = q('.h-eta'); if (eta) eta.textContent = (d.eta != null) ? (d.eta + ' ' + T('hud_min')) : '';
    }

    // ════════════════════════════════════════════════════════════════════
    //  STATIC LABELS
    // ════════════════════════════════════════════════════════════════════
    function localiseChrome() {
        $('#ui-title').textContent = T('ui_title');
        $('#ui-sub').textContent = T('ui_sub');
        $('#lk-speed').textContent = T('live_speed');
        $('#lk-corner').textContent = T('live_corner');
        $('#lk-state').textContent = T('live_state');
        $('#t-demo').textContent = demoOn ? T('btn_demo_off') : T('btn_demo');
        $('#t-reset').textContent = T('btn_reset');
        $('#t-close').textContent = T('btn_close');
        $('#t-save').textContent = T('btn_save');
    }

    // ════════════════════════════════════════════════════════════════════
    //  OPEN / CLOSE
    // ════════════════════════════════════════════════════════════════════
    function open(data) {
        if (data.locale) window.I18n.setLocale(data.locale);
        defaults = data.defaults || {};
        state = Object.assign({}, data.settings || {});
        if (!built) { build(); built = true; }
        localiseChrome();
        syncAll();
        dirty = false; $('#dirty-tag').textContent = '';
        const root = $('#root');
        root.classList.remove('hidden');
        requestAnimationFrame(() => root.classList.add('show'));
        hudEl.classList.add('editing');          // HUD becomes draggable while editing
    }
    function close() {
        const root = $('#root');
        root.classList.remove('show');
        closePicker();
        hudEl.classList.remove('editing');
        setTimeout(() => root.classList.add('hidden'), 200);
    }

    // ── footer buttons ──────────────────────────────────────────────────
    $('#btn-save').onclick = () => { post('save'); markSaved(); };
    $('#btn-close').onclick = () => { post('close'); close(); };
    function paintDemoBtn() {
        $('#t-demo').textContent = demoOn ? T('btn_demo_off') : T('btn_demo');
        $('#btn-demo').classList.toggle('armed', demoOn);
        const di = $('#btn-demo i'); if (di) di.className = demoOn ? 'fa-sharp fa-solid fa-stop' : 'fa-sharp fa-solid fa-play';
    }
    $('#btn-demo').onclick = () => {
        demoOn = !demoOn;
        paintDemoBtn();
        post('demo', { on: demoOn });
    };
    let resetArmed = false, resetTimer = null;
    $('#btn-reset').onclick = () => {
        const b = $('#btn-reset');
        if (!resetArmed) {
            resetArmed = true; b.classList.add('armed'); b.querySelector('span').textContent = T('btn_reset') + ' ?';
            resetTimer = setTimeout(() => { resetArmed = false; b.classList.remove('armed'); b.querySelector('span').textContent = T('btn_reset'); }, 2500);
            return;
        }
        clearTimeout(resetTimer); resetArmed = false;
        b.classList.remove('armed'); b.querySelector('span').textContent = T('btn_reset');
        post('reset');
    };

    // ── keyboard ────────────────────────────────────────────────────────
    document.addEventListener('keydown', (e) => {
        if ($('#root').classList.contains('hidden')) return;
        if (e.key === 'Escape') {
            if (!cp.classList.contains('hidden')) { closePicker(); return; }
            post('close'); close();
        }
    });

    // ════════════════════════════════════════════════════════════════════
    //  MESSAGE BUS (SA-MP CEF + NUI)
    // ════════════════════════════════════════════════════════════════════
    if (typeof cef !== 'undefined' && cef && typeof cef.on === 'function') {
        cef.on('rotwp.open', (cfgStr) => {
            open({ settings: Object.assign({}, DEFAULT_CFG, parseCfg(cfgStr)), defaults: DEFAULT_CFG });
        });
        cef.on('rotwp.sync', (cfgStr) => {
            state = Object.assign({}, DEFAULT_CFG, parseCfg(cfgStr));
            if (built) syncAll();
            dirty = false;
            markDirty();
        });
        cef.on('rotwp.close', () => close());
        cef.on('rotwp.demoState', (on) => {
            demoOn = (on === 1 || on === '1' || on === true);
            paintDemoBtn();
        });
        cef.on('rotwp.live', (speed, risk, active) => {
            updateLive({ speed: Number(speed) || 0, risk: String(risk || 'none'), active: !!Number(active) });
        });
        cef.on('rotwp.hud', (active, style, x, y, scale, accent, turn, bearing, destDist, remaining, eta, street) => {
            applyHud({
                active: !!Number(active),
                style: String(style || 'minibox'),
                x: Number(x),
                y: Number(y),
                scale: Number(scale) || 1,
                accent: String(accent || '#3aa0ff'),
                turn: String(turn || 'straight'),
                bearing: Number(bearing) || 0,
                destDist: Number(destDist) || 0,
                turnDist: Number(destDist) || 0,
                remaining: Number(remaining) || 0,
                eta: Number(eta) || 0,
                street: String(street || ''),
            });
        });
        if (typeof cef.emit === 'function') {
            cef.emit('rotwp.ready', '1');
        }
    }

    window.addEventListener('message', (ev) => {
        const d = ev.data || {};
        switch (d.action) {
            case 'open':  open(d); break;
            case 'close': close(); break;
            case 'sync':  state = Object.assign(state, d.settings || {}); syncAll(); dirty = false; markDirty(); break;
            case 'live':   updateLive(d); break;
            case 'hud':    applyHud(d); break;
            case 'marker': applyMarker(d); break;
            case 'demoState': demoOn = !!d.on; paintDemoBtn(); break;
        }
    });
})();
