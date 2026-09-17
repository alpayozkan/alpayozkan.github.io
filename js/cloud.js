/* Hero background: a synthetic scene being rescanned as a point cloud.
   Points are revealed by a sweeping scan plane; each point starts
   "uncertain" (accent, jittery, large) and settles into a confident
   dot (ink, still, small). When the sweep finishes, the map is
   discarded and the scan starts again from the other side.           */
(function () {
  var canvas = document.getElementById('cloud');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- build the scene (world units, y is up) ----------
  var pts = [];
  function rnd(a, b) { return a + Math.random() * (b - a); }
  // ground grid
  for (var gx = -6; gx <= 6; gx += 0.55) for (var gz = -6; gz <= 6; gz += 0.55)
    pts.push({ x: gx + rnd(-.08, .08), y: 0, z: gz + rnd(-.08, .08), w: 0.55 });
  // blocks: [cx, cz, sx, sz, h]
  var blocks = [[-3.2, -1.5, 1.6, 1.4, 2.4], [-0.4, 1.8, 1.2, 1.2, 1.5], [2.6, -2.4, 2.2, 1.4, 1.1],
                [2.2, 1.6, 1.0, 1.0, 3.2], [-2.6, 2.9, 1.0, 1.4, 0.9], [0.6, -3.3, 1.2, 1.0, 1.9]];
  blocks.forEach(function (b) {
    var cx = b[0], cz = b[1], sx = b[2], sz = b[3], h = b[4], d = 0.32;
    for (var y = d / 2; y < h; y += d) {
      for (var t = -sx / 2; t <= sx / 2; t += d) {
        pts.push({ x: cx + t, y: y, z: cz - sz / 2, w: 1 });
        pts.push({ x: cx + t, y: y, z: cz + sz / 2, w: 1 });
      }
      for (var u = -sz / 2 + d; u < sz / 2; u += d) {
        pts.push({ x: cx - sx / 2, y: y, z: cz + u, w: 1 });
        pts.push({ x: cx + sx / 2, y: y, z: cz + u, w: 1 });
      }
    }
    for (var rx = -sx / 2; rx <= sx / 2; rx += d) for (var rz = -sz / 2; rz <= sz / 2; rz += d)
      pts.push({ x: cx + rx, y: h, z: cz + rz, w: 1 });
  });
  // a few "tree" spheres for softness
  [[4.6, 3.6], [-4.8, -4.2], [-1.2, -1.2]].forEach(function (c) {
    for (var i = 0; i < 70; i++) {
      var th = rnd(0, Math.PI * 2), ph = Math.acos(rnd(-1, 1)), r = 0.7;
      pts.push({ x: c[0] + r * Math.sin(ph) * Math.cos(th), y: 1.2 + r * Math.cos(ph), z: c[1] + r * Math.sin(ph) * Math.sin(th), w: 0.85 });
    }
  });
  // per-point scan metadata
  pts.forEach(function (p) { p.seen = -1; p.jx = rnd(-1, 1); p.jy = rnd(-1, 1); p.seed = Math.random(); });

  // ---------- camera ----------
  var W, H, dpr, cam = { yaw: 0.7, pitch: 0.78, dist: 18, fov: 520 };
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cam.fov = Math.max(380, Math.min(W * 0.55, 900));
  }
  resize(); window.addEventListener('resize', resize);

  function project(p, yaw, pitch) {
    var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    var x = p.x * cy - p.z * sy, z = p.x * sy + p.z * cy;
    var y = p.y * cp - z * sp; z = p.y * sp + z * cp + cam.dist;
    var s = cam.fov / z;
    // scene spans the hero; the CSS mask keeps it quiet behind the text
    return { sx: W * 0.6 + x * s, sy: H * 0.74 + (-(y - 0.6)) * s, s: s, z: z };
  }

  // ---------- colours from CSS variables ----------
  var cs = getComputedStyle(document.documentElement);
  var dot = cs.getPropertyValue('--cloud-dot').trim() || '28,27,25';
  var acc = cs.getPropertyValue('--cloud-acc').trim() || '200,80,30';
  new MutationObserver(function () {
    cs = getComputedStyle(document.documentElement);
    dot = cs.getPropertyValue('--cloud-dot').trim(); acc = cs.getPropertyValue('--cloud-acc').trim();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // ---------- scan state ----------
  var t0 = performance.now(), sweepDur = 9000, holdDur = 2600, fadeDur = 900, dir = 1, cycleStart = t0;
  var SCAN_MIN = -7, SCAN_MAX = 7;
  // ?cloud=0.7 -> jump straight to 70% of a sweep (handy for screenshots)
  var dbg = /[?&]cloud=([\d.]+)/.exec(location.search);
  if (dbg) {
    var f = parseFloat(dbg[1]); cycleStart = t0 - sweepDur * f;
    var sx0 = SCAN_MIN + (SCAN_MAX - SCAN_MIN) * f;
    pts.forEach(function (p) { if (p.x <= sx0) p.seen = t0 - ((sx0 - p.x) / (SCAN_MAX - SCAN_MIN)) * sweepDur; });
  }

  function frame(now) {
    var el = now - cycleStart;
    var total = sweepDur + holdDur + fadeDur;
    if (el > total) { cycleStart = now; el = 0; dir = -dir; pts.forEach(function (p) { p.seen = -1; }); }
    var phase = el < sweepDur ? 'sweep' : el < sweepDur + holdDur ? 'hold' : 'fade';
    var prog = Math.min(el / sweepDur, 1);
    var scanX = dir > 0 ? SCAN_MIN + (SCAN_MAX - SCAN_MIN) * prog : SCAN_MAX - (SCAN_MAX - SCAN_MIN) * prog;
    var globalAlpha = phase === 'fade' ? 1 - (el - sweepDur - holdDur) / fadeDur : 1;
    var yaw = cam.yaw + (reduce ? 0 : (now - t0) * 0.00004);

    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = globalAlpha;

    // scan plane: a faint vertical line in world space at x = scanX, drawn as a thin band
    if (phase === 'sweep') {
      var a = project({ x: scanX, y: 0, z: SCAN_MIN }, yaw, cam.pitch);
      var b = project({ x: scanX, y: 0, z: SCAN_MAX }, yaw, cam.pitch);
      var c = project({ x: scanX, y: 2.4, z: SCAN_MAX }, yaw, cam.pitch);
      var d2 = project({ x: scanX, y: 2.4, z: SCAN_MIN }, yaw, cam.pitch);
      ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.lineTo(c.sx, c.sy); ctx.lineTo(d2.sx, d2.sy); ctx.closePath();
      ctx.fillStyle = 'rgba(' + acc + ',0.03)'; ctx.fill();
      ctx.strokeStyle = 'rgba(' + acc + ',0.14)'; ctx.lineWidth = 1; ctx.stroke();
    }

    // points
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      var behind = dir > 0 ? p.x <= scanX : p.x >= scanX;
      if (p.seen < 0 && behind && phase === 'sweep') p.seen = now;
      if (p.seen < 0) continue;
      var age = (now - p.seen) / 1000;          // seconds since observed
      var conf = Math.min(age / 1.5, 1);         // confidence saturates after ~1.5 s
      conf = conf * conf * (3 - 2 * conf);       // smoothstep
      var q = project(p, yaw, cam.pitch);
      if (q.z < 1) continue;
      // uncertain points jitter and are drawn larger; confident points settle
      var jit = (1 - conf) * 6 * (reduce ? 0 : 1);
      var x = q.sx + p.jx * jit * Math.sin(now * 0.004 + p.seed * 20);
      var y = q.sy + p.jy * jit * Math.cos(now * 0.0035 + p.seed * 20);
      var depthFade = Math.max(0.25, Math.min(1, (26 - q.z) / 16));
      var r = (1.3 + (1 - conf) * 1.6) * Math.min(q.s / 40, 1.6) * p.w;
      var alpha = (0.28 + 0.5 * conf) * depthFade * (p.w < 1 ? 0.55 : 1);
      // colour: accent while uncertain, ink once confident
      ctx.fillStyle = 'rgba(' + (conf < 0.85 ? acc : dot) + ',' + alpha.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
    }

    ctx.globalAlpha = 1;
    if (!reduce || phase === 'sweep') requestAnimationFrame(frame);
    else setTimeout(function () { requestAnimationFrame(frame); }, 400);
  }
  requestAnimationFrame(frame);
})();
