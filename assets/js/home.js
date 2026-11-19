(function () {
  var list = document.getElementById("list");
  var items = window.EXPERIMENTS || [];
  var pad = function (n) { return String(n).padStart(2, "0"); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); };

  items.forEach(function (e, i) {
    var a = document.createElement("a");
    a.className = "item";
    a.href = "experiments/" + e.slug + "/";
    a.innerHTML =
      '<span class="num">' + pad(items.length - i) + '</span>' +
      '<span class="body"><h2>' + esc(e.title) + '</h2><p>' + esc(e.blurb) + '</p>' +
      '<span class="tags">' + e.tags.map(function (t) { return '<i>' + esc(t) + '</i>'; }).join("") + '</span></span>' +
      '<span class="side"><span>' + esc(e.meta) + '</span><b aria-hidden="true">→</b></span>';
    list.appendChild(a);
  });

  var next = document.createElement("div");
  next.className = "item next";
  next.innerHTML = '<span class="num">' + pad(items.length + 1) + '</span><span class="body"><h2>???</h2><p>Still training. Loss is going down, slowly, with a lot of complaining.</p></span><span class="side"><span>coming eventually</span></span>';
  list.appendChild(next);

  // Decorative loss curve that learns forever.
  var cv = document.getElementById("loss"), ctx = cv.getContext("2d");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var N = 160, pts, k;
  function make() { pts = []; for (var i = 0; i < N; i++) pts.push(0.08 + 0.92 * Math.exp(-i / 34) + (Math.random() - 0.5) * 0.14 * Math.exp(-i / 90) + (i > 60 && Math.random() < 0.03 ? 0.12 : 0)); k = 0; }
  function draw() {
    var w = cv.clientWidth, h = cv.clientHeight, d = devicePixelRatio || 1;
    if (cv.width !== w * d) { cv.width = w * d; cv.height = h * d; }
    ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(141,144,154,.25)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(.5, 0); ctx.lineTo(.5, h - .5); ctx.lineTo(w, h - .5); ctx.stroke();
    ctx.strokeStyle = "#ffc233"; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.beginPath();
    for (var i = 0; i < k; i++) { var x = 4 + i / (N - 1) * (w - 8), y = 6 + Math.min(1, pts[i]) * (h - 14); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
  }
  make();
  if (reduce) { k = N; draw(); addEventListener("resize", draw); return; }
  var hold = 0;
  (function tick() { if (k < N) k += 1; else if (++hold > 150) { hold = 0; make(); } draw(); requestAnimationFrame(tick); })();
})();
