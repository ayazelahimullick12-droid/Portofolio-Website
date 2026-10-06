/* Car-Workshop, replayed in the browser for the portfolio.
   The original is PHP + MySQL (see github.com/ayaz-elahi/Car-Workshop). The pages
   here keep its markup; this file stands in for db_config.php, the MySQL tables
   and $_SESSION, and ports each page's PHP logic. Data lives in localStorage. */
(function () {
  var KEY = 'cw_db_v1';

  // Seed: mechanics and admin from setup.sql; the customers and bookings are sample data
  function seed() {
    var d = new Date(), iso = function (offset) { var x = new Date(d); x.setDate(x.getDate() + offset); return x.toISOString().slice(0, 10); };
    return {
      users: [
        { id: 1, name: 'Demo Customer', email: 'demo@workshop.test', password: 'demo123' },
        { id: 2, name: 'Rahim Uddin', email: 'rahim@example.com', password: 'rahim123' },
        { id: 3, name: 'Nusrat Jahan', email: 'nusrat@example.com', password: 'nusrat123' }
      ],
      mechanics: [
        { id: 1, name: 'M1', max_appointments: 2 },
        { id: 2, name: 'M2', max_appointments: 2 },
        { id: 3, name: 'M3', max_appointments: 3 }
      ],
      appointments: [
        { id: 1, user_id: 2, date: iso(1), mechanic_id: 1 },
        { id: 2, user_id: 3, date: iso(1), mechanic_id: 1 },
        { id: 3, user_id: 2, date: iso(3), mechanic_id: 2 }
      ],
      admins: [{ id: 1, username: 'admin', password: 'admin123' }]
    };
  }
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.users) return s; } catch (e) {}
    var fresh = seed(); save(fresh); return fresh;
  }
  function save(db) { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }
  function nextId(rows) { return rows.reduce(function (m, r) { return Math.max(m, r.id); }, 0) + 1; }

  var session = {
    get: function (k) { try { return sessionStorage.getItem('cw_' + k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem('cw_' + k, v); } catch (e) {} },
    destroy: function () { try { ['user', 'admin'].forEach(function (k) { sessionStorage.removeItem('cw_' + k); }); } catch (e) {} }
  };

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // PHP's die(): stop with a bare message and no page
  function die(html) {
    document.title = '';
    document.head.querySelectorAll('link[rel="stylesheet"]').forEach(function (l) { l.remove(); });
    document.body.innerHTML = html;
    document.body.style.cssText = 'margin:8px;font-family:Times New Roman,serif;font-size:16px';
  }

  // Shows an alert exactly where the PHP page echoes it: right after the <h2>
  function flash(kind, html) {
    var box = document.getElementById('flash');
    box.innerHTML = "<div class='alert alert-" + kind + "'>" + html + '</div>';
  }

  function demoBar() {
    var css = '.demo-bar{background:#0f172a;color:#e2e8f0;font:13px/1.45 system-ui,Segoe UI,sans-serif;padding:8px 14px;display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center}' +
      '.demo-bar b{color:#38bdf8;font-size:11px;letter-spacing:.08em}.demo-bar code{color:#f8fafc;background:#1e293b;padding:1px 6px;border-radius:5px}' +
      '.demo-bar button{margin-left:auto;border:1px solid #334155;background:#1e293b;color:#f1f5f9;border-radius:999px;padding:3px 10px;font:inherit;cursor:pointer}';
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var bar = document.createElement('div');
    bar.className = 'demo-bar';
    bar.innerHTML = '<b>DEMO</b><span>PHP + MySQL app replayed in your browser.</span>' +
      '<span>Customer <code>demo@workshop.test</code> / <code>demo123</code></span>' +
      '<span>Admin <code>admin</code> / <code>admin123</code></span>' +
      '<button type="button">Reset data</button>';
    bar.querySelector('button').addEventListener('click', function () { localStorage.removeItem(KEY); session.destroy(); location.href = 'home.html'; });
    document.body.insertBefore(bar, document.body.firstChild);
  }

  var pages = {
    home: function () {},

    signup: function (db) {
      document.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault();
        var f = e.target, email = f.email.value.trim();
        if (db.users.some(function (u) { return u.email.toLowerCase() === email.toLowerCase(); })) {
          flash('danger', 'Signup failed. Try again.');           // UNIQUE(email) violation
        } else {
          db.users.push({ id: nextId(db.users), name: f.name.value, email: email, password: f.password.value });
          save(db);
          flash('success', "Signup successful. <a href='login.html'>Click here to login</a>");
        }
        f.reset();
      });
    },

    login: function (db) {
      document.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault();
        var f = e.target;
        var u = db.users.filter(function (x) { return x.email === f.email.value.trim(); })[0];
        if (u && u.password === f.password.value) { session.set('user', u.id); location.href = 'index.html'; return; }
        flash('danger', 'Invalid email or password.');
      });
    },

    book: function (db) {
      var uid = +session.get('user');
      if (!uid) return die("Login first <a href='login.html'>here</a>");
      var sel = document.querySelector('select[name=mechanic]');
      sel.innerHTML = db.mechanics.map(function (m) { return "<option value='" + m.id + "'>" + esc(m.name) + '</option>'; }).join('');
      document.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault();
        var d = e.target.date.value, mid = +e.target.mechanic.value;
        if (db.appointments.some(function (a) { return a.user_id === uid && a.date === d; })) {
          flash('danger', 'Already booked that day');
        } else {
          var limit = db.mechanics.filter(function (m) { return m.id === mid; })[0].max_appointments;
          var taken = db.appointments.filter(function (a) { return a.mechanic_id === mid && a.date === d; }).length;
          if (taken >= limit) flash('danger', 'Mechanic is fully booked for that day (limit: ' + limit + ')');
          else {
            db.appointments.push({ id: nextId(db.appointments), user_id: uid, date: d, mechanic_id: mid });
            save(db);
            flash('success', 'Appointment booked successfully!');
          }
        }
        e.target.date.value = '';
      });
    },

    adminLogin: function (db) {
      document.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault();
        var f = e.target;
        var a = db.admins.filter(function (x) { return x.username === f.username.value; })[0];
        if (a && f.password.value === a.password) { session.set('admin', a.id); location.href = 'admin.html'; return; }
        flash('danger', 'Invalid admin credentials.');
      });
    },

    admin: function (db) {
      if (!session.get('admin')) return die('Admin only');
      var mechOpts = function (selected) {
        return db.mechanics.map(function (m) { return "<option value='" + m.id + "'" + (m.id === selected ? ' selected' : '') + '>' + esc(m.name) + '</option>'; }).join('');
      };
      function render() {
        document.querySelector('select[name=user]').innerHTML = db.users.map(function (u) { return "<option value='" + u.id + "'>" + esc(u.name) + '</option>'; }).join('');
        document.querySelector('form.row select[name=mechanic]').innerHTML = mechOpts();
        // SELECT a.id,u.name,a.date,m.name ... JOIN users JOIN mechanics
        var rows = db.appointments.map(function (a) {
          var u = db.users.filter(function (x) { return x.id === a.user_id; })[0];
          if (!u) return '';
          return '<tr><td>' + esc(u.name) + '</td>' +
            '<td><input type="date" name="date" value="' + a.date + '" class="form-control"></td>' +
            '<td><select name="mechanic" class="form-control">' + mechOpts(a.mechanic_id) + '</select></td>' +
            '<td><input type="hidden" name="id" value="' + a.id + '"><button name="edit" value="1" class="btn btn-primary btn-sm" data-edit="' + a.id + '">Save</button></td></tr>';
        }).join('');
        document.getElementById('apps').innerHTML = '<tr><th>User</th><th>Date</th><th>Mechanic</th><th>Action</th></tr>' + rows;
        document.getElementById('limits').innerHTML = '<tr><th>Mechanic</th><th>Max Appointments/Day</th><th>Action</th></tr>' +
          db.mechanics.map(function (m) {
            return '<tr><td>' + esc(m.name) + '</td><td><input type="number" name="max" value="' + m.max_appointments + '" class="form-control"></td>' +
              '<td><input type="hidden" name="id" value="' + m.id + '"><button name="limit" value="1" class="btn btn-warning btn-sm" data-limit="' + m.id + '">Update</button></td></tr>';
          }).join('');
      }
      render();
      document.querySelector('form.row').addEventListener('submit', function (e) {
        e.preventDefault();
        var f = e.target;
        db.appointments.push({ id: nextId(db.appointments), user_id: +f.user.value, date: f.date.value, mechanic_id: +f.mechanic.value });
        save(db); f.date.value = ''; render();
      });
      document.addEventListener('click', function (e) {
        var b = e.target.closest('[data-edit],[data-limit]');
        if (!b) return;
        e.preventDefault();
        var tr = b.closest('tr');
        if (b.dataset.edit) {
          var a = db.appointments.filter(function (x) { return x.id === +b.dataset.edit; })[0];
          a.date = tr.querySelector('[name=date]').value; a.mechanic_id = +tr.querySelector('[name=mechanic]').value;
        } else {
          db.mechanics.filter(function (x) { return x.id === +b.dataset.limit; })[0].max_appointments = +tr.querySelector('[name=max]').value;
        }
        save(db); render();
      });
    },

    logout: function () { session.destroy(); location.replace('login.html'); },
    adminLogout: function () { session.destroy(); location.replace('admin_login.html'); }
  };

  window.CW = {
    run: function (page) {
      var db = load();
      if (page !== 'logout' && page !== 'adminLogout') demoBar();
      pages[page](db);
    }
  };
})();
