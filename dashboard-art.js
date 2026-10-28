(function () {
  'use strict';
  // Decorative instrument scene. It makes no quantitative teaching claims.
  const point = (x,y) => `${x.toFixed(2)} ${y.toFixed(2)}`;
  const dialTicks = Array.from({length:25},(_,i) => {
    const angle = Math.PI + i * Math.PI / 24, major = i % 4 === 0;
    const inner = major ? 35 : 39;
    return `<path d="M${point(77+Math.cos(angle)*inner,52+Math.sin(angle)*inner)}L${point(77+Math.cos(angle)*43,52+Math.sin(angle)*43)}" stroke-width="${major?1.6:.7}"/>`;
  }).join('');
  const wave = Array.from({length:161},(_,i) => {
    const x = -42 + i * 1.25, y = 33 - Math.sin((x-14)*Math.PI/24)*11;
    return `${i?'L':'M'}${point(x,y)}`;
  }).join('');
  const screw = (x,y,r=2.7) => `<g transform="translate(${x} ${y})"><circle r="${r+1}" fill="#302d2a" opacity=".34"/><circle r="${r}" fill="url(#vdh-steel)" stroke="#998774" stroke-width=".5"/><path d="m-${r*.55} 0h${r*1.1}" stroke="#645a52" stroke-width=".8"/></g>`;
  function header() {
    return `<svg class="vv-dash-instrument vv-dash-workbench" viewBox="0 0 520 280" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="vdh-base" x1="80" y1="80" x2="380" y2="260" gradientUnits="userSpaceOnUse"><stop stop-color="#464a4d"/><stop offset=".5" stop-color="#28313a"/><stop offset="1" stop-color="#19232e"/></linearGradient>
        <linearGradient id="vdh-copper" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f2c58f"/><stop offset=".3" stop-color="#ce8b53"/><stop offset=".55" stop-color="#f3c998"/><stop offset="1" stop-color="#8c4e2e"/></linearGradient>
        <linearGradient id="vdh-body" x1="196" y1="87" x2="351" y2="211" gradientUnits="userSpaceOnUse"><stop stop-color="#eee6d7"/><stop offset=".45" stop-color="#d5cbb9"/><stop offset="1" stop-color="#b2a592"/></linearGradient>
        <linearGradient id="vdh-side" x1="351" y1="113" x2="396" y2="155" gradientUnits="userSpaceOnUse"><stop stop-color="#9b8d79"/><stop offset=".5" stop-color="#c4b69f"/><stop offset="1" stop-color="#7d705f"/></linearGradient>
        <linearGradient id="vdh-top" x1="236" y1="66" x2="340" y2="110" gradientUnits="userSpaceOnUse"><stop stop-color="#fff7e6"/><stop offset=".55" stop-color="#e5dac5"/><stop offset="1" stop-color="#c3b49d"/></linearGradient>
        <linearGradient id="vdh-steel" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff4db"/><stop offset=".4" stop-color="#a99c88"/><stop offset=".6" stop-color="#eee3d1"/><stop offset="1" stop-color="#807262"/></linearGradient>
        <linearGradient id="vdh-glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff" stop-opacity=".3"/><stop offset=".45" stop-color="#ffffff" stop-opacity=".02"/><stop offset=".7" stop-color="#ffffff" stop-opacity=".12"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
        <linearGradient id="vdh-screen" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#172a3c"/><stop offset="1" stop-color="#0c1726"/></linearGradient>
        <radialGradient id="vdh-light"><stop stop-color="#f2c895" stop-opacity=".16"/><stop offset="1" stop-color="#e7ab71" stop-opacity="0"/></radialGradient>
        <pattern id="vdh-screen-grid" width="12" height="11" patternUnits="userSpaceOnUse"><path d="M12 0H0v11" stroke="#8299b4" stroke-opacity=".2" stroke-width=".6"/></pattern>
        <clipPath id="vdh-screen-clip"><rect x="12" y="12" width="90" height="42" rx="2"/></clipPath>
        <clipPath id="vdh-dial-clip"><rect x="13" y="10" width="129" height="49" rx="5"/></clipPath>
        <filter id="vdh-desk-shadow" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="6"/></filter>
      </defs>
      <ellipse cx="278" cy="248" rx="190" ry="15" fill="#0b0705" opacity=".32" filter="url(#vdh-desk-shadow)"/>
      <ellipse cx="280" cy="166" rx="213" ry="101" fill="url(#vdh-light)"/>
      <g class="vdh-board">
        <path d="m42 158 182 89v12L42 170Z" fill="#101923" stroke="#796957" stroke-width=".5"/>
        <path d="m224 247 266-88v12l-266 88Z" fill="#18222d" stroke="#88735d" stroke-width=".5"/>
        <path d="m42 158 266-88 182 89-266 88Z" fill="url(#vdh-base)" stroke="#9d8c78" stroke-width="1.1"/>
        <path d="m54 158 254-84 169 84-254 84Z" stroke="#52616b" stroke-width=".65"/>
        <g stroke="#bc8151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m71 158 38-13 60 30 51-17 61 30 64-22"/>
          <path d="m84 169 40-13 61 30 48-16 62 30 60-21"/>
          <path d="m100 179 40-13 61 30 39-13 62 30 59-20"/>
          <path d="m174 213 47-15 48 23 73-24 22-33 55-18"/>
          <path d="m299 91 23 12 52-17m-1 29 58 28 23-8m-54 28 53-17"/>
        </g>
        <path class="vdh-current-trace" d="m71 158 38-13 60 30 51-17 61 30 64-22" stroke="#ffe2a8" stroke-width="2.5" stroke-linecap="round"/>
        <g fill="url(#vdh-copper)" stroke="#3d281a" stroke-width=".6">
          <ellipse cx="71" cy="158" rx="4.5" ry="2.6"/><ellipse cx="84" cy="169" rx="4.5" ry="2.6"/><ellipse cx="100" cy="179" rx="4.5" ry="2.6"/>
          <ellipse cx="174" cy="213" rx="4.5" ry="2.6"/><ellipse cx="345" cy="166" rx="4.5" ry="2.6"/><ellipse cx="361" cy="193" rx="4.5" ry="2.6"/><ellipse cx="419" cy="146" rx="4.5" ry="2.6"/>
        </g>
        <g stroke="#f8d7ab" stroke-width=".6" opacity=".65"><path d="m48 161 176 86m7-1 251-83"/></g>
        <g fill="#6c716f" stroke="#c8ba9f" stroke-width=".6"><ellipse cx="61" cy="158" rx="3.5" ry="2.1"/><ellipse cx="306" cy="80" rx="3.5" ry="2.1"/><ellipse cx="470" cy="159" rx="3.5" ry="2.1"/><ellipse cx="224" cy="235" rx="3.5" ry="2.1"/></g>
        <g fill="#0b131d"><path d="m74 174 18 9v6l-18-9Z"/><path d="m422 190 20-7v6l-20 7Z"/></g>
      </g>
      <g class="vdh-scope-case">
        <path d="m68 91 113-28.25 16 8-113 28.25Z" fill="#a7967e" stroke="#d3c2a6" stroke-width=".8"/>
        <path d="m181 62.75 16 8v84l-16-8Z" fill="#574e44" stroke="#8a7c66" stroke-width=".7"/>
        <g transform="matrix(1 -.25 0 1 68 91)">
          <rect width="113" height="84" rx="5" fill="#c3b59c" stroke="#eee0c4"/>
          <rect x="5" y="5" width="103" height="60" rx="4" fill="#756c5e"/>
          <rect x="9" y="9" width="95" height="48" rx="3" fill="url(#vdh-screen)" stroke="#d2b68b" stroke-width=".6"/>
          <g clip-path="url(#vdh-screen-clip)">
            <rect x="12" y="12" width="90" height="42" fill="url(#vdh-screen-grid)"/>
            <path d="M12 33h90M57 12v42" stroke="#b9c8d5" stroke-opacity=".33" stroke-width=".65"/>
            <path class="vdh-screen-wave vdh-screen-glow" d="${wave}" stroke="#8ac5e6" stroke-width="3.8" stroke-opacity=".16"/>
            <path class="vdh-screen-wave" d="${wave}" stroke="#b4d8ee" stroke-width="1.15"/>
            <rect class="vdh-screen-scan" x="12" y="12" width="8" height="42" fill="#c8e6f6" fill-opacity=".06"/>
          </g>
          <path d="M11 10h90v12L11 38Z" fill="url(#vdh-glass)"/>
          <g fill="#564d40" stroke="#f3e5ca" stroke-width=".5"><circle cx="19" cy="74" r="4.4"/><circle cx="38" cy="74" r="4.4"/><circle cx="58" cy="74" r="4.4"/></g>
          <g stroke="#ddd1bc" stroke-width="1.1"><path d="M19 71v3m19-3v3"/></g>
          <circle cx="58" cy="74" r="2" fill="#242b31"/>
          <rect x="80" y="71" width="18" height="5" rx="1.5" fill="#77705f"/>
          <circle class="vdh-power" cx="85" cy="73.5" r="1.3" fill="#ebbe76"/>
          ${screw(4,4,1.8)}${screw(109,80,1.8)}
        </g>
        <path d="m76 174 14 7 98-26v6l-98 26-14-7Z" fill="#17212b"/>
      </g>
      <path d="M126 150.5c-12 14-16 31 5 45.5 15 11 43 11 55 5" stroke="#141b21" stroke-width="6" stroke-linecap="round"/>
      <path d="M126 150.5c-12 14-16 31 5 45.5 15 11 43 11 55 5" stroke="#8e7c64" stroke-width="1" stroke-linecap="round"/>
      <g class="vdh-meter-case">
        <path d="m196 87 45-21 155 24-45 21Z" fill="url(#vdh-top)" stroke="#f5e8d2" stroke-width=".7"/>
        <path d="m351 111 45-21v100l-45 21Z" fill="url(#vdh-side)" stroke="#c5b59e" stroke-width=".7"/>
        <path d="m196 87 155 24v100l-155-24Z" fill="url(#vdh-body)" stroke="#f6ebd7" stroke-width=".8"/>
        <path d="m197 89 153 24m3 1 41-21" stroke="#fff8e9" stroke-width=".8" opacity=".8"/>
        <path d="m209 87 30-14 142 22" stroke="#a29680" stroke-width=".7"/>
        <g stroke="#645c4e" stroke-width="1.9" stroke-linecap="round"><path d="m361 130 26-13m-26 20 26-13m-26 20 26-13m-26 20 26-13m-26 20 26-13m-26 20 26-13"/></g>
        <g stroke="#e4d5bd" stroke-width=".6"><path d="m361 131 26-13m-26 20 26-13m-26 20 26-13m-26 20 26-13m-26 20 26-13m-26 20 26-13"/></g>
        <g transform="matrix(1 .155 0 1 196 87)">
          <rect x="11" y="8" width="133" height="54" rx="6" fill="#756d60" stroke="#fbf3df" stroke-width=".7"/>
          <rect x="14" y="11" width="127" height="48" rx="4" fill="#f8f1df" stroke="#483e32" stroke-width=".9"/>
          <g clip-path="url(#vdh-dial-clip)">
            <path d="M34 52a43 43 0 0 1 86 0" stroke="#d3c2a3" stroke-width=".7"/>
            <g stroke="#584f43">${dialTicks}</g>
            <path d="M39 52a38 38 0 0 1 76 0" stroke="#a77748" stroke-opacity=".4" stroke-width=".5"/>
            <path d="M111 28a43 43 0 0 1 8 14" stroke="#a65d3b" stroke-width="2.5"/>
            <g class="vdh-meter-needle"><path d="M77 52 96 23" stroke="#925636" stroke-width="1.5" stroke-linecap="round"/><path d="m77 52-4 6" stroke="#5d5042" stroke-width="1.3" stroke-linecap="round"/></g>
            <circle cx="77" cy="52" r="4.1" fill="url(#vdh-steel)" stroke="#74644f" stroke-width=".7"/>
            <path d="M15 12h125v8L15 47Z" fill="url(#vdh-glass)"/>
          </g>
          <g class="vdh-selector">
            <circle cx="40" cy="81" r="15" fill="#8e806b"/>
            <circle cx="40" cy="80" r="13.5" fill="#363937" stroke="#f3e2c0" stroke-width=".7"/>
            <circle cx="40" cy="80" r="10" fill="#454741" stroke="#68685a"/>
            <g stroke="#777767" stroke-width=".8"><path d="M28 78h3m0-6 2 2m5-6v3m6-2-1 3m7 2-3 1m5 5h-3m1 6-3-2m-5 8v-3m-7 2 1-3m-7-3 3-1"/></g>
            <path d="M40 80l5-8" stroke="#f2d49c" stroke-width="1.8" stroke-linecap="round"/>
            <circle cx="40" cy="80" r="2" fill="#252c2c"/>
          </g>
          <g fill="#5e5344" stroke="#e4d5ba" stroke-width=".6"><circle cx="102" cy="81" r="7"/><circle cx="126" cy="81" r="7"/></g>
          <circle cx="102" cy="81" r="4.5" fill="#9a553d" stroke="#cf967a" stroke-width=".7"/>
          <circle cx="126" cy="81" r="4.5" fill="#2f4e6b" stroke="#829aaf" stroke-width=".7"/>
          <circle cx="102" cy="81" r="1.8" fill="#35291e"/><circle cx="126" cy="81" r="1.8" fill="#19252f"/>
          ${screw(5,5,2.2)}${screw(150,5,2.2)}${screw(5,94,2.2)}${screw(150,94,2.2)}
          <g stroke="#b6a487" stroke-width=".6"><path d="M68 73h15M68 77h10M68 84h15M68 88h10"/></g>
        </g>
        <path d="m208 190 16 3v6l-16-3Zm119 19 15 2v6l-15-2Z" fill="#151c22"/>
        <path d="m366 207 16-8v6l-16 8Z" fill="#172029"/>
      </g>
      <g class="vdh-leads" stroke-linecap="round">
        <path d="M298 184c1 30 18 37 52 29 33-8 51-5 53 4 2 12-24 24-54 19" stroke="#131a22" stroke-width="5"/>
        <path d="M298 184c1 30 18 37 52 29 33-8 51-5 53 4 2 12-24 24-54 19" stroke="#b3734b" stroke-width="2.5"/>
        <path d="M322 188c15 30 65 13 84 8 22-6 45-5 45 5 0 9-16 16-27 17" stroke="#18202a" stroke-width="5"/>
        <path d="M322 188c15 30 65 13 84 8 22-6 45-5 45 5 0 9-16 16-27 17" stroke="#59789a" stroke-width="2.5"/>
        <path d="m345 235-11-2" stroke="#e7ccb2" stroke-width="2"/><path d="m424 218-9 3" stroke="#cad2d4" stroke-width="2"/>
        <path d="m344 235 7 1m69-17 7-2" stroke="#302b27" stroke-width="5"/>
      </g>
      <g transform="translate(237 229) rotate(-18)">
        <rect x="0" y="0" width="42" height="7" rx="3.5" fill="#18232f"/>
        <rect x="3" y="0" width="23" height="6" rx="2.5" fill="#b98757" stroke="#eac39a" stroke-width=".6"/>
        <path d="M28 3h25" stroke="#d2c7b5" stroke-width="1.5"/>
        <g stroke="#795332" stroke-width=".6"><path d="M8 1v4m4-4v4m4-4v4m4-4v4"/></g>
      </g>
    </svg>`;
  }
  window.VV_DASH_ART = Object.freeze({header});
})();
