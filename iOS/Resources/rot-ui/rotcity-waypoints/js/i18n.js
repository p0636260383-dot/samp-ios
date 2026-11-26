/* ════════════════════════════════════════════════════════════════════════
   ROTCITY-WAYPOINTS • i18n.js (Thai + English fallback)
   ════════════════════════════════════════════════════════════════════════ */
window.I18n = (function () {
    const LOCALES = {
        th: {
            lbl_waypoint: 'จุดหมาย',
            unit_m: 'ม.',
            unit_km: 'กม.',

            ui_title: 'Waypoint Studio',
            ui_sub: 'ปรับแต่งระบบนำทาง GPS — พรีวิวการเปลี่ยนแปลงแบบเรียลไทม์',
            btn_save: 'บันทึก',
            btn_reset: 'รีเซ็ต',
            btn_close: 'ปิด',
            btn_demo: 'ทดสอบเส้นทาง',
            btn_demo_off: 'หยุดทดสอบ',
            ui_saved_tag: 'บันทึกแล้ว',
            ui_unsaved: 'ยังไม่ได้บันทึก',

            tab_route: 'เส้นทาง',
            tab_marker: 'จุดหมาย 3D',
            tab_hud: 'HUD นำทาง',
            tab_turns: 'เตือนโค้ง',
            tab_behaviour: 'พฤติกรรม',
            tab_perf: 'ประสิทธิภาพ',
            tab_theme: 'ธีมหน้าต่าง',

            live_speed: 'ความเร็ว',
            live_corner: 'แจ้งเตือน',
            live_state: 'สถานะ GPS',
            live_none: 'ไม่มีหมุด',
            live_active: 'กำลังนำทาง',

            grp_route_style: 'รูปแบบเส้นทาง (พรีวิว)',
            grp_route_main: 'การนำทาง',
            grp_route_shape: 'รูปทรงและการแสดงผล',
            set_showRoute: 'เปิดใช้งานระบบนำทาง',
            set_routeStyle: 'สไตล์เส้นทาง',
            opt_chevron: 'ลูกศรเดี่ยว',
            opt_chevron3d: 'ลูกศร 3D',
            opt_arrow: 'หัวลูกศร',
            opt_double: 'ลูกศรคู่',
            opt_dash: 'เส้นประ',
            opt_ribbon: 'แถบยาว',
            opt_dot: 'จุดไข่ปลา',
            opt_pulse: 'เรืองแสง',
            opt_diamond: 'เพชร',
            opt_blade: 'ใบมีด',
            opt_spike: 'หนามแหลม',
            set_routeColor: 'สีหลัก',
            grp_route_presets: 'ชุดสำเร็จรูป',
            set_routePreset: 'เลือกสไตล์ด่วน',
            set_chevronSpacing: 'ระยะห่าง',
            set_chevronScale: 'ขนาด',
            set_chevronLift: 'ความสูงจากพื้น',
            set_chevronHeight: 'ความหนา 3D',
            set_routeWidth: 'ความกว้าง',
            set_baseOpacity: 'ความโปร่งใส',
            set_drawDistance: 'ระยะมองเห็น',
            set_flowAnim: 'แอนิเมชันไหลไปข้างหน้า',
            set_fadeEnds: 'ไล่จางปลายเส้น',

            grp_marker_style: 'รูปแบบเสาหมุด 3D',
            grp_marker: 'เครื่องหมายจุดหมายปลายทาง',
            set_show3D: 'แสดงเสา/หมุด 3D ที่ปลายทาง',
            set_markerStyle: 'สไตล์เสาหมุด',
            opt_beam: 'ลำแสง',
            opt_pillar: 'เสาหลัก',
            opt_pin: 'พินปักหมุด',
            set_markerColor: 'สีหมุด',
            set_markerAccent: 'สีเส้นคั่น',
            set_beamHeight: 'ความสูงเสา',
            set_showDistance: 'แสดงระยะทางบนหมุด',
            set_markerLabel: 'ข้อความบนหมุด',

            grp_hud_style: 'สไตล์ HUD นำทาง',
            grp_hud: 'หน้าต่างบอกทิศทาง (Turn-by-Turn)',
            set_hudEnabled: 'แสดง HUD นำทางบนจอ',
            set_hudStyle: 'สไตล์ HUD',
            set_hudPosition: 'ตำแหน่งบนจอ',
            set_hudAccent: 'สีเน้น HUD',
            set_hudScale: 'ขนาด HUD',
            set_hudShowStreet: 'แสดงชื่อโซน/พื้นที่',
            set_hudShowEta: 'แสดงเวลาถึงโดยประมาณ (ETA)',
            hud_drag_hint: 'ลากกรอบ HUD บนหน้าจอเพื่อย้ายตำแหน่งได้อิสระ',
            opt_compass: 'เข็มทิศ',
            opt_arrow3d: 'ลูกศร 3D',
            opt_neon: 'นีออน',
            opt_chevrons: 'เชฟรอน',
            opt_minibox: 'มินิบ็อกซ์',
            opt_glass: 'กระจกใส',
            opt_modern: 'โมเดิร์น',
            opt_sharp: 'คมเข้ม',
            opt_strip: 'แถบบน',
            opt_line: 'เส้นบาง',
            pos_tl: 'บนซ้าย',
            pos_tr: 'บนขวา',
            pos_bl: 'ล่างซ้าย',
            pos_br: 'ล่างขวา',
            hud_min: 'นาที',
            hud_arrive: 'ถึงจุดหมาย',

            grp_turns: 'เตือนความเร็วเข้าโค้ง',
            grp_turns_colors: 'สีระดับความเสี่ยง',
            turns_hint: 'HUD จะเปลี่ยนสีเตือนเมื่อคุณขับเร็วเกินไปเทียบกับมุมเลี้ยวเข้าหาจุดหมาย',
            set_turnRisk: 'เปิดเตือนความเร็วเข้าโค้ง',
            set_riskOnFoot: 'เตือนตอนเดินเท้าด้วย',
            set_gripAuto: 'คำนวณอัตโนมัติตามรถ',
            set_gripManual: 'แรงยึดเกาะกำหนดเอง',
            set_safetyMargin: 'ระยะเผื่อความปลอดภัย',
            set_riskSafe: 'ปลอดภัย',
            set_riskCaution: 'ระวัง',
            set_riskWarning: 'เบรก',
            set_riskDanger: 'เร็วเกินไป',

            grp_behaviour: 'พฤติกรรมระบบ',
            set_onlyInVehicle: 'แสดงเฉพาะตอนอยู่บนรถ',
            set_hideGameRoute: 'ซ่อนเส้นแผนที่เดิม',
            set_autoStart: 'เปิดนำทางทันทีเมื่อปักหมุด',

            grp_perf: 'ประสิทธิภาพ',
            set_perfMode: 'โหมดประสิทธิภาพ',
            opt_quality: 'คุณภาพสูง',
            opt_balanced: 'สมดุล',
            opt_performance: 'ประหยัดสเปค',
            perf_hint: 'โหมดประหยัดสเปคเหมาะสำหรับคอม/มือถือสเปคเริ่มต้น ระบบนำทางยังทำงานครบถ้วน',

            grp_theme: 'ธีมหน้าต่างตั้งค่า',
            set_uiAccent: 'สีหลักของหน้าต่าง',
            theme_hint: 'เปลี่ยนเฉพาะสีของหน้าต่าง Waypoint Studio ไม่กระทบสี HUD หรือหมุดในเกม',

            u_m: 'ม.',
            u_pct: '%',
            u_g: 'g',
            u_x: '×',
        },
        en: {
            lbl_waypoint: 'WAYPOINT', unit_m: 'M', unit_km: 'KM',
            ui_title: 'Waypoint Studio', ui_sub: 'Customize your GPS — every change previews live',
            btn_save: 'Save', btn_reset: 'Reset', btn_close: 'Close',
            btn_demo: 'Demo route', btn_demo_off: 'Stop demo',
            ui_saved_tag: 'Saved', ui_unsaved: 'Unsaved changes',
            hud_min: 'min', hud_arrive: 'Arrive',
        }
    };

    let table = LOCALES.th;

    function setLocale(t) {
        if (typeof t === 'string') {
            table = LOCALES[t] || LOCALES.th;
        } else if (t && typeof t === 'object') {
            table = Object.assign({}, LOCALES.th, t);
        }
    }

    function format(str, args) {
        if (!args || !args.length) return str;
        let i = 0;
        return String(str).replace(/%s/g, () => (args[i] !== undefined ? args[i++] : ''));
    }

    function t(key, ...args) {
        const v = table[key] !== undefined ? table[key] : LOCALES.en[key];
        if (v === undefined || v === null) return key;
        return format(v, args);
    }

    return { setLocale, t };
})();
