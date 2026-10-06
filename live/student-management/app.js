/* Student Management System, rendered in the browser for the portfolio.
   The original is Laravel 12 + MySQL (github.com/ayaz-elahi/student-management).
   Each view below is the Blade template's markup with its @foreach/@if logic
   turned into JavaScript; the controllers' rules are ported as they are.
   Data: DatabaseSeeder's admin, faculties and classrooms, plus sample courses,
   students and enrolments so every screen has something to show. */
(function () {
  'use strict';

  var KEY = 'sms_db_v1';
  var SLOTS = { slot1: '10:00 AM - 11:30 AM', slot2: '12:00 PM - 1:30 PM', slot3: '2:00 PM - 3:30 PM', slot4: '6:00 PM - 8:00 PM' };

  function seed() {
    var day = 864e5, now = Date.now();
    return {
      users: [
        // from DatabaseSeeder
        { id: 1, name: 'Admin User', email: 'admin@student.com', password: 'admin123', role: 'admin' },
        // sample accounts
        { id: 2, name: 'Dr. John Smith', email: 'john.smith@university.com', password: 'faculty123', role: 'faculty' },
        { id: 3, name: 'Ayesha Rahman', email: 'student@student.com', password: 'student123', role: 'student', student_type: 'undergraduate', student_id: 'STU2041' },
        { id: 4, name: 'Tanvir Hasan', email: 'tanvir@student.com', password: 'student123', role: 'student', student_type: 'undergraduate', student_id: 'STU3310' },
        { id: 5, name: 'Farhana Akter', email: 'farhana@student.com', password: 'student123', role: 'student', student_type: 'master', student_id: 'STU2875' }
      ],
      // from DatabaseSeeder
      faculties: [
        { id: 1, name: 'Dr. John Smith', email: 'john.smith@university.com', department: 'Computer Science' },
        { id: 2, name: 'Dr. Sarah Johnson', email: 'sarah.johnson@university.com', department: 'Mathematics' },
        { id: 3, name: 'Dr. Michael Brown', email: 'michael.brown@university.com', department: 'Physics' }
      ],
      classrooms: [
        { id: 1, room_number: 'CS-101', building: 'Computer Science Building', capacity: 50 },
        { id: 2, room_number: 'MATH-201', building: 'Mathematics Building', capacity: 40 },
        { id: 3, room_number: 'PHY-301', building: 'Physics Building', capacity: 35 },
        { id: 4, room_number: 'GEN-001', building: 'General Studies Building', capacity: 60 },
        { id: 5, room_number: 'LAB-101', building: 'Laboratory Building', capacity: 25 }
      ],
      // sample courses, each with the two sections the admin form creates
      courses: [
        { id: 1, course_code: 'CSE110', course_name: 'Programming Language I', credits: 3, level: 'undergraduate', description: 'Structured programming in Python: control flow, functions, lists and dictionaries.' },
        { id: 2, course_code: 'MAT110', course_name: 'Mathematics I: Differential Calculus', credits: 3, level: 'undergraduate', description: '' },
        { id: 3, course_code: 'PHY111', course_name: 'Principles of Physics I', credits: 3, level: 'undergraduate', description: 'Mechanics, waves and thermodynamics.' },
        { id: 4, course_code: 'CSE610', course_name: 'Advanced Algorithms', credits: 3, level: 'master', description: 'Graph algorithms, approximation and randomised algorithms.' }
      ],
      sections: [
        { id: 1, course_id: 1, section_name: 'A', faculty_id: 1, classroom_id: 1, time_slot: 'slot1', days: ['Tuesday', 'Thursday'] },
        { id: 2, course_id: 1, section_name: 'B', faculty_id: 1, classroom_id: 5, time_slot: 'slot3', days: ['Monday', 'Wednesday'] },
        { id: 3, course_id: 2, section_name: 'A', faculty_id: 2, classroom_id: 2, time_slot: 'slot2', days: ['Tuesday', 'Thursday'] },
        { id: 4, course_id: 2, section_name: 'B', faculty_id: 2, classroom_id: 4, time_slot: 'slot4', days: ['Monday', 'Wednesday'] },
        { id: 5, course_id: 3, section_name: 'A', faculty_id: 3, classroom_id: 3, time_slot: 'slot1', days: ['Monday', 'Wednesday'] },
        { id: 6, course_id: 3, section_name: 'B', faculty_id: 3, classroom_id: 3, time_slot: 'slot3', days: ['Tuesday', 'Thursday'] },
        { id: 7, course_id: 4, section_name: 'A', faculty_id: 1, classroom_id: 1, time_slot: 'slot4', days: ['Thursday', 'Saturday'] },
        { id: 8, course_id: 4, section_name: 'B', faculty_id: 1, classroom_id: 5, time_slot: 'slot2', days: ['Monday', 'Thursday'] }
      ],
      enrollments: [
        { id: 1, user_id: 3, course_section_id: 1, status: 'approved', created_at: now - 20 * day },
        { id: 2, user_id: 3, course_section_id: 3, status: 'pending', created_at: now - 2 * day },
        { id: 3, user_id: 4, course_section_id: 5, status: 'pending', created_at: now - 1 * day },
        { id: 4, user_id: 5, course_section_id: 7, status: 'approved', created_at: now - 15 * day },
        { id: 5, user_id: 4, course_section_id: 2, status: 'approved', created_at: now - 12 * day }
      ],
      grades: [
        { id: 1, enrollment_id: 1, grade: 92, letter_grade: 'A' },
        { id: 2, enrollment_id: 4, grade: 81.5, letter_grade: 'B+' }
      ]
    };
  }
  var db;
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.users) return s; } catch (e) {}
    var fresh = seed(); save(fresh); return fresh;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }
  function nextId(rows) { return rows.reduce(function (m, r) { return Math.max(m, r.id); }, 0) + 1; }
  function find(rows, id) { return rows.filter(function (r) { return r.id === +id; })[0]; }

  // Eloquent-style relations
  function section(id) {
    var s = find(db.sections, id);
    return s && Object.assign({}, s, {
      course: find(db.courses, s.course_id), faculty: find(db.faculties, s.faculty_id),
      classroom: find(db.classrooms, s.classroom_id), time_slot_name: SLOTS[s.time_slot] || ''
    });
  }
  function enrollment(e) {
    return Object.assign({}, e, {
      user: find(db.users, e.user_id), courseSection: section(e.course_section_id),
      grade: db.grades.filter(function (g) { return g.enrollment_id === e.id; })[0] || null
    });
  }

  /* ---------- session, flash, old input, errors ---------- */
  function authUser() { try { return find(db.users, sessionStorage.getItem('sms_user')); } catch (e) { return null; } }
  function login(u) { try { sessionStorage.setItem('sms_user', u.id); } catch (e) {} }
  function logout() { try { sessionStorage.removeItem('sms_user'); } catch (e) {} }
  var flash = {}, errors = {}, old = {};
  function redirect(path, f) { flash = f || {}; if (location.hash === '#' + path) render(); else location.hash = path; }
  function back(f) { flash = f || {}; render(); }

  function e(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ucfirst(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function err(field) { return errors[field] ? ' is-invalid' : ''; }
  function errMsg(field) { return errors[field] ? '<div class="invalid-feedback">' + e(errors[field]) + '</div>' : ''; }
  function o(field) { return e(old[field] || ''); }
  function fmtDate(t) { return new Date(t).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).replace(',', ','); }

  /* ---------- views (markup from resources/views) ---------- */
  var V = {};

  // auth/login.blade.php
  V.login = function () {
    return ['Login', '' +
'<div class="row justify-content-center">' +
'    <div class="col-md-6">' +
'        <div class="card">' +
'            <div class="card-header text-center">' +
'                <h4>Login</h4>' +
'            </div>' +
'            <div class="card-body">' +
'                <form method="POST" data-action="login">' +
'                    <div class="mb-3">' +
'                        <label for="email" class="form-label">Email</label>' +
'                        <input type="email" class="form-control' + err('email') + '" id="email" name="email" value="' + o('email') + '" required>' +
'                        ' + errMsg('email') +
'                    </div>' +
'                    <div class="mb-3">' +
'                        <label for="password" class="form-label">Password</label>' +
'                        <input type="password" class="form-control' + err('password') + '" id="password" name="password" required>' +
'                        ' + errMsg('password') +
'                    </div>' +
'                    <div class="d-grid">' +
'                        <button type="submit" class="btn btn-primary">Login</button>' +
'                    </div>' +
'                </form>' +
'                <div class="text-center mt-3">' +
'                    <p>Don\'t have an account? <a href="#/register">Register here</a></p>' +
'                </div>' +
'            </div>' +
'        </div>' +
'    </div>' +
'</div>'];
  };

  // auth/register.blade.php (the form RegisterController actually serves)
  V.register = function () {
    function row(id, label, type, name, extra) {
      return '<div class="row mb-3">' +
'    <label for="' + id + '" class="col-md-4 col-form-label text-md-end">' + label + '</label>' +
'    <div class="col-md-6">' +
'        <input id="' + id + '" type="' + type + '" class="form-control' + (name !== 'password_confirmation' ? err(name) : '') + '" name="' + name + '"' + (type === 'password' ? '' : ' value="' + o(name) + '"') + ' required ' + (extra || '') + '>' +
        (errors[name] ? '<span class="invalid-feedback" role="alert"><strong>' + e(errors[name]) + '</strong></span>' : '') +
'    </div>' +
'</div>';
    }
    return ['Student Management System', '' +
'<div class="container">' +
'    <div class="row justify-content-center">' +
'        <div class="col-md-8">' +
'            <div class="card">' +
'                <div class="card-header">Register</div>' +
'                <div class="card-body">' +
'                    <form method="POST" data-action="register">' +
                         row('name', 'Name', 'text', 'name', 'autocomplete="name" autofocus') +
                         row('email', 'Email Address', 'email', 'email', 'autocomplete="email"') +
                         row('password', 'Password', 'password', 'password', 'autocomplete="new-password"') +
                         row('password-confirm', 'Confirm Password', 'password', 'password_confirmation', 'autocomplete="new-password"') +
'                        <div class="row mb-0">' +
'                            <div class="col-md-6 offset-md-4">' +
'                                <button type="submit" class="btn btn-primary">Register</button>' +
'                            </div>' +
'                        </div>' +
'                    </form>' +
'                </div>' +
'            </div>' +
'        </div>' +
'    </div>' +
'</div>'];
  };

  function dashCard(col, title, text, href, btn, label) {
    return '<div class="' + col + '">' +
'        <div class="card dashboard-card">' +
'            <div class="card-body text-center">' +
'                <h5 class="card-title">' + title + '</h5>' +
'                <p class="card-text">' + text + '</p>' +
'                <a href="' + href + '" class="btn ' + btn + '">' + label + '</a>' +
'            </div>' +
'        </div>' +
'    </div>';
  }
  function backBtn() { return '<a href="#/dashboard" class="btn btn-secondary">Back to Dashboard</a>'; }
  function pageHead(title) {
    return '<div class="row"><div class="col-12"><div class="d-flex justify-content-between align-items-center mb-4"><h2>' + title + '</h2>' + backBtn() + '</div></div></div>';
  }

  // student/dashboard.blade.php
  V.studentDashboard = function (u) {
    var enrollments = db.enrollments.filter(function (x) { return x.user_id === u.id; }).map(enrollment);
    var rows = enrollments.map(function (en) {
      var badge = en.status === 'approved' ? 'bg-success' : en.status === 'pending' ? 'bg-warning' : 'bg-danger';
      return '<tr>' +
        '<td>' + e(en.courseSection.course.course_code) + '</td>' +
        '<td>' + e(en.courseSection.course.course_name) + '</td>' +
        '<td>' + e(en.courseSection.section_name) + '</td>' +
        '<td>' + e(en.courseSection.faculty.name) + '</td>' +
        '<td><span class="badge ' + badge + '">' + ucfirst(en.status) + '</span></td>' +
        '<td>' + (en.grade ? e(en.grade.letter_grade) + ' (' + e(en.grade.grade) + ')' : '<span class="text-muted">Not graded</span>') + '</td>' +
        '</tr>';
    }).join('');
    return ['Student Dashboard', '' +
'<div class="row">' +
'    <div class="col-12">' +
'        <h2>Welcome, ' + e(u.name) + '</h2>' +
'        <p class="text-muted">Student ID: ' + e(u.student_id) + ' | Type: ' + ucfirst(u.student_type) + '</p>' +
'    </div>' +
'</div>' +
'<div class="row mb-4">' +
     dashCard('col-md-4', 'Request Course', 'Request to enroll in available courses', '#/student/request-course', 'btn-primary', 'Request Course') +
     dashCard('col-md-4', 'View Grades', 'Check your grades for completed courses', '#/student/grades', 'btn-success', 'View Grades') +
     dashCard('col-md-4', 'Free Classrooms', 'Find available classrooms by time slot', '#/free-classrooms', 'btn-info', 'Find Rooms') +
'</div>' +
'<div class="row">' +
'    <div class="col-12">' +
'        <div class="card">' +
'            <div class="card-header">' +
'                <h5>My Enrolled Courses</h5>' +
'            </div>' +
'            <div class="card-body">' +
          (enrollments.length ?
'                <div class="table-responsive">' +
'                    <table class="table table-hover">' +
'                        <thead><tr><th>Course Code</th><th>Course Name</th><th>Section</th><th>Faculty</th><th>Status</th><th>Grade</th></tr></thead>' +
'                        <tbody>' + rows + '</tbody>' +
'                    </table>' +
'                </div>'
          : '<p class="text-muted">You are not enrolled in any courses yet.</p>') +
'            </div>' +
'        </div>' +
'    </div>' +
'</div>'];
  };

  // student/request-course.blade.php
  V.requestCourse = function (u) {
    var available = db.sections.map(function (s) { return section(s.id); }).filter(function (s) {
      var levelOk = u.student_type === 'master' ? ['undergraduate', 'master'].indexOf(s.course.level) > -1 : s.course.level === 'undergraduate';
      var mine = db.enrollments.some(function (en) { return en.course_section_id === s.id && en.user_id === u.id; });
      return levelOk && !mine;
    });
    return ['Request Course', '' +
'<div class="row">' +
'    <div class="col-12">' +
'        <div class="card">' +
'            <div class="card-header">' +
'                <h5>Request Course Enrollment</h5>' +
'            </div>' +
'            <div class="card-body">' +
'                <form method="POST" data-action="request-course">' +
'                    <div class="mb-3">' +
'                        <label for="course_section_id" class="form-label">Select Course Section</label>' +
'                        <select class="form-control' + err('course_section_id') + '" id="course_section_id" name="course_section_id" required>' +
'                            <option value="">Choose a course section...</option>' +
                             available.map(function (s) {
                               return '<option value="' + s.id + '">' + e(s.course.course_code) + ' - ' + e(s.course.course_name) + ' (Section ' + e(s.section_name) + ') - ' + e(s.time_slot_name) + '</option>';
                             }).join('') +
'                        </select>' +
'                        ' + errMsg('course_section_id') +
'                    </div>' +
'                    <div class="d-flex justify-content-between">' +
'                        <a href="#/dashboard" class="btn btn-secondary">Back to Dashboard</a>' +
'                        <button type="submit" class="btn btn-primary">Submit Request</button>' +
'                    </div>' +
'                </form>' +
'            </div>' +
'        </div>' +
'    </div>' +
'</div>'];
  };

  // student/grades.blade.php
  V.grades = function (u) {
    var graded = db.enrollments.filter(function (x) { return x.user_id === u.id; }).map(enrollment).filter(function (en) { return en.grade; });
    return ['My Grades', '' +
'<div class="row">' +
'    <div class="col-12">' +
'        <div class="card">' +
'            <div class="card-header">' +
'                <h5>My Grades</h5>' +
'            </div>' +
'            <div class="card-body">' +
          (graded.length ?
'                <div class="table-responsive">' +
'                    <table class="table table-hover">' +
'                        <thead><tr><th>Course Code</th><th>Course Name</th><th>Section</th><th>Credits</th><th>Numerical Grade</th><th>Letter Grade</th></tr></thead>' +
'                        <tbody>' + graded.map(function (en) {
                            return '<tr><td>' + e(en.courseSection.course.course_code) + '</td><td>' + e(en.courseSection.course.course_name) + '</td><td>' + e(en.courseSection.section_name) + '</td><td>' + e(en.courseSection.course.credits) + '</td><td>' + e(en.grade.grade) + '</td><td><span class="badge bg-primary">' + e(en.grade.letter_grade) + '</span></td></tr>';
                          }).join('') + '</tbody>' +
'                    </table>' +
'                </div>'
          : '<p class="text-muted">No grades available yet.</p>') +
'                <div class="mt-3">' + backBtn() + '</div>' +
'            </div>' +
'        </div>' +
'    </div>' +
'</div>'];
  };

  // student/free-classrooms.blade.php (DashboardController@freeClassrooms)
  V.freeClassrooms = function (u, q) {
    var slot = q.time_slot || '';
    var free = [];
    if (slot) {
      var occupied = db.sections.filter(function (s) { return s.time_slot === slot; }).map(function (s) { return s.classroom_id; });
      free = db.classrooms.filter(function (c) { return occupied.indexOf(c.id) === -1; });
    }
    return ['Free Classrooms', '' +
'<div class="row">' +
'    <div class="col-12">' +
'        <div class="card">' +
'            <div class="card-header">' +
'                <h5>Free Classrooms</h5>' +
'            </div>' +
'            <div class="card-body">' +
'                <form method="GET" data-action="free-classrooms">' +
'                    <div class="mb-3">' +
'                        <label for="time_slot" class="form-label">Select Time Slot</label>' +
'                        <select class="form-control" id="time_slot" name="time_slot" data-autosubmit>' +
'                            <option value="">Choose a time slot...</option>' +
                             Object.keys(SLOTS).map(function (k) { return '<option value="' + k + '"' + (slot === k ? ' selected' : '') + '>' + SLOTS[k] + '</option>'; }).join('') +
'                        </select>' +
'                    </div>' +
'                </form>' +
          (slot && free.length ?
'                <div class="table-responsive">' +
'                    <table class="table table-hover">' +
'                        <thead><tr><th>Room Number</th><th>Building</th><th>Capacity</th></tr></thead>' +
'                        <tbody>' + free.map(function (r) { return '<tr><td>' + e(r.room_number) + '</td><td>' + e(r.building) + '</td><td>' + e(r.capacity) + ' students</td></tr>'; }).join('') + '</tbody>' +
'                    </table>' +
'                </div>'
          : slot ? '<div class="alert alert-info">No free classrooms available for this time slot.</div>' : '') +
'                <div class="mt-3">' + backBtn() + '</div>' +
'            </div>' +
'        </div>' +
'    </div>' +
'</div>'];
  };

  // faculty/dashboard.blade.php
  V.facultyDashboard = function () {
    return ['Faculty Dashboard', '' +
'<div class="row">' +
'    <div class="col-12">' +
'        <h2>Faculty Dashboard</h2>' +
'        <p class="text-muted">Manage course enrollments and student grades</p>' +
'    </div>' +
'</div>' +
'<div class="row">' +
     dashCard('col-md-6', 'Approve Requests', 'Review and approve student course enrollment requests', '#/faculty/requests', 'btn-primary', 'View Requests') +
     dashCard('col-md-6', 'Grade Students', 'Grade students enrolled in your courses', '#/faculty/grade-students', 'btn-success', 'Grade Students') +
'</div>'];
  };

  // faculty/requests.blade.php
  V.requests = function () {
    var pending = db.enrollments.filter(function (x) { return x.status === 'pending'; }).map(enrollment);
    return ['Approve Student Requests', pageHead('Student Course Requests') +
'<div class="row">' +
'    <div class="col-12">' +
'        <div class="card">' +
'            <div class="card-header">' +
'                <h5>Pending Requests</h5>' +
'            </div>' +
'            <div class="card-body">' +
          (pending.length ?
'                <div class="table-responsive">' +
'                    <table class="table table-hover">' +
'                        <thead><tr><th>Student Name</th><th>Student ID</th><th>Course</th><th>Section</th><th>Faculty</th><th>Request Date</th><th>Actions</th></tr></thead>' +
'                        <tbody>' + pending.map(function (r) {
                            return '<tr><td>' + e(r.user.name) + '</td><td>' + e(r.user.student_id) + '</td><td>' + e(r.courseSection.course.course_code) + ' - ' + e(r.courseSection.course.course_name) + '</td><td>' + e(r.courseSection.section_name) + '</td><td>' + e(r.courseSection.faculty.name) + '</td><td>' + fmtDate(r.created_at) + '</td>' +
                              '<td><form method="POST" data-action="approve" data-id="' + r.id + '" style="display: inline;"><button type="submit" class="btn btn-sm btn-success" data-confirm="Are you sure you want to approve this request?">Approve</button></form></td></tr>';
                          }).join('') + '</tbody>' +
'                    </table>' +
'                </div>'
          : '<p class="text-muted">No pending requests found.</p>') +
'            </div>' +
'        </div>' +
'    </div>' +
'</div>'];
  };

  // faculty/grade-students.blade.php
  V.gradeStudents = function () {
    var approved = db.enrollments.filter(function (x) { return x.status === 'approved'; }).map(enrollment);
    var LETTERS = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F'];
    return ['Grade Students', pageHead('Grade Students') +
'<div class="row">' +
'    <div class="col-12">' +
'        <div class="card">' +
'            <div class="card-header">' +
'                <h5>Approved Students</h5>' +
'            </div>' +
'            <div class="card-body">' +
          (approved.length ?
'                <div class="table-responsive">' +
'                    <table class="table table-hover">' +
'                        <thead><tr><th>Student Name</th><th>Student ID</th><th>Course</th><th>Section</th><th>Current Grade</th><th>Actions</th></tr></thead>' +
'                        <tbody>' + approved.map(function (en) {
                            var g = en.grade;
                            return '<tr><td>' + e(en.user.name) + '</td><td>' + e(en.user.student_id) + '</td><td>' + e(en.courseSection.course.course_code) + ' - ' + e(en.courseSection.course.course_name) + '</td><td>' + e(en.courseSection.section_name) + '</td>' +
                              '<td>' + (g ? e(g.letter_grade) + ' (' + e(g.grade) + ')' : '<span class="text-muted">Not graded</span>') + '</td>' +
                              '<td><button type="button" class="btn btn-sm btn-primary" data-bs-toggle="modal" data-bs-target="#gradeModal' + en.id + '">' + (g ? 'Update Grade' : 'Add Grade') + '</button>' +
                              '<div class="modal fade" id="gradeModal' + en.id + '" tabindex="-1"><div class="modal-dialog"><div class="modal-content">' +
                              '<div class="modal-header"><h5 class="modal-title">Grade Student</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>' +
                              '<form method="POST" data-action="grade"><input type="hidden" name="enrollment_id" value="' + en.id + '">' +
                              '<div class="modal-body"><p><strong>Student:</strong> ' + e(en.user.name) + '</p><p><strong>Course:</strong> ' + e(en.courseSection.course.course_code) + '</p>' +
                              '<div class="mb-3"><label for="grade' + en.id + '" class="form-label">Numerical Grade (0-100)</label><input type="number" class="form-control" id="grade' + en.id + '" name="grade" min="0" max="100" step="0.01" value="' + (g ? g.grade : '') + '" required></div>' +
                              '<div class="mb-3"><label for="letter_grade' + en.id + '" class="form-label">Letter Grade</label><select class="form-control" id="letter_grade' + en.id + '" name="letter_grade" required><option value="">Select Letter Grade</option>' +
                              LETTERS.map(function (L) { return '<option value="' + L + '"' + (g && g.letter_grade === L ? ' selected' : '') + '>' + L + '</option>'; }).join('') + '</select></div></div>' +
                              '<div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn btn-primary">Save Grade</button></div>' +
                              '</form></div></div></div></td></tr>';
                          }).join('') + '</tbody>' +
'                    </table>' +
'                </div>'
          : '<p class="text-muted">No approved enrollments found.</p>') +
'            </div>' +
'        </div>' +
'    </div>' +
'</div>'];
  };

  // admin/dashboard.blade.php
  V.adminDashboard = function () {
    return ['Admin Dashboard', '' +
'<div class="row">' +
'    <div class="col-12">' +
'        <h2>Admin Dashboard</h2>' +
'        <p class="text-muted">Manage the student management system</p>' +
'    </div>' +
'</div>' +
'<div class="row">' +
     dashCard('col-md-3', 'Manage Faculties', 'Add, view, or remove faculty members', '#/admin/faculties', 'btn-primary', 'Manage Faculties') +
     dashCard('col-md-3', 'Manage Courses', 'Add courses and sections', '#/admin/courses', 'btn-success', 'Manage Courses') +
     dashCard('col-md-3', 'Manage Classrooms', 'Add and view classrooms', '#/admin/classrooms', 'btn-info', 'Manage Classrooms') +
     dashCard('col-md-3', 'Manage Students', 'View and remove students', '#/admin/students', 'btn-warning', 'Manage Students') +
'</div>'];
  };

  function field(id, label, type, extra) {
    return '<div class="mb-3"><label for="' + id + '" class="form-label">' + label + '</label>' +
      '<input type="' + type + '" class="form-control' + err(id) + '" id="' + id + '" name="' + id + '" value="' + o(id) + '" ' + (extra || '') + 'required>' + errMsg(id) + '</div>';
  }

  // admin/faculties.blade.php
  V.faculties = function () {
    return ['Manage Faculties', pageHead('Manage Faculties') +
'<div class="row">' +
'    <div class="col-md-4">' +
'        <div class="card">' +
'            <div class="card-header"><h5>Add New Faculty</h5></div>' +
'            <div class="card-body">' +
'                <form method="POST" data-action="add-faculty">' +
                   field('name', 'Name', 'text') + field('email', 'Email', 'email') + field('department', 'Department', 'text') +
'                    <button type="submit" class="btn btn-primary">Add Faculty</button>' +
'                </form>' +
'            </div>' +
'        </div>' +
'    </div>' +
'    <div class="col-md-8">' +
'        <div class="card">' +
'            <div class="card-header"><h5>Current Faculties</h5></div>' +
'            <div class="card-body">' +
          (db.faculties.length ?
'                <div class="table-responsive"><table class="table table-hover"><thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Actions</th></tr></thead><tbody>' +
                  db.faculties.map(function (f) {
                    return '<tr><td>' + e(f.name) + '</td><td>' + e(f.email) + '</td><td>' + e(f.department) + '</td><td><form method="POST" data-action="remove-faculty" data-id="' + f.id + '" style="display: inline;" data-confirm="Are you sure you want to remove this faculty?"><button type="submit" class="btn btn-sm btn-danger">Remove</button></form></td></tr>';
                  }).join('') +
'                </tbody></table></div>'
          : '<p class="text-muted">No faculties found.</p>') +
'            </div>' +
'        </div>' +
'    </div>' +
'</div>'];
  };

  // admin/classrooms.blade.php
  V.classrooms = function () {
    return ['Manage Classrooms', pageHead('Manage Classrooms') +
'<div class="row">' +
'    <div class="col-md-4">' +
'        <div class="card">' +
'            <div class="card-header"><h5>Add New Classroom</h5></div>' +
'            <div class="card-body">' +
'                <form method="POST" data-action="add-classroom">' +
                   field('room_number', 'Room Number', 'text') + field('building', 'Building', 'text') + field('capacity', 'Capacity', 'number', 'min="1" ') +
'                    <button type="submit" class="btn btn-primary">Add Classroom</button>' +
'                </form>' +
'            </div>' +
'        </div>' +
'    </div>' +
'    <div class="col-md-8">' +
'        <div class="card">' +
'            <div class="card-header"><h5>Current Classrooms</h5></div>' +
'            <div class="card-body">' +
          (db.classrooms.length ?
'                <div class="table-responsive"><table class="table table-hover"><thead><tr><th>Room Number</th><th>Building</th><th>Capacity</th></tr></thead><tbody>' +
                  db.classrooms.map(function (c) { return '<tr><td>' + e(c.room_number) + '</td><td>' + e(c.building) + '</td><td>' + e(c.capacity) + ' students</td></tr>'; }).join('') +
'                </tbody></table></div>'
          : '<p class="text-muted">No classrooms found.</p>') +
'            </div>' +
'        </div>' +
'    </div>' +
'</div>'];
  };

  // admin/courses.blade.php
  V.courses = function () {
    var DAYS = [['Monday', 'mon', 'Mon'], ['Tuesday', 'tue', 'Tue'], ['Wednesday', 'wed', 'Wed'], ['Thursday', 'thu', 'Thu'], ['Friday', 'fri', 'Fri'], ['Saturday', 'sat', 'Sat']];
    function sectionBlock(i, ph) {
      return '<div class="border p-3 mb-3 rounded">' +
        '<h6 class="text-primary">Section ' + (i + 1) + '</h6>' +
        '<div class="row">' +
        '<div class="col-md-3"><label class="form-label">Section Name</label><input type="text" class="form-control" name="sections[' + i + '][section_name]" placeholder="' + ph + '" required></div>' +
        '<div class="col-md-3"><label class="form-label">Faculty</label><select class="form-control" name="sections[' + i + '][faculty_id]" required><option value="">Select Faculty</option>' +
          db.faculties.map(function (f) { return '<option value="' + f.id + '">' + e(f.name) + '</option>'; }).join('') + '</select></div>' +
        '<div class="col-md-3"><label class="form-label">Classroom</label><select class="form-control" name="sections[' + i + '][classroom_id]" required><option value="">Select Classroom</option>' +
          db.classrooms.map(function (c) { return '<option value="' + c.id + '">' + e(c.room_number) + ' (' + e(c.building) + ')</option>'; }).join('') + '</select></div>' +
        '<div class="col-md-3"><label class="form-label">Time Slot</label><select class="form-control" name="sections[' + i + '][time_slot]" required><option value="">Select Time</option>' +
          Object.keys(SLOTS).map(function (k) { return '<option value="' + k + '">' + SLOTS[k] + '</option>'; }).join('') + '</select></div>' +
        '</div>' +
        '<div class="row mt-2"><div class="col-md-12"><label class="form-label">Days (Select exactly 2 days)</label><div class="d-flex flex-wrap">' +
          DAYS.map(function (d, k) {
            return '<div class="form-check' + (k < DAYS.length - 1 ? ' me-3' : '') + '"><input class="form-check-input" type="checkbox" name="sections[' + i + '][days][]" value="' + d[0] + '" id="s' + i + d[1] + '"><label class="form-check-label" for="s' + i + d[1] + '">' + d[2] + '</label></div>';
          }).join('') +
        '</div></div></div></div>';
    }
    var existing = db.courses.map(function (c) {
      var secs = db.sections.filter(function (s) { return s.course_id === c.id; }).map(function (s) { return section(s.id); });
      return '<div class="card mb-3">' +
        '<div class="card-header"><h6 class="mb-0">' + e(c.course_code) + ' - ' + e(c.course_name) + ' <span class="badge bg-info ms-2">' + ucfirst(c.level) + '</span> <span class="badge bg-secondary ms-1">' + e(c.credits) + ' Credits</span></h6></div>' +
        '<div class="card-body">' + (c.description ? '<p class="text-muted">' + e(c.description) + '</p>' : '') +
        '<h6>Sections:</h6><div class="table-responsive"><table class="table table-sm"><thead><tr><th>Section</th><th>Faculty</th><th>Classroom</th><th>Time</th><th>Days</th></tr></thead><tbody>' +
        secs.map(function (s) { return '<tr><td>' + e(s.section_name) + '</td><td>' + e(s.faculty ? s.faculty.name : '') + '</td><td>' + e(s.classroom.room_number) + ' (' + e(s.classroom.building) + ')</td><td>' + e(s.time_slot_name) + '</td><td>' + e(s.days.join(', ')) + '</td></tr>'; }).join('') +
        '</tbody></table></div></div></div>';
    }).join('');
    return ['Manage Courses', pageHead('Manage Courses') +
'<div class="row mb-4">' +
'    <div class="col-12">' +
'        <div class="card">' +
'            <div class="card-header"><h5>Add New Course with Sections</h5></div>' +
'            <div class="card-body">' +
'                <form method="POST" data-action="add-course">' +
'                    <div class="row">' +
'                        <div class="col-md-6">' + field('course_code', 'Course Code', 'text') + '</div>' +
'                        <div class="col-md-6">' + field('course_name', 'Course Name', 'text') + '</div>' +
'                    </div>' +
'                    <div class="row">' +
'                        <div class="col-md-4">' + field('credits', 'Credits', 'number', 'min="1" max="6" ') + '</div>' +
'                        <div class="col-md-4"><div class="mb-3"><label for="level" class="form-label">Level</label><select class="form-control' + err('level') + '" id="level" name="level" required><option value="">Select Level</option><option value="undergraduate"' + (old.level === 'undergraduate' ? ' selected' : '') + '>Undergraduate</option><option value="master"' + (old.level === 'master' ? ' selected' : '') + '>Master</option></select>' + errMsg('level') + '</div></div>' +
'                        <div class="col-md-4"><div class="mb-3"><label for="description" class="form-label">Description</label><textarea class="form-control" id="description" name="description" rows="1">' + o('description') + '</textarea></div></div>' +
'                    </div>' +
'                    <hr>' +
'                    <h6>Course Sections (Add 2 sections)</h6>' +
                     sectionBlock(0, 'A') + sectionBlock(1, 'B') +
'                    <button type="submit" class="btn btn-primary">Add Course with Sections</button>' +
'                </form>' +
'            </div>' +
'        </div>' +
'    </div>' +
'</div>' +
'<div class="row">' +
'    <div class="col-12">' +
'        <div class="card">' +
'            <div class="card-header"><h5>Existing Courses</h5></div>' +
'            <div class="card-body">' + (db.courses.length ? existing : '<p class="text-muted">No courses found.</p>') + '</div>' +
'        </div>' +
'    </div>' +
'</div>'];
  };

  // admin/students.blade.php is an empty file in the repository, so this page has no content
  V.students = function () { return ['Student Management System', '']; };

  /* ---------- routes (routes/web.php) ---------- */
  var ROUTES = {
    '/login': { view: 'login', guest: true },
    '/register': { view: 'register', guest: true },
    '/dashboard': { auth: true, view: function (u) { return u.role === 'admin' ? 'adminDashboard' : u.role === 'student' ? 'studentDashboard' : 'facultyDashboard'; } },
    '/free-classrooms': { auth: true, view: 'freeClassrooms' },
    '/student/request-course': { auth: true, view: 'requestCourse' },
    '/student/grades': { auth: true, view: 'grades' },
    '/faculty/requests': { auth: true, view: 'requests' },
    '/faculty/grade-students': { auth: true, view: 'gradeStudents' },
    '/admin/faculties': { admin: true, view: 'faculties' },
    '/admin/courses': { admin: true, view: 'courses' },
    '/admin/classrooms': { admin: true, view: 'classrooms' },
    '/admin/students': { admin: true, view: 'students' }
  };

  function parse() {
    var h = location.hash.replace(/^#/, '') || '/';
    var parts = h.split('?'), q = {};
    (parts[1] || '').split('&').forEach(function (kv) { if (kv) { var p = kv.split('='); q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); } });
    return { path: parts[0], q: q };
  }

  function render() {
    var r = parse(), u = authUser();
    if (r.path === '/' || !ROUTES[r.path]) { location.replace('#/login'); return; }
    var route = ROUTES[r.path];
    if ((route.auth || route.admin) && !u) { location.replace('#/login'); return; }
    if (route.guest && u) { location.replace('#/dashboard'); return; }
    if (route.admin && u.role !== 'admin') { flash = { error: 'Access denied.' }; location.replace('#/dashboard'); return; }

    var name = typeof route.view === 'function' ? route.view(u) : route.view;
    var out = V[name](u, r.q);
    document.title = out[0];

    document.getElementById('auth-nav').innerHTML = u
      ? '<span class="navbar-text me-3">Hello, ' + e(u.name) + '</span><form method="POST" data-action="logout" class="d-inline"><button type="submit" class="btn btn-outline-light">Logout</button></form>'
      : '';
    var alerts = (flash.success ? '<div class="alert alert-success">' + e(flash.success) + '</div>' : '') +
                 (flash.error ? '<div class="alert alert-danger">' + e(flash.error) + '</div>' : '');
    document.getElementById('page').innerHTML = alerts + out[1];
    flash = {}; errors = {}; old = {};
    document.querySelectorAll('.modal-backdrop').forEach(function (b) { b.remove(); });
    document.body.classList.remove('modal-open'); document.body.style.removeProperty('overflow'); document.body.style.removeProperty('padding-right');
    window.scrollTo(0, 0);
  }

  /* ---------- form handlers (controllers) ---------- */
  function values(form) {
    var v = {};
    new FormData(form).forEach(function (val, k) { v[k] = val; });
    return v;
  }
  function invalid(fields, input) { errors = fields; old = input; render(); }

  var ACTIONS = {
    login: function (v) {
      var u = db.users.filter(function (x) { return x.email.toLowerCase() === String(v.email).trim().toLowerCase(); })[0];
      if (!u || u.password !== v.password) return invalid({ email: 'These credentials do not match our records.' }, { email: v.email });
      login(u); redirect('/dashboard');
    },
    register: function (v) {
      var errs = {};
      if (db.users.some(function (x) { return x.email.toLowerCase() === String(v.email).toLowerCase(); })) errs.email = 'The email has already been taken.';
      if (String(v.password).length < 8) errs.password = 'The password field must be at least 8 characters.';
      else if (v.password !== v.password_confirmation) errs.password = 'The password field confirmation does not match.';
      if (Object.keys(errs).length) return invalid(errs, { name: v.name, email: v.email });
      var u = { id: nextId(db.users), name: v.name, email: v.email, password: v.password, role: 'student', student_type: 'undergraduate', student_id: 'STU' + (1000 + Math.floor(Math.random() * 9000)) };
      db.users.push(u); save(); login(u);
      redirect('/dashboard');   // RegisterController sends users to /home, which has no route; the dashboard is where they belong
    },
    logout: function () { logout(); redirect('/login'); },
    'request-course': function (v, u) {
      if (db.enrollments.some(function (x) { return x.user_id === u.id && x.course_section_id === +v.course_section_id; })) return back({ error: 'You have already requested this course.' });
      db.enrollments.push({ id: nextId(db.enrollments), user_id: u.id, course_section_id: +v.course_section_id, status: 'pending', created_at: Date.now() });
      save(); redirect('/dashboard', { success: 'Course request submitted successfully!' });
    },
    approve: function (v, u, form) {
      find(db.enrollments, form.dataset.id).status = 'approved';
      save(); back({ success: 'Student request approved successfully!' });
    },
    grade: function (v) {
      var g = db.grades.filter(function (x) { return x.enrollment_id === +v.enrollment_id; })[0];
      if (g) { g.grade = +v.grade; g.letter_grade = v.letter_grade; }
      else db.grades.push({ id: nextId(db.grades), enrollment_id: +v.enrollment_id, grade: +v.grade, letter_grade: v.letter_grade });
      save(); back({ success: 'Grade submitted successfully!' });
    },
    'add-faculty': function (v) {
      if (db.faculties.some(function (f) { return f.email.toLowerCase() === String(v.email).toLowerCase(); })) return invalid({ email: 'The email has already been taken.' }, v);
      db.faculties.push({ id: nextId(db.faculties), name: v.name, email: v.email, department: v.department });
      save(); back({ success: 'Faculty added successfully!' });
    },
    'remove-faculty': function (v, u, form) {
      db.faculties = db.faculties.filter(function (f) { return f.id !== +form.dataset.id; });
      save(); back({ success: 'Faculty removed successfully!' });
    },
    'add-classroom': function (v) {
      if (db.classrooms.some(function (c) { return c.room_number.toLowerCase() === String(v.room_number).toLowerCase(); })) return invalid({ room_number: 'The room number has already been taken.' }, v);
      db.classrooms.push({ id: nextId(db.classrooms), room_number: v.room_number, building: v.building, capacity: +v.capacity });
      save(); back({ success: 'Classroom added successfully!' });
    },
    'add-course': function (v, u, form) {
      if (db.courses.some(function (c) { return c.course_code.toLowerCase() === String(v.course_code).toLowerCase(); })) return invalid({ course_code: 'The course code has already been taken.' }, v);
      var secs = [0, 1].map(function (i) {
        return {
          section_name: v['sections[' + i + '][section_name]'], faculty_id: +v['sections[' + i + '][faculty_id]'],
          classroom_id: +v['sections[' + i + '][classroom_id]'], time_slot: v['sections[' + i + '][time_slot]'],
          days: [].slice.call(form.querySelectorAll('input[name="sections[' + i + '][days][]"]:checked')).map(function (c) { return c.value; })
        };
      });
      if (secs.some(function (s) { return s.days.length !== 2; })) { old = v; return back({ error: 'Each section needs exactly 2 days.' }); }
      var c = { id: nextId(db.courses), course_code: v.course_code, course_name: v.course_name, credits: +v.credits, level: v.level, description: v.description || '' };
      db.courses.push(c);
      secs.forEach(function (s) { db.sections.push(Object.assign({ id: nextId(db.sections), course_id: c.id }, s)); });
      save(); back({ success: 'Course and sections added successfully!' });
    },
    'free-classrooms': function (v) { location.hash = '/free-classrooms' + (v.time_slot ? '?time_slot=' + encodeURIComponent(v.time_slot) : ''); }
  };

  document.addEventListener('submit', function (ev) {
    var form = ev.target, act = form.dataset.action;
    if (!act || !ACTIONS[act]) return;
    ev.preventDefault();
    var msg = form.dataset.confirm || (ev.submitter && ev.submitter.dataset.confirm);
    if (msg && !window.confirm(msg)) return;
    var modal = form.closest('.modal');
    if (modal && window.bootstrap) { var m = bootstrap.Modal.getInstance(modal); if (m) m.hide(); }
    ACTIONS[act](values(form), authUser(), form);
  });
  // onchange="this.form.submit()"
  document.addEventListener('change', function (ev) {
    if (ev.target.hasAttribute('data-autosubmit')) ev.target.form.requestSubmit();
  });

  /* ---------- demo bar ---------- */
  function demoBar() {
    var st = document.createElement('style');
    st.textContent = '.demo-bar{background:#0f172a;color:#e2e8f0;font:13px/1.45 system-ui,Segoe UI,sans-serif;padding:8px 14px;display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center}' +
      '.demo-bar b{color:#38bdf8;font-size:11px;letter-spacing:.08em}.demo-bar a{color:#f8fafc;background:#1e293b;padding:2px 9px;border-radius:999px;text-decoration:none;border:1px solid #334155}' +
      '.demo-bar a:hover{border-color:#38bdf8}.demo-bar button{margin-left:auto;border:1px solid #334155;background:#1e293b;color:#f1f5f9;border-radius:999px;padding:2px 10px;font:inherit;cursor:pointer}';
    document.head.appendChild(st);
    var bar = document.createElement('div');
    bar.className = 'demo-bar';
    bar.innerHTML = '<b>DEMO</b><span>Laravel app replayed in your browser. Sign in as:</span>' +
      '<a href="#" data-as="3">Student</a><a href="#" data-as="2">Faculty</a><a href="#" data-as="1">Admin</a>' +
      '<button type="button">Reset data</button>';
    bar.addEventListener('click', function (ev) {
      var a = ev.target.closest('[data-as]');
      if (a) { ev.preventDefault(); login(find(db.users, a.dataset.as)); redirect('/dashboard'); }
      if (ev.target.tagName === 'BUTTON') { localStorage.removeItem(KEY); logout(); db = load(); redirect('/login'); }
    });
    document.body.insertBefore(bar, document.body.firstChild);
  }

  db = load();
  demoBar();
  window.addEventListener('hashchange', render);
  render();
})();
