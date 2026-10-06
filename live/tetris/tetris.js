/* Tetris (CSE423 group project), ported from grp13.py to a browser canvas.
   github.com/IKARUSOps/CSE423-Lab-Project-Tetris

   The original draws everything with GL_POINTS using its own midpoint line and
   midpoint circle algorithms on a 768x1024 window (glOrtho -384..384, -512..512).
   This port keeps those algorithms, the coordinates, colours, shapes and game
   rules as written, including their quirks (for example, a key press also
   redraws a frame, so the piece drops a row, as glutPostRedisplay did).
   Only the timing is approximated: the Python version's speed came from
   time.sleep() calls inside each box draw plus PyOpenGL overhead. */
(function () {
  'use strict';

  var W = 768, H = 1024;
  var canvas = document.getElementById('game');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr; canvas.height = H * dpr;
  var ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // --- GL state emulation -------------------------------------------------
  var color = 'rgb(255,255,0)';
  function glColor3f(r, g, b) { color = 'rgb(' + Math.round(r * 255) + ',' + Math.round(g * 255) + ',' + Math.round(b * 255) + ')'; }
  var proj = 'base'; // 'base' = glOrtho(-384,384,-512,512); 'overlay' = glOrtho(-320,320,-240,240)
  function px(x) { return proj === 'base' ? x + 384 : (x + 320) * (W / 640); }
  function py(y) { return proj === 'base' ? 512 - y : (240 - y) * (H / 480); }
  function draw_points(x, y, z, c) {
    z = z || 1;
    (c || ctx).fillStyle = color;
    (c || ctx).fillRect(px(x) - z / 2, py(y) - z / 2, z, z);
  }
  function display_text(x, y, text) {
    ctx.fillStyle = color;
    ctx.font = '24px "Times New Roman", Times, serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, px(x), py(y));
  }
  function randint(a, b) { return a + Math.floor(Math.random() * (b - a)); } // np.random.randint: [a, b)
  function uniform(a, b) { return a + Math.random() * (b - a); }
  function pyMod(a, n) { return ((a % n) + n) % n; }
  function floorDiv(a, b) { return Math.floor(a / b); }

  // --- drawing (grp13.py) ---------------------------------------------------
  function midpoint_line_8_way(x0, y0, x1, y1) {
    var points = [];
    var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    var sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    var d, x, y;
    if (dx > dy) {
      d = 2 * dy - dx; var dE = 2 * dy, dNE = 2 * (dy - dx);
      x = x0; y = y0; points.push([x, y]);
      while (x < x1) { x += 1; if (d < 0) d += dE; else { y += sy; d += dNE; } points.push([x, y]); }
    } else {
      d = 2 * dx - dy; var dN = 2 * dx, dNE2 = 2 * (dx - dy);
      x = x0; y = y0; points.push([x, y]);
      while (y < y1) { y += 1; if (d < 0) d += dN; else { x += sx; d += dNE2; } points.push([x, y]); }
    }
    return points;
  }
  function draw_lines(a, b, c) {
    var pts = midpoint_line_8_way(a[0], a[1], b[0], b[1]);
    for (var i = 0; i < pts.length; i++) draw_points(pts[i][0], pts[i][1], 3, c);
  }

  // Brick outlines never change, so they're drawn once to an offscreen layer;
  // the random texture dots inside each brick are redrawn every frame, as in the original.
  var brickLayer = document.createElement('canvas');
  brickLayer.width = W * dpr; brickLayer.height = H * dpr;
  var bctx = brickLayer.getContext('2d'); bctx.scale(dpr, dpr);
  var textureCentres = [];
  function draw_bricks(x_start, y_start, y_end, direction, row_offset) {
    if (direction === undefined) direction = true;
    row_offset = row_offset || 15;
    var y, x;
    function range(a, b, step) { var r = []; if (step > 0) for (var i = a; i < b; i += step) r.push(i); else for (var j = a; j > b; j += step) r.push(j); return r; }
    if (direction) {
      range(y_start, y_end, 30).forEach(function (y) {
        range(x_start, x_start + 90, 30).forEach(function (x) {
          draw_lines([x - 15, y], [x + 15, y], bctx); draw_lines([x - 15, y + 15], [x + 15, y + 15], bctx);
          draw_lines([x - 15, y], [x - 15, y + 15], bctx); draw_lines([x + 15, y], [x + 15, y + 15], bctx);
          textureCentres.push([x, y]);
        });
        range(x_start + row_offset, x_start + 90 + row_offset, 30).forEach(function (x) {
          draw_lines([x - 15, y + 15], [x + 15, y + 15], bctx); draw_lines([x - 15, y + 30], [x + 15, y + 30], bctx);
          draw_lines([x - 15, y + 15], [x - 15, y + 30], bctx); draw_lines([x + 15, y + 15], [x + 15, y + 30], bctx);
          textureCentres.push([x, y + 15]);
        });
      });
    } else {
      range(y_start, y_end, 30).forEach(function (y) {
        range(x_start, x_start - 90, -30).forEach(function (x) {
          draw_lines([x + 15, y], [x - 15, y], bctx); draw_lines([x + 15, y + 15], [x - 15, y + 15], bctx);
          draw_lines([x + 15, y], [x + 15, y + 15], bctx); draw_lines([x - 15, y], [x - 15, y + 15], bctx);
          textureCentres.push([x, y]);
        });
        range(x_start + row_offset, x_start - 90 - row_offset, -30).forEach(function (x) {
          draw_lines([x - 15, y + 15], [x + 15, y + 15], bctx); draw_lines([x - 15, y + 30], [x + 15, y + 30], bctx);
          draw_lines([x - 15, y + 15], [x - 15, y + 30], bctx); draw_lines([x + 15, y + 15], [x + 15, y + 30], bctx);
          textureCentres.push([x, y + 15]);
        });
      });
    }
  }
  function build_template() {
    glColor3f(1, 1, 0);
    draw_bricks(-369, -480, 301, false);
    draw_bricks(359, -480, 301);
    [-450, -90, -180, -270, -360, 0, 90, 180, 270, 360].forEach(function (x) { draw_bricks(x, -512, -497); });
    [-450, -90, -180, -270, -360, 0, 90, 180, 270, 360].forEach(function (x) { draw_bricks(x, 497, 512); });
    [90, 180, 270, 360, -360, -180, -270, -450].forEach(function (x) { draw_bricks(x, 331, 361); });
  }
  function draw_template() {
    ctx.drawImage(brickLayer, 0, 0, W, H);
    // draw_random_texture() for every brick
    for (var i = 0; i < textureCentres.length; i++) {
      var c = textureCentres[i], n = randint(5, 11);
      for (var k = 0; k < n; k++) draw_points(c[0] + randint(-14, 15), c[1] + randint(0, 15), 1);
    }
  }

  function midpoint_circle(radius, xc, yc) {
    var x = 0, y = radius, d = 1 - radius, pts = [];
    function plot(x, y) { pts.push([xc + x, yc + y], [xc - x, yc + y], [xc + x, yc - y], [xc - x, yc - y], [xc + y, yc + x], [xc - y, yc + x], [xc + y, yc - x], [xc - y, yc - x]); }
    plot(x, y);
    while (x < y) { x += 1; if (d < 0) d += 2 * x + 1; else { y -= 1; d += 2 * (x - y) + 1; } plot(x, y); }
    return pts;
  }
  // box() = draw_circle(): midpoint circle (radius 13) + square outline (radius 15), always the same,
  // so it's rendered once as a sprite and stamped.
  var boxSprite = document.createElement('canvas');
  (function () {
    var S = 40; boxSprite.width = S * dpr; boxSprite.height = S * dpr;
    var sctx = boxSprite.getContext('2d'); sctx.scale(dpr, dpr);
    var savedProj = proj; proj = 'sprite';
    var oldPx = px, oldPy = py;
    px = function (x) { return x + S / 2; }; py = function (y) { return S / 2 - y; };
    glColor3f(176 / 255, 190 / 255, 197 / 255);
    midpoint_circle(15 - 2, 0, 0).forEach(function (p) { draw_points(p[0], p[1], 3, sctx); });
    var r = 15;
    draw_lines([-r, -r], [-r, r], sctx); draw_lines([r, -r], [r, r], sctx);
    draw_lines([-r, -r], [r, -r], sctx); draw_lines([-r, r], [r, r], sctx);
    px = oldPx; py = oldPy; proj = savedProj;
  })();
  var boxesThisFrame = 0;
  function box(x, y) {
    ctx.drawImage(boxSprite, px(x) - 20, py(y) - 20, 40, 40);
    glColor3f(176 / 255, 190 / 255, 197 / 255);
    boxesThisFrame++;
  }

  // --- game state (globals in grp13.py) --------------------------------------
  var score = 0, state = true, paused = false, desired_fps = 75, reset = false, level = 1;
  var splashes = [], extraDelay = 0;

  function splash(xc, yc) {
    var n = randint(5, 15);
    for (var i = 0; i < n; i++) {
      var a = uniform(0, 2 * Math.PI), dist = uniform(5, 20), size = uniform(1, 3), shade = uniform(0.8, 1.0);
      glColor3f(shade, shade, shade);
      draw_points(xc + dist * Math.cos(a), yc + dist * Math.sin(a), size);
    }
  }

  function draw_controls() {
    display_text(-300, 400, 'Your Score: ' + score);
    display_text(200, 400, 'Your Level: ' + level);
    glColor3f(94 / 255, 119 / 255, 138 / 255);
    var y = 480, x = -300, x1 = -300 + 20;
    draw_lines([x, y - 10], [x1, y]); draw_lines([x1, y - 20], [x1, y]); draw_lines([x, y - 10], [x1, y - 20]);
    glColor3f(0, 1, 0);
    draw_lines([-5, y - 20], [-5, y]); draw_lines([5, y - 20], [5, y]);
    glColor3f(1, 0, 0);
    draw_lines([-x, y - 20], [-x1, y]); draw_lines([-x1, y - 20], [-x, y]);
    if (score > -1 && score < 10) level = 1;
    else if (score > 9 && score < 20) level = 2;
    else if (score > 19 && score < 30) level = 3;
    else if (score > 29 && score < 40) level = 4;
    else if (score > 39 && score < 50) level = 5;
    else if (score > 49 && score < 60) level = 6;
    else if (score > 59 && score < 70) level = 7;
  }

  function splash_screen() {
    proj = 'overlay';
    glColor3f(1, 1, 1);
    display_text(-100, 150, 'TETRIS');
    display_text(-200, 100, 'PAUSED');
    display_text(-200, 50, 'Your Score: ' + score);
    display_text(-200, 0, 'Game will present more difficult shapes upon progression');
    display_text(-200, -50, "Use 'A' and 'D' to move the tetromino");
    display_text(-200, -100, "Use 'W' to rotate the tetromino");
    display_text(-200, -150, "Use 'S' to drop the tetromino");
    draw_controls();          // drawn in the overlay projection, so it lands off-screen, as in the original
    proj = 'base';
  }

  function show_game_over_screen() {
    state = false;
    proj = 'overlay';
    glColor3f(1, 1, 1);
    display_text(-100, 50, 'GAME OVER');
    display_text(-100, -50, 'Your Score: ' + score);
    proj = 'base';
  }

  function collision(matrix, tetromino) {
    for (var i = 0; i < tetromino.length; i++) {
      var r = floorDiv(tetromino[i][1] + 465, 32), c = floorDiv(tetromino[i][0] + 318, 32);
      if (r >= matrix.length) return true;              // Python would raise IndexError here
      if (r < 0) r += matrix.length;
      if (c < 0) c += 21;
      if (matrix[r][c] !== null) return true;
    }
    return false;
  }

  var SHAPES = {
    I: [[2, 399], [2, 367], [2, 335], [2, 303]],
    L: [[2, 399], [2, 367], [2, 335], [34, 335]],
    T: [[-30, 335], [2, 367], [2, 335], [34, 335]],
    O: [[-30, 367], [2, 367], [-30, 335], [2, 335]],
    S: [[2, 335], [34, 335], [34, 367], [66, 367]],
    Z: [[2, 367], [34, 367], [34, 335], [66, 335]]
  };
  function Tetromino() {
    var set;
    if (score > -1 && score < 100) set = ['I', 'L', 'O'];
    else if (score > 99 && score < 200) set = ['I', 'L', 'T', 'O'];
    else if (score > 199 && score < 300) set = ['I', 'L', 'T', 'O', 'S'];
    else set = ['I', 'L', 'T', 'O', 'S', 'Z'];
    this.tetromino = SHAPES[set[randint(0, set.length)]].map(function (p) { return p.slice(); });
  }
  Tetromino.prototype.draw = function () { this.tetromino.forEach(function (i) { box(i[0], i[1]); }); };
  Tetromino.prototype.descend = function () { this.tetromino.forEach(function (i) { i[1] -= 32; }); };
  Tetromino.prototype.translate = function (key, matrix) {
    var temp;
    if (key === 'a') {
      if (this.tetromino.some(function (i) { return i[0] <= -318; })) return;
      temp = this.tetromino.map(function (i) { return [i[0] - 32, i[1]]; });
      if (!collision(matrix, temp)) this.tetromino = temp;
    } else if (key === 'd') {
      if (this.tetromino.some(function (i) { return i[0] >= 322; })) return;
      temp = this.tetromino.map(function (i) { return [i[0] + 32, i[1]]; });
      if (!collision(game.matrix, temp)) this.tetromino = temp;
    }
  };
  Tetromino.prototype.rotate = function () {
    var center = this.tetromino[2];
    // translated . rotation_matrix.T with rotation_matrix = [[0,-1],[1,0]]
    var temp = this.tetromino.map(function (p) { var dx = p[0] - center[0], dy = p[1] - center[1]; return [-dy + center[0], dx + center[1]]; });
    for (var k = 0; k < temp.length; k++) { var i = temp[k]; if (322 <= i[0] || i[0] <= -318 || i[1] <= -465) return; }
    if (!collision(game.matrix, temp)) this.tetromino = temp;
  };
  Tetromino.prototype.fall = function (horizon) {
    var d = Math.min.apply(null, this.tetromino.map(function (i) { return i[1] - horizon[pyMod(floorDiv(i[0], 32), 43)]; }));
    this.tetromino.forEach(function (i) { i[1] -= d; });
  };

  function emptyMatrix() { var m = []; for (var r = 0; r < 28; r++) { var row = []; for (var c = 0; c < 21; c++) row.push(null); m.push(row); } return m; }
  function Tetris() { this.matrix = emptyMatrix(); this.horizon = new Array(43).fill(-465); this.state = true; }
  Tetris.prototype.draw = function () { this.matrix.forEach(function (row) { row.forEach(function (j) { if (j) box(j[0], j[1]); }); }); };
  Tetris.prototype.check = function () {
    var self = this;
    this.tetro.tetromino.forEach(function (i) { if (self.horizon[pyMod(floorDiv(i[0], 32), 43)] >= i[1]) self.state = true; });
    if (this.state === true) {
      for (var k = 0; k < this.tetro.tetromino.length; k++) {
        var i = this.tetro.tetromino[k], h = pyMod(floorDiv(i[0], 32), 43);
        if (this.horizon[h] > 280) { show_game_over_screen(); return; }
        else if (this.horizon[h] <= i[1]) this.horizon[h] = i[1] + 32;
        var r = floorDiv(i[1] + 465, 32), c = floorDiv(i[0] + 318, 32);
        if (r >= 0 && r < 28) this.matrix[r][c] = [i[0], i[1]];
      }
    }
  };
  Tetris.prototype.point = function () {
    if (reset) {
      this.matrix = emptyMatrix(); this.state = false; this.horizon = new Array(43).fill(-465); reset = false; return;
    }
    var m = this.matrix, c = 0;
    function full(row) { return row.every(function (x) { return x !== null; }); }
    function shift(i) { m[i] = m[i].map(function (x) { return x ? [x[0], x[1] - c * 32] : null; }); }
    function clear(i) {
      m[i].forEach(function (j) { splash(j[0], j[1]); });
      extraDelay += 100;                                   // time.sleep(0.1)
      m[i] = m[i].map(function () { return null; });
      c += 1;
      var rolled = m.slice(i + 1).concat([m[i]]);          // np.roll(matrix[i:], -1, axis=0)
      for (var k = 0; k < rolled.length; k++) m[i + k] = rolled[k];
    }
    for (var i = 0; i < m.length; i++) {
      if (!full(m[i])) { shift(i); continue; }
      clear(i);
      if (!full(m[i])) { shift(i); continue; }
      clear(i);
      if (!full(m[i])) { shift(i); continue; }
      clear(i);
      if (!full(m[i])) { shift(i); continue; }
      clear(i);
      shift(i);
    }
    this.horizon = this.horizon.map(function (h) { return h - c * 32; });
    if (c === 1) score += 100; else if (c === 2) score += 300; else if (c === 3) score += 500; else if (c === 4) score += 800;
    if (c > 0) desired_fps += (score / 100) * 5;
  };
  Tetris.prototype.play = function () {
    if (this.state === true) { this.tetro = new Tetromino(); this.state = false; }
    this.tetro.draw();
    this.point();
    this.check();
    this.tetro.descend();
    this.draw();
  };
  var game = new Tetris();

  // --- showScreen ------------------------------------------------------------
  function showScreen() {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    proj = 'base';
    glColor3f(1, 1, 0);
    boxesThisFrame = 0;
    if (state) {
      if (paused) {
        splash_screen();
      } else {
        draw_template();
        game.play();
        glColor3f(236 / 255, 229 / 255, 221 / 255);   // glColor4f(..., a): blending is never enabled, so alpha has no effect
        for (var j = -465; j < 300; j += 32) for (var i = -318; i < 325; i += 32) draw_points(i, j, 5);
      }
      draw_controls();
    } else {
      draw_controls();
      show_game_over_screen();
    }
  }

  // --- timing: the Python loop slept frame_time once per box drawn, plus drawing overhead
  var timer = null;
  function schedule() {
    clearTimeout(timer);
    var frame_time = 1000 / desired_fps;
    var delay = 220 + (state && !paused ? boxesThisFrame * frame_time * 0.4 : 0) + extraDelay;
    extraDelay = 0;
    timer = setTimeout(tick, delay);
  }
  // Not part of the original: pause while the game is scrolled out of view or the tab is hidden
  var visible = true;
  function tick() { if (!visible || document.hidden) { timer = null; return; } showScreen(); schedule(); }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      var was = visible; visible = en[0].isIntersecting;
      if (visible && !was) schedule();
    }).observe(canvas);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && visible) schedule(); });

  // --- input (keyboardListener / mouseListener) --------------------------------
  function key(k) {
    k = k.toLowerCase();
    if (!game.tetro) return;
    if (k === 'a') game.tetro.translate('a', game.matrix);
    if (k === 'd') game.tetro.translate('d', game.matrix);
    if (k === 'w') game.tetro.rotate();
    if (k === 's') game.tetro.fall(game.horizon);
    // glutPostRedisplay(): an extra frame, so the game also advances one step
    showScreen(); schedule();
  }
  window.addEventListener('keydown', function (e) {
    if (['a', 'd', 'w', 's'].indexOf(e.key.toLowerCase()) > -1) { e.preventDefault(); key(e.key); }
  });
  function click(clientX, clientY) {
    var r = canvas.getBoundingClientRect();
    var x = (clientX - r.left) / r.width * W, y = (clientY - r.top) / r.height * H;
    var cX = x - 384, cY = 512 - y;
    if (cX >= -310 && cX <= -270 && cY >= 460 && cY <= 480) { score = 0; reset = true; state = true; }
    if (cX >= -15 && cX <= 15 && cY >= 460 && cY <= 480) paused = !paused;
    if (cX >= 270 && cX <= 310 && cY >= 450 && cY <= 470) { state = false; }   // the original also closed the window
    showScreen(); schedule();
  }
  canvas.addEventListener('mousedown', function (e) { if (e.button === 0) click(e.clientX, e.clientY); canvas.focus(); });
  document.querySelectorAll('[data-key]').forEach(function (b) {
    b.addEventListener('click', function () { if (b.dataset.key === 'pause') { paused = !paused; showScreen(); schedule(); } else key(b.dataset.key); canvas.focus(); });
  });

  build_template();
  showScreen();
  schedule();
})();
