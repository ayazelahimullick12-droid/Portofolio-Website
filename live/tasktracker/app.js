/* TaskTracker, rendered in the browser for the portfolio.
   The original is Laravel 12 + Breeze + Tailwind + Alpine (github.com/ayaz-elahi/TaskTrackerProject).
   Views below are the Blade templates with their components (x-text-input,
   x-primary-button, x-dropdown, x-modal...) expanded to the markup they render;
   the controllers' rules are ported as written. app.css is compiled from the
   project's own tailwind.config.js. All data is sample data. */
(function () {
  'use strict';

  var KEY = 'tt_db_v1';
  var DAY = 864e5;

  function at(days, hour) { var d = new Date(Date.now() + days * DAY); d.setHours(hour, 0, 0, 0); return d.toISOString(); }
  function seed() {
    return {
      users: [
        { id: 1, name: 'Demo User', username: 'demo', email: 'demo@tasktracker.test', password: 'password', is_admin: false, security_question: 'pet_name', security_answer: 'tiger' },
        { id: 2, name: 'Nadia Islam', username: 'nadia', email: 'nadia@tasktracker.test', password: 'password', is_admin: false, security_question: 'city_birth', security_answer: 'dhaka' },
        { id: 3, name: 'Rafi Ahmed', username: 'rafi', email: 'rafi@tasktracker.test', password: 'password', is_admin: false, security_question: 'maiden_name', security_answer: 'rahman' },
        { id: 4, name: 'Admin', username: 'admin', email: 'admin@tasktracker.test', password: 'password', is_admin: true, security_question: '', security_answer: '' }
      ],
      projects: [
        { id: 1, name: 'Portfolio Website', description: 'Personal site with live project demos and a scroll-driven story.', owner_id: 1, members: [1, 2] },
        { id: 2, name: 'CSE471 Group Project', description: 'Sprint board for the course project: auth, tasks, projects and admin.', owner_id: 3, members: [3, 1] },
        { id: 3, name: 'Thesis Writing', description: 'Chapters, figures and the MEEGA+ evaluation write-up.', owner_id: 1, members: [1] }
      ],
      tasks: [
        { id: 1, user_id: 1, title: 'Design the hero section', description: 'Particle swarm, headline and the two call-to-action buttons.', deadline: at(2, 17), priority: 'high', status: 'in_progress', project_id: 1, assigned_to: null },
        { id: 2, user_id: 1, title: 'Write project case studies', description: 'One short story per project: problem, what I built, and the result.', deadline: at(5, 12), priority: 'medium', status: 'pending', project_id: 1, assigned_to: 2 },
        { id: 3, user_id: 1, title: 'Set up Laravel Breeze authentication', description: 'Install Breeze, publish the views and check the login and register flows.', deadline: null, priority: 'high', status: 'completed', project_id: 2, assigned_to: null },
        { id: 4, user_id: 1, title: 'Add username login', description: 'Let people sign in with either their email address or a username.', deadline: null, priority: 'medium', status: 'completed', project_id: 2, assigned_to: null },
        { id: 5, user_id: 1, title: 'Task create and list pages', description: 'Create form with priority and deadline, plus a filterable task list.', deadline: at(1, 23), priority: 'high', status: 'in_progress', project_id: 2, assigned_to: null },
        { id: 6, user_id: 1, title: 'Proofread chapter 4', description: 'Results chapter: tables, MEEGA+ scores and the discussion.', deadline: at(7, 10), priority: 'low', status: 'pending', project_id: 3, assigned_to: null },
        { id: 7, user_id: 1, title: 'Renew library card', description: '', deadline: null, priority: 'low', status: 'pending', project_id: null, assigned_to: null },
        { id: 8, user_id: 3, title: 'Projects and invitations', description: 'Owners invite members by email; members can leave.', deadline: at(3, 18), priority: 'high', status: 'in_progress', project_id: 2, assigned_to: 1 }
      ],
      invitations: []
    };
  }
  var db;
  function load() { try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.users) return s; } catch (e) {} var f = seed(); localStorage.setItem(KEY, JSON.stringify(f)); return f; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }
  function nextId(rows) { return rows.reduce(function (m, r) { return Math.max(m, r.id); }, 0) + 1; }
  function find(rows, id) { return rows.filter(function (r) { return r.id === +id; })[0]; }

  function me() { try { return find(db.users, sessionStorage.getItem('tt_user')); } catch (e) { return null; } }
  function signIn(u) { try { sessionStorage.setItem('tt_user', u.id); } catch (e) {} }
  function signOut() { try { sessionStorage.removeItem('tt_user'); } catch (e) {} }

  var status = null, errors = {}, old = {};
  function go(path, st) { status = st || null; if (location.hash === '#' + path) render(); else location.hash = path; }
  function fail(errs, input) { errors = errs; old = input || {}; render(); }

  // the views' <body> classes go on the #app wrapper, so the demo bar above it stays put
  function setBody(cls) { document.getElementById('app').className = cls; }
  function e(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ucfirst(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function limit(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n) + '...' : s; }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function fmt(iso, withTime) { var d = new Date(iso); return MON[d.getMonth()] + ' ' + pad(d.getDate()) + (withTime ? ', ' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) : ''); }
  function localInput(iso) { if (!iso) return ''; var d = new Date(iso); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }

  /* ---------- Blade components ---------- */
  var LOGO_PATH = 'M305.8 81.125C305.77 80.995 305.69 80.885 305.65 80.755C305.56 80.525 305.49 80.285 305.37 80.075C305.29 79.935 305.17 79.815 305.07 79.685C304.94 79.515 304.83 79.325 304.68 79.175C304.55 79.045 304.39 78.955 304.25 78.845C304.09 78.715 303.95 78.575 303.77 78.475L251.32 48.275C249.97 47.495 248.31 47.495 246.96 48.275L194.51 78.475C194.33 78.575 194.19 78.725 194.03 78.845C193.89 78.955 193.73 79.045 193.6 79.175C193.45 79.325 193.34 79.515 193.21 79.685C193.11 79.815 192.99 79.935 192.91 80.075C192.79 80.285 192.71 80.525 192.63 80.755C192.58 80.875 192.51 80.995 192.48 81.125C192.38 81.495 192.33 81.875 192.33 82.265V139.625L148.62 164.795V52.575C148.62 52.185 148.57 51.805 148.47 51.435C148.44 51.305 148.36 51.195 148.32 51.065C148.23 50.835 148.16 50.595 148.04 50.385C147.96 50.245 147.84 50.125 147.74 49.995C147.61 49.825 147.5 49.635 147.35 49.485C147.22 49.355 147.06 49.265 146.92 49.155C146.76 49.025 146.62 48.885 146.44 48.785L93.99 18.585C92.64 17.805 90.98 17.805 89.63 18.585L37.18 48.785C37 48.885 36.86 49.035 36.7 49.155C36.56 49.265 36.4 49.355 36.27 49.485C36.12 49.635 36.01 49.825 35.88 49.995C35.78 50.125 35.66 50.245 35.58 50.385C35.46 50.595 35.38 50.835 35.3 51.065C35.25 51.185 35.18 51.305 35.15 51.435C35.05 51.805 35 52.185 35 52.575V232.235C35 233.795 35.84 235.245 37.19 236.025L142.1 296.425C142.33 296.555 142.58 296.635 142.82 296.725C142.93 296.765 143.04 296.835 143.16 296.865C143.53 296.965 143.9 297.015 144.28 297.015C144.66 297.015 145.03 296.965 145.4 296.865C145.5 296.835 145.59 296.775 145.69 296.745C145.95 296.655 146.21 296.565 146.45 296.435L251.36 236.035C252.72 235.255 253.55 233.815 253.55 232.245V174.885L303.81 145.945C305.17 145.165 306 143.725 306 142.155V82.265C305.95 81.875 305.89 81.495 305.8 81.125ZM144.2 227.205L100.57 202.515L146.39 176.135L196.66 147.195L240.33 172.335L208.29 190.625L144.2 227.205ZM244.75 114.995V164.795L226.39 154.225L201.03 139.625V89.825L219.39 100.395L244.75 114.995ZM249.12 57.105L292.81 82.265L249.12 107.425L205.43 82.265L249.12 57.105ZM114.49 184.425L96.13 194.995V85.305L121.49 70.705L139.85 60.135V169.815L114.49 184.425ZM91.76 27.425L135.45 52.585L91.76 77.745L48.07 52.585L91.76 27.425ZM43.67 60.135L62.03 70.705L87.39 85.305V202.545V202.555V202.565C87.39 202.735 87.44 202.895 87.46 203.055C87.49 203.265 87.49 203.485 87.55 203.695V203.705C87.6 203.875 87.69 204.035 87.76 204.195C87.84 204.375 87.89 204.575 87.99 204.745C87.99 204.745 87.99 204.755 88 204.755C88.09 204.905 88.22 205.035 88.33 205.175C88.45 205.335 88.55 205.495 88.69 205.635L88.7 205.645C88.82 205.765 88.98 205.855 89.12 205.965C89.28 206.085 89.42 206.225 89.59 206.325C89.6 206.325 89.6 206.325 89.61 206.335C89.62 206.335 89.62 206.345 89.63 206.345L139.87 234.775V285.065L43.67 229.705V60.135ZM244.75 229.705L148.58 285.075V234.775L219.8 194.115L244.75 179.875V229.705ZM297.2 139.625L253.49 164.795V114.995L278.85 100.395L297.21 89.825V139.625H297.2Z';
  function logo(cls) { return `<svg viewBox="0 0 316 316" xmlns="http://www.w3.org/2000/svg" class="${cls}"><path d="${LOGO_PATH}"/></svg>`; }
  function label(forId, value, extra) { return `<label for="${forId}" class="block font-medium text-sm text-gray-700${extra ? ' ' + extra : ''}">${value}</label>`; }
  function input(attrs, cls) { return `<input ${attrs} class="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm${cls ? ' ' + cls : ''}">`; }
  function error(field, cls) { return errors[field] ? `<ul class="text-sm text-red-600 space-y-1 ${cls || 'mt-2'}"><li>${e(errors[field])}</li></ul>` : ''; }
  function primary(text, cls, attrs) { return `<button type="submit" class="inline-flex items-center px-4 py-2 bg-gray-800 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-gray-700 focus:bg-gray-700 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150${cls ? ' ' + cls : ''}" ${attrs || ''}>${text}</button>`; }
  function danger(text, cls, attrs) { return `<button type="submit" class="inline-flex items-center px-4 py-2 bg-red-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-red-500 active:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition ease-in-out duration-150${cls ? ' ' + cls : ''}" ${attrs || ''}>${text}</button>`; }
  function secondary(text, attrs) { return `<button type="button" class="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md font-semibold text-xs text-gray-700 uppercase tracking-widest shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-25 transition ease-in-out duration-150" ${attrs || ''}>${text}</button>`; }
  function sessionStatus(cls) { return status ? `<div class="font-medium text-sm text-green-600 ${cls}">${e(status)}</div>` : ''; }
  function navLink(href, active, text) {
    var c = active
      ? 'inline-flex items-center px-1 pt-1 border-b-2 border-indigo-400 text-sm font-medium leading-5 text-gray-900 focus:outline-none focus:border-indigo-700 transition duration-150 ease-in-out'
      : 'inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium leading-5 text-gray-500 hover:text-gray-700 hover:border-gray-300 focus:outline-none focus:text-gray-700 focus:border-gray-300 transition duration-150 ease-in-out';
    return `<a class="${c}" href="${href}">${text}</a>`;
  }
  function respLink(href, active, text, attrs) {
    var c = active
      ? 'block w-full ps-3 pe-4 py-2 border-l-4 border-indigo-400 text-start text-base font-medium text-indigo-700 bg-indigo-50 focus:outline-none focus:text-indigo-800 focus:bg-indigo-100 focus:border-indigo-700 transition duration-150 ease-in-out'
      : 'block w-full ps-3 pe-4 py-2 border-l-4 border-transparent text-start text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:text-gray-800 focus:bg-gray-50 focus:border-gray-300 transition duration-150 ease-in-out';
    return `<a class="${c}" href="${href}" ${attrs || ''}>${text}</a>`;
  }
  var SELECT = 'block mt-1 w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow-sm';
  function o(k, fallback) { return e(old[k] != null ? old[k] : (fallback == null ? '' : fallback)); }

  /* ---------- layouts ---------- */
  function guest(slot) {
    setBody('font-sans text-gray-900 antialiased');
    document.documentElement.classList.remove('dark');
    return `<div class="min-h-screen flex flex-col sm:justify-center items-center pt-6 sm:pt-0 bg-gray-100">
            <div>
                <a href="#/">${logo('w-20 h-20 fill-current text-gray-500')}</a>
            </div>
            <div class="w-full sm:max-w-md mt-6 px-6 py-4 bg-white shadow-md overflow-hidden sm:rounded-lg">${slot}</div>
        </div>`;
  }

  function navigation(u, route) {
    var dd = `<div class="relative" x-data="{ open: false }" @click.outside="open = false" @close.stop="open = false">
    <div @click="open = ! open">
        <button class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-white dark:bg-gray-800 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none transition ease-in-out duration-150">
            <div>${e(u.name)}</div>
            <div class="ms-1">
                <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
            </div>
        </button>
    </div>
    <div x-show="open"
            x-transition:enter="transition ease-out duration-200"
            x-transition:enter-start="opacity-0 scale-95"
            x-transition:enter-end="opacity-100 scale-100"
            x-transition:leave="transition ease-in duration-75"
            x-transition:leave-start="opacity-100 scale-100"
            x-transition:leave-end="opacity-0 scale-95"
            class="absolute z-50 mt-2 w-48 rounded-md shadow-lg ltr:origin-top-right rtl:origin-top-left end-0"
            style="display: none;"
            @click="open = false">
        <div class="rounded-md ring-1 ring-black ring-opacity-5 py-1 bg-white">
            <a class="block w-full px-4 py-2 text-start text-sm leading-5 text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 transition duration-150 ease-in-out" href="#/profile">Profile</a>
            <form method="POST" data-action="logout">
                <a class="block w-full px-4 py-2 text-start text-sm leading-5 text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 transition duration-150 ease-in-out" href="#/logout" onclick="event.preventDefault(); this.closest('form').requestSubmit();">Log Out</a>
            </form>
        </div>
    </div>
</div>`;
    return `<nav x-data="{ open: false }" class="bg-white border-b border-gray-100">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
            <div class="flex">
                <div class="shrink-0 flex items-center">
                    <a href="#/dashboard">${logo('block h-9 w-auto fill-current text-gray-800')}</a>
                </div>
                <div class="hidden space-x-8 sm:-my-px sm:ms-10 sm:flex">
                    ${navLink('#/dashboard', route === 'dashboard', 'Dashboard')}
                    ${navLink('#/projects', route.indexOf('projects') === 0, 'Projects')}
                    ${navLink('#/tasks', route.indexOf('tasks') === 0, 'Tasks')}
                </div>
            </div>
            <div class="hidden sm:flex sm:items-center sm:ms-6">
                <button
                    onclick="
                        if (localStorage.theme === 'dark') {
                            localStorage.theme = 'light';
                            document.documentElement.classList.remove('dark');
                        } else {
                            localStorage.theme = 'dark';
                            document.documentElement.classList.add('dark');
                        }
                    "
                    class="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
                    title="Toggle Dark Mode"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
                </button>
                ${dd}
            </div>
            <div class="-me-2 flex items-center sm:hidden">
                <button @click="open = ! open" class="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 focus:text-gray-500 transition duration-150 ease-in-out">
                    <svg class="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                        <path :class="{'hidden': open, 'inline-flex': ! open }" class="inline-flex" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                        <path :class="{'hidden': ! open, 'inline-flex': open }" class="hidden" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    </div>
    <div :class="{'block': open, 'hidden': ! open}" class="hidden sm:hidden">
        <div class="pt-2 pb-3 space-y-1">
            ${respLink('#/dashboard', route === 'dashboard', 'Dashboard')}
        </div>
        <div class="pt-4 pb-1 border-t border-gray-200">
            <div class="px-4">
                <div class="font-medium text-base text-gray-800">${e(u.name)}</div>
                <div class="font-medium text-sm text-gray-500">${e(u.email)}</div>
            </div>
            <div class="mt-3 space-y-1">
                ${respLink('#/profile', false, 'Profile')}
                <form method="POST" data-action="logout">
                    ${respLink('#/logout', false, 'Log Out', `onclick="event.preventDefault(); this.closest('form').requestSubmit();"`)}
                </form>
            </div>
        </div>
    </div>
</nav>`;
  }

  function app(u, route, header, slot) {
    setBody('font-sans antialiased h-full');
    // layouts/app.blade.php: <script> in <head> picks the theme
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    return `<div class="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
            ${navigation(u, route)}
            <header class="bg-white shadow">
                <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">${header}</div>
            </header>
            <main>${slot}</main>
        </div>`;
  }
  function h2(text) { return `<h2 class="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">${text}</h2>`; }

  /* ---------- relations ---------- */
  function projectsOf(u) {
    // $user->projects (pivot) merged with $user->ownedProjects
    return db.projects.filter(function (p) { return p.members.indexOf(u.id) > -1 || p.owner_id === u.id; });
  }
  function tasksOf(u) { return db.tasks.filter(function (t) { return t.user_id === u.id; }); }

  /* ---------- views ---------- */
  var V = {};

  V.welcome = function (u) {
    setBody('antialiased bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen flex flex-col justify-center items-center selection:bg-indigo-500 selection:text-white');
    document.documentElement.classList.remove('dark');
    return ['Task Tracker', `<div class="max-w-7xl mx-auto p-6 lg:p-8 text-center">
            <h1 class="text-5xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400 mb-6 animate-pulse">
                Task Tracker
            </h1>
            <p class="mt-4 text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-12">
                Stay organized, collaborate seamlessly, and track your progress with ease.
                The ultimate minimal tool for managing your personal and team projects.
            </p>
            <div class="flex justify-center gap-6">
                <nav class="flex gap-4">
                ${u ? `<a href="#/dashboard" class="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all duration-200 transform hover:scale-105">Go to Dashboard</a>`
                : `<a href="#/login" class="px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all duration-200">Log in</a>
                    <a href="#/register" class="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all duration-200 transform hover:scale-105">Register</a>`}
                </nav>
            </div>
            <div class="mt-16 text-sm text-gray-500 dark:text-gray-500">
                &copy; ${new Date().getFullYear()} Task Tracker. All rights reserved.
            </div>
        </div>`, true];
  };

  V.login = function () {
    return ['Laravel', guest(`${sessionStatus('mb-4')}
    <form method="POST" data-action="login">
        <div>
            ${label('login', 'Email or Username')}
            ${input(`id="login" type="text" name="login" value="${o('login')}" required autofocus autocomplete="username"`, 'block mt-1 w-full')}
            ${error('login')}
        </div>
        <div class="mt-4">
            ${label('password', 'Password')}
            ${input('id="password" type="password" name="password" required autocomplete="current-password"', 'block mt-1 w-full')}
            ${error('password')}
        </div>
        <div class="block mt-4">
            <label for="remember_me" class="inline-flex items-center">
                <input id="remember_me" type="checkbox" class="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500" name="remember">
                <span class="ms-2 text-sm text-gray-600">Remember me</span>
            </label>
        </div>
        <div class="flex items-center justify-end mt-4">
            <a class="underline text-sm text-gray-600 hover:text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" href="#/forgot-password">Forgot your password?</a>
            ${primary('Log in', 'ms-3')}
        </div>
    </form>`)];
  };

  V.register = function () {
    return ['Laravel', guest(`<form method="POST" data-action="register">
        <div>
            ${label('name', 'Name')}
            ${input(`id="name" type="text" name="name" value="${o('name')}" required autofocus autocomplete="name"`, 'block mt-1 w-full')}
            ${error('name')}
        </div>
        <div class="mt-4">
            ${label('username', 'Username')}
            ${input(`id="username" type="text" name="username" value="${o('username')}" required autocomplete="username"`, 'block mt-1 w-full')}
            ${error('username')}
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">Username can only contain letters, numbers, dashes and underscores.</p>
        </div>
        <div class="mt-4">
            ${label('email', 'Email')}
            ${input(`id="email" type="email" name="email" value="${o('email')}" required autocomplete="username"`, 'block mt-1 w-full')}
            ${error('email')}
        </div>
        <div class="mt-4">
            ${label('security_question', 'Security Question')}
            <select id="security_question" name="security_question" class="${SELECT}" required>
                <option value="" disabled selected>Select a question...</option>
                <option value="maiden_name">What is your mother's maiden name?</option>
                <option value="pet_name">What was the name of your first pet?</option>
                <option value="city_birth">What city were you born in?</option>
            </select>
            ${error('security_question')}
        </div>
        <div class="mt-4">
            ${label('security_answer', 'Answer')}
            ${input(`id="security_answer" type="text" name="security_answer" value="${o('security_answer')}" required`, 'block mt-1 w-full')}
            ${error('security_answer')}
        </div>
        <div class="mt-4">
            ${label('password', 'Password')}
            ${input('id="password" type="password" name="password" required autocomplete="new-password"', 'block mt-1 w-full')}
            ${error('password')}
        </div>
        <div class="mt-4">
            ${label('password_confirmation', 'Confirm Password')}
            ${input('id="password_confirmation" type="password" name="password_confirmation" required autocomplete="new-password"', 'block mt-1 w-full')}
            ${error('password_confirmation')}
        </div>
        <div class="flex items-center justify-end mt-4">
            <a class="underline text-sm text-gray-600 hover:text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" href="#/login">Already registered?</a>
            ${primary('Register', 'ms-4')}
        </div>
    </form>`)];
  };

  V.forgot = function () {
    return ['Laravel', guest(`<div class="mb-4 text-sm text-gray-600">
        Forgot your password? No problem. Just let us know your email address and we will email you a password reset link that will allow you to choose a new one.
    </div>
    ${sessionStatus('mb-4')}
    <form method="POST" data-action="forgot">
        <div>
            ${label('email', 'Email')}
            ${input(`id="email" type="email" name="email" value="${o('email')}" required autofocus`, 'block mt-1 w-full')}
            ${error('email')}
        </div>
        <div class="flex items-center justify-end mt-4">
            ${primary('Email Password Reset Link')}
        </div>
    </form>`)];
  };

  V.forgotSecurity = function () {
    return ['Laravel', guest(`<div class="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Forgot your password? No problem. Just let us know your email address and verify your security question to reset it.
    </div>
    ${sessionStatus('mb-4')}
    <form method="POST" data-action="forgot-security">
        <div>
            ${label('email', 'Email')}
            ${input(`id="email" type="email" name="email" value="${o('email')}" required autofocus`, 'block mt-1 w-full')}
            ${error('email')}
        </div>
        <div class="flex items-center justify-end mt-4">
            ${primary('Next')}
        </div>
    </form>`)];
  };

  V.resetSecurity = function (u, q) {
    var user = db.users.filter(function (x) { return x.email === q.email; })[0];
    if (!user) return V.notFound();
    var QUESTIONS = { maiden_name: "What is your mother's maiden name?", pet_name: 'What was the name of your first pet?', city_birth: 'What city were you born in?' };
    return ['Laravel', guest(`<div class="mb-4 text-center">
        <h2 class="text-xl font-bold text-gray-800 dark:text-gray-200">Security Check</h2>
    </div>
    <form method="POST" data-action="reset-security">
        <input type="hidden" name="email" value="${e(q.email)}">
        <div class="mb-4">
            <label class="block font-medium text-sm text-gray-700 dark:text-gray-300">
                Question: <span class="text-indigo-600 font-bold">${e(QUESTIONS[user.security_question] || user.security_question)}</span>
            </label>
        </div>
        <div class="mt-4">
            ${label('security_answer', 'Your Answer')}
            ${input('id="security_answer" type="text" name="security_answer" required autofocus', 'block mt-1 w-full')}
            ${error('security_answer')}
        </div>
        <div class="mt-4">
            ${label('password', 'New Password')}
            ${input('id="password" type="password" name="password" required autocomplete="new-password"', 'block mt-1 w-full')}
            ${error('password')}
        </div>
        <div class="mt-4">
            ${label('password_confirmation', 'Confirm Password')}
            ${input('id="password_confirmation" type="password" name="password_confirmation" required autocomplete="new-password"', 'block mt-1 w-full')}
            ${error('password_confirmation')}
        </div>
        <div class="flex items-center justify-end mt-4">
            ${primary('Reset Password')}
        </div>
    </form>`)];
  };

  V.adminLogin = function () {
    return ['Laravel', guest(`${sessionStatus('mb-4')}
    <form method="POST" data-action="admin-login">
        <div class="mb-6 text-center">
             <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Admin Login</h2>
             <p class="text-sm text-gray-600 dark:text-gray-400">Exclusive Access Only</p>
        </div>
        <div>
            ${label('email', 'Email')}
            ${input(`id="email" type="email" name="email" value="${o('email')}" required autofocus autocomplete="username"`, 'block mt-1 w-full')}
            ${error('email')}
        </div>
        <div class="mt-4">
            ${label('password', 'Password')}
            ${input('id="password" type="password" name="password" required autocomplete="current-password"', 'block mt-1 w-full')}
            ${error('password')}
        </div>
        <div class="flex items-center justify-end mt-4">
            ${primary('Enter Admin Panel', 'ms-3 bg-red-600 hover:bg-red-700')}
        </div>
    </form>`)];
  };

  V.dashboard = function (u) {
    var mine = tasksOf(u);
    function count(s) { return mine.filter(function (t) { return t.status === s; }).length; }
    var projectCount = db.projects.filter(function (p) { return p.members.indexOf(u.id) > -1; }).length + db.projects.filter(function (p) { return p.owner_id === u.id; }).length;
    function stat(title, value, border) {
      return `<div class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg p-6${border ? ' ' + border : ''}">
                    <div class="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">${title}</div>
                    <div class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">${value}</div>
                </div>`;
    }
    return ['Laravel', app(u, 'dashboard', h2('Dashboard'), `<div class="py-12">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                ${stat('Total Tasks', mine.length)}
                ${stat('Pending', count('pending'), 'border-l-4 border-yellow-500')}
                ${stat('In Progress', count('in_progress'), 'border-l-4 border-blue-500')}
                ${stat('Completed', count('completed'), 'border-l-4 border-green-500')}
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg p-6">
                     <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Active Projects</h3>
                     <div class="flex items-center justify-between">
                         <span class="text-gray-600 dark:text-gray-400">Total Projects</span>
                         <span class="text-2xl font-bold text-gray-900 dark:text-white">${projectCount}</span>
                     </div>
                     <div class="mt-4">
                         <a href="#/projects" class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 text-sm font-medium">View All Projects &rarr;</a>
                     </div>
                 </div>
                 <div class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg p-6 flex flex-col justify-center space-y-4">
                    <a href="#/tasks/create" class="w-full inline-flex justify-center items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700 focus:bg-indigo-700 active:bg-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition ease-in-out duration-150">
                        Create New Task
                    </a>
                    <a href="#/projects/create" class="w-full inline-flex justify-center items-center px-4 py-2 bg-gray-800 dark:bg-gray-200 border border-transparent rounded-md font-semibold text-xs text-white dark:text-gray-800 uppercase tracking-widest hover:bg-gray-700 dark:hover:bg-white focus:bg-gray-700 dark:focus:bg-white active:bg-gray-900 dark:active:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition ease-in-out duration-150">
                        Start New Project
                    </a>
                 </div>
            </div>
        </div>
    </div>`)];
  };

  V.tasks = function (u, q) {
    var list = tasksOf(u).slice();
    // ->orderBy('deadline', 'asc')->orderBy('priority', 'desc'): NULL deadlines first, priority sorted as text
    list.sort(function (a, b) {
      var da = a.deadline ? Date.parse(a.deadline) : -Infinity, dbb = b.deadline ? Date.parse(b.deadline) : -Infinity;
      if (da !== dbb) return da - dbb;
      return a.priority < b.priority ? 1 : a.priority > b.priority ? -1 : 0;
    });
    if (q.priority) list = list.filter(function (t) { return t.priority === q.priority; });
    if (q.status) list = list.filter(function (t) { return t.status === q.status; });
    if (q.search) { var s = q.search.toLowerCase(); list = list.filter(function (t) { return (t.title + ' ' + (t.description || '')).toLowerCase().indexOf(s) > -1; }); }
    var PRI = { high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
    function opt(v, cur, text) { return `<option value="${v}"${cur === v ? ' selected' : ''}>${text}</option>`; }
    var rows = list.map(function (t) {
      var p = t.project_id && find(db.projects, t.project_id), a = t.assigned_to && find(db.users, t.assigned_to);
      var done = t.status === 'completed';
      return `<div class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between hover:shadow-md transition-shadow">
                            <div class="flex-1">
                                <div class="flex items-center gap-3 mb-2">
                                    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">${e(t.title)}</h3>
                                    <span class="px-2 py-1 text-xs rounded-full ${PRI[t.priority]}">${ucfirst(t.priority)}</span>
                                    ${p ? `<span class="px-2 py-1 text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-md">${e(p.name)}</span>` : ''}
                                </div>
                                <p class="text-gray-600 dark:text-gray-400 text-sm mb-2">${e(limit(t.description, 100))}</p>
                                <div class="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                                    ${t.deadline ? `<span class="flex items-center gap-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>${fmt(t.deadline, true)}</span>` : ''}
                                    ${a && a.id !== u.id ? `<span class="flex items-center gap-1" title="Assigned to ${e(a.name)}"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>${e(a.name)}</span>` : ''}
                                </div>
                            </div>
                            <div class="flex items-center gap-2 mt-4 md:mt-0">
                                <a href="#/tasks/${t.id}/edit" class="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                </a>
                                <form method="POST" data-action="delete-task" data-id="${t.id}" data-confirm="Are you sure?">
                                    <button type="submit" class="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                </form>
                                <form method="POST" data-action="toggle-task" data-id="${t.id}">
                                    <button type="submit" class="${done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'} px-3 py-1 rounded-md text-sm font-medium hover:opacity-80 transition-opacity">
                                        ${done ? 'Completed' : 'Mark Complete'}
                                    </button>
                                </form>
                            </div>
                        </div>`;
    }).join('');
    return ['Laravel', app(u, 'tasks.index', h2('My Tasks'), `<div class="py-12">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div class="bg-white dark:bg-gray-800 shadow-sm sm:rounded-lg p-4 mb-6">
                <form method="GET" data-action="filter-tasks" class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="col-span-1 md:col-span-2">
                        ${input(`id="search" name="search" type="text" placeholder="Search tasks..." value="${e(q.search || '')}"`, 'w-full')}
                    </div>
                    <div>
                        <select name="status" class="w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow-sm" data-autosubmit>
                            <option value="">All Statuses</option>${opt('pending', q.status, 'Pending')}${opt('in_progress', q.status, 'In Progress')}${opt('completed', q.status, 'Completed')}
                        </select>
                    </div>
                    <div>
                        <select name="priority" class="w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow-sm" data-autosubmit>
                            <option value="">All Priorities</option>${opt('high', q.priority, 'High')}${opt('medium', q.priority, 'Medium')}${opt('low', q.priority, 'Low')}
                        </select>
                    </div>
                </form>
            </div>
            ${list.length ? `<div class="space-y-4">${rows}</div>` : `<div class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg p-6 text-center text-gray-500 dark:text-gray-400">No tasks found.</div>`}
        </div>
    </div>`)];
  };

  function textarea(name, value) { return `<textarea id="${name}" name="${name}" rows="4" class="block mt-1 w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-600 rounded-md shadow-sm">${value}</textarea>`; }
  function cancel(href) { return `<a href="${href}" class="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Cancel</a>`; }
  function formCard(slot) {
    return `<div class="py-12">
        <div class="max-w-3xl mx-auto sm:px-6 lg:px-8">
            <div class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                <div class="p-6">${slot}</div>
            </div>
        </div>
    </div>`;
  }

  V.taskCreate = function (u) {
    var projects = projectsOf(u);
    var users = [];
    projects.forEach(function (p) { p.members.forEach(function (id) { if (users.indexOf(id) === -1) users.push(id); }); });
    var pri = old.priority || 'medium';
    return ['Laravel', app(u, 'tasks.create', h2('Create New Task'), formCard(`<form method="POST" data-action="store-task">
                        <div class="mb-4">
                            ${label('title', 'Task Title')}
                            ${input(`id="title" type="text" name="title" value="${o('title')}" required autofocus`, 'block mt-1 w-full')}
                            ${error('title')}
                        </div>
                        <div class="mb-4">
                            ${label('description', 'Description')}
                            ${textarea('description', o('description'))}
                            ${error('description')}
                        </div>
                        <div class="mb-4">
                            ${label('deadline', 'Deadline (Optional)')}
                            ${input(`id="deadline" type="datetime-local" name="deadline" value="${o('deadline')}"`, 'block mt-1 w-full')}
                            ${error('deadline')}
                        </div>
                        <div class="mb-4">
                            ${label('priority', 'Priority')}
                            <select id="priority" name="priority" class="${SELECT}" required>
                                <option value="low"${pri === 'low' ? ' selected' : ''}>Low</option>
                                <option value="medium"${pri === 'medium' ? ' selected' : ''}>Medium</option>
                                <option value="high"${pri === 'high' ? ' selected' : ''}>High</option>
                            </select>
                            ${error('priority')}
                        </div>
                         <div class="mb-4">
                            ${label('project_id', 'Project (Optional)')}
                            <select id="project_id" name="project_id" class="${SELECT}">
                                <option value="">None</option>
                                ${projects.map(function (p) { return `<option value="${p.id}"${+old.project_id === p.id ? ' selected' : ''}>${e(p.name)}</option>`; }).join('')}
                            </select>
                            ${error('project_id')}
                        </div>
                        <div class="mb-4">
                            ${label('assigned_to', 'Assign To (Optional)')}
                            <select id="assigned_to" name="assigned_to" class="${SELECT}">
                                <option value="">Unassigned</option>
                                ${users.filter(function (id) { return id !== u.id; }).map(function (id) { var x = find(db.users, id); return `<option value="${x.id}">${e(x.name)} (${e(x.email)})</option>`; }).join('')}
                            </select>
                            <p class="text-xs text-gray-500 mt-1">Note: User must be a member of the selected project.</p>
                            ${error('assigned_to')}
                        </div>
                        <div class="flex items-center justify-end mt-6 space-x-4">
                            ${cancel('#/tasks')}
                            ${primary('Create Task')}
                        </div>
                    </form>`))];
  };

  V.taskEdit = function (u, q, id) {
    var t = find(db.tasks, id);
    if (!t || t.user_id !== u.id) return V.forbidden(u);
    var p = t.project_id && find(db.projects, t.project_id);
    var pri = old.priority || t.priority, st = old.status || t.status;
    return ['Laravel', app(u, 'tasks.edit', h2('Edit Task'), formCard(`<form method="POST" data-action="update-task" data-id="${t.id}">
                        <div class="mb-4">
                            ${label('title', 'Task Title')}
                            ${input(`id="title" type="text" name="title" value="${o('title', t.title)}" required autofocus`, 'block mt-1 w-full')}
                            ${error('title')}
                        </div>
                        <div class="mb-4">
                            ${label('description', 'Description')}
                            ${textarea('description', o('description', t.description))}
                            ${error('description')}
                        </div>
                        <div class="mb-4">
                            ${label('deadline', 'Deadline (Optional)')}
                            ${input(`id="deadline" type="datetime-local" name="deadline" value="${o('deadline', localInput(t.deadline))}"`, 'block mt-1 w-full')}
                            ${error('deadline')}
                        </div>
                        <div class="mb-4">
                            ${label('priority', 'Priority')}
                            <select id="priority" name="priority" class="${SELECT}" required>
                                <option value="low"${pri === 'low' ? ' selected' : ''}>Low</option>
                                <option value="medium"${pri === 'medium' ? ' selected' : ''}>Medium</option>
                                <option value="high"${pri === 'high' ? ' selected' : ''}>High</option>
                            </select>
                            ${error('priority')}
                        </div>
                        <div class="mb-4">
                            ${label('status', 'Status')}
                            <select id="status" name="status" class="${SELECT}" required>
                                <option value="pending"${st === 'pending' ? ' selected' : ''}>Pending</option>
                                <option value="in_progress"${st === 'in_progress' ? ' selected' : ''}>In Progress</option>
                                <option value="completed"${st === 'completed' ? ' selected' : ''}>Completed</option>
                            </select>
                            ${error('status')}
                        </div>
                        ${p ? `<div class="mb-4">
                                ${label('assigned_to', 'Assign To (Project Member)')}
                                <select id="assigned_to" name="assigned_to" class="${SELECT}">
                                    <option value="">Unassigned</option>
                                    ${p.members.map(function (mid) { var m = find(db.users, mid); return `<option value="${m.id}"${t.assigned_to === m.id ? ' selected' : ''}>${e(m.name)} (${e(m.email)})</option>`; }).join('')}
                                </select>
                                ${error('assigned_to')}
                            </div>`
                        : `<div class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                This task is not linked to a project. To assign it to others, add it to a project first.
                             </div>`}
                        <div class="flex items-center justify-end mt-6 space-x-4">
                            ${cancel('#/tasks')}
                            ${primary('Update Task')}
                        </div>
                    </form>`))];
  };

  V.projects = function (u) {
    var all = projectsOf(u);
    var cards = all.map(function (p) {
      var owner = p.owner_id === u.id;
      return `<div class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg hover:shadow-md transition-shadow">
                            <div class="p-6">
                                <div class="flex justify-between items-start mb-4">
                                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate" title="${e(p.name)}">
                                        <a href="#/projects/${p.id}" class="hover:underline">${e(p.name)}</a>
                                    </h3>
                                    ${owner ? '<span class="px-2 py-1 text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 rounded-full">Owner</span>'
                                            : '<span class="px-2 py-1 text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded-full">Member</span>'}
                                </div>
                                <p class="text-gray-600 dark:text-gray-400 text-sm mb-4 h-10 overflow-hidden text-ellipsis">${e(limit(p.description, 80)) || 'No description.'}</p>
                                <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <div class="flex items-center gap-1">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                                        ${p.members.length} Members
                                    </div>
                                    <div class="flex items-center gap-1">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                                        ${db.tasks.filter(function (t) { return t.project_id === p.id; }).length} Tasks
                                    </div>
                                </div>
                            </div>
                        </div>`;
    }).join('');
    return ['Laravel', app(u, 'projects.index', `<div class="flex justify-between items-center">
            ${h2('Projects')}
            <a href="#/projects/create" class="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700 focus:bg-indigo-700 active:bg-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition ease-in-out duration-150">New Project</a>
        </div>`, `<div class="py-12">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
            ${all.length ? `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">${cards}</div>`
              : `<div class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg p-6 text-center text-gray-500 dark:text-gray-400">You don't have any projects yet. Start one to collaborate!</div>`}
        </div>
    </div>`)];
  };

  V.projectShow = function (u, q, id) {
    var p = find(db.projects, id);
    if (!p || (p.members.indexOf(u.id) === -1 && p.owner_id !== u.id)) return V.forbidden(u);
    var owner = p.owner_id === u.id;
    var tasks = db.tasks.filter(function (t) { return t.project_id === p.id; });
    return ['Laravel', app(u, 'projects.show', `<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h2 class="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight flex items-center gap-2">
                    ${e(p.name)}
                    <span class="text-sm font-normal text-gray-500 dark:text-gray-400">(${owner ? 'Owner' : 'Member'})</span>
                </h2>
                <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">${e(p.description)}</p>
            </div>
            <div class="flex items-center gap-2">
                ${owner ? `<a href="#/projects/${p.id}/edit" class="inline-flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 border border-transparent rounded-md font-semibold text-xs text-gray-800 dark:text-white uppercase tracking-widest hover:bg-gray-300 dark:hover:bg-gray-600 transition ease-in-out duration-150">Settings</a>`
                : `<form method="POST" data-action="leave-project" data-id="${p.id}" data-confirm="Are you sure you want to leave this project?">
                        <button type="submit" class="inline-flex items-center px-4 py-2 bg-red-100 dark:bg-red-900 border border-transparent rounded-md font-semibold text-xs text-red-800 dark:text-red-200 uppercase tracking-widest hover:bg-red-200 dark:hover:bg-red-800 transition ease-in-out duration-150">Leave Project</button>
                    </form>`}
            </div>
        </div>`, `<div class="py-12">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
            <div class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-lg font-medium text-gray-900 dark:text-white">Tasks</h3>
                        <a href="#/tasks/create" class="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">Add Task (Select Project manually)</a>
                    </div>
                    ${tasks.length ? `<ul class="divide-y divide-gray-100 dark:divide-gray-700">${tasks.map(function (t) {
                      var a = t.assigned_to && find(db.users, t.assigned_to);
                      return `<li class="py-3 flex justify-between items-center">
                                    <div>
                                        <a href="${t.user_id === u.id ? '#/tasks/' + t.id + '/edit' : '#/projects/' + p.id}" class="text-gray-800 dark:text-gray-200 hover:underline font-medium">${e(t.title)}</a>
                                        <div class="flex gap-2 text-xs mt-1">
                                            <span class="px-2 py-0.5 rounded-full ${t.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">${ucfirst(t.status.replace('_', ' '))}</span>
                                            ${a ? `<span class="text-gray-500">Assigned: ${e(a.name)}</span>` : ''}
                                        </div>
                                    </div>
                                    <span class="text-xs text-gray-400">${t.deadline ? fmt(t.deadline) : ''}</span>
                                </li>`;
                    }).join('')}</ul>` : '<p class="text-gray-500 dark:text-gray-400 text-sm italic">No tasks yet.</p>'}
                </div>
            </div>
            <div class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-lg font-medium text-gray-900 dark:text-white">Members</h3>
                        ${owner ? `<form method="POST" data-action="invite" data-id="${p.id}" class="flex gap-2">
                                <input type="email" name="email" placeholder="Invite by email..." class="text-sm border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-md focus:border-indigo-500 focus:ring-indigo-500" required>
                                <button type="submit" class="px-3 py-1 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700">Invite</button>
                            </form>` : ''}
                    </div>
                    <ul class="divide-y divide-gray-100 dark:divide-gray-700">${p.members.map(function (mid) {
                      var m = find(db.users, mid);
                      if (!m) return '';
                      return `<li class="py-3 flex justify-between items-center">
                                <div class="flex items-center gap-3">
                                    <div class="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold">${e(m.name.charAt(0))}</div>
                                    <div>
                                        <div class="text-gray-800 dark:text-gray-200 font-medium">${e(m.name)}</div>
                                        <div class="text-xs text-gray-500">${e(m.email)}</div>
                                    </div>
                                    ${m.id === p.owner_id ? '<span class="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full ml-2">Owner</span>' : ''}
                                </div>
                                ${owner && m.id !== u.id ? `<form method="POST" data-action="remove-member" data-id="${p.id}" data-user="${m.id}" data-confirm="Remove this member?"><button type="submit" class="text-red-500 hover:text-red-700 text-sm font-medium">Remove</button></form>` : ''}
                            </li>`;
                    }).join('')}</ul>
                </div>
            </div>
        </div>
    </div>`)];
  };

  V.projectCreate = function (u) {
    return ['Laravel', app(u, 'projects.create', h2('Create New Project'), formCard(`<form method="POST" data-action="store-project">
                        <div class="mb-4">
                            ${label('name', 'Project Name')}
                            ${input(`id="name" type="text" name="name" value="${o('name')}" required autofocus`, 'block mt-1 w-full')}
                            ${error('name')}
                        </div>
                        <div class="mb-4">
                            ${label('description', 'Description')}
                            ${textarea('description', o('description'))}
                            ${error('description')}
                        </div>
                        <div class="flex items-center justify-end mt-6 space-x-4">
                            ${cancel('#/projects')}
                            ${primary('Create Project')}
                        </div>
                    </form>`))];
  };

  V.projectEdit = function (u, q, id) {
    var p = find(db.projects, id);
    if (!p || p.owner_id !== u.id) return V.forbidden(u);
    return ['Laravel', app(u, 'projects.edit', h2('Edit Project'), formCard(`<form method="POST" data-action="update-project" data-id="${p.id}">
                        <div class="mb-4">
                            ${label('name', 'Project Name')}
                            ${input(`id="name" type="text" name="name" value="${o('name', p.name)}" required autofocus`, 'block mt-1 w-full')}
                            ${error('name')}
                        </div>
                        <div class="mb-4">
                            ${label('description', 'Description')}
                            ${textarea('description', o('description', p.description))}
                            ${error('description')}
                        </div>
                        <div class="flex items-center justify-end mt-6 space-x-4">
                            ${cancel('#/projects/' + p.id)}
                            ${primary('Update Project')}
                        </div>
                    </form>`))];
  };

  V.profile = function (u) {
    function saved(key) { return status === key ? `<p x-data="{ show: true }" x-show="show" x-transition x-init="setTimeout(() => show = false, 2000)" class="text-sm text-gray-600">Saved.</p>` : ''; }
    var showDelete = !!errors.userDeletion;
    return ['Laravel', app(u, 'profile.edit', '<h2 class="font-semibold text-xl text-gray-800 leading-tight">Profile</h2>', `<div class="py-12">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
            <div class="p-4 sm:p-8 bg-white shadow sm:rounded-lg">
                <div class="max-w-xl">
<section>
    <header>
        <h2 class="text-lg font-medium text-gray-900">Profile Information</h2>
        <p class="mt-1 text-sm text-gray-600">Update your account's profile information and email address.</p>
    </header>
    <form method="post" data-action="update-profile" class="mt-6 space-y-6">
        <div>
            ${label('name', 'Name')}
            ${input(`id="name" name="name" type="text" value="${o('name', u.name)}" required autofocus autocomplete="name"`, 'mt-1 block w-full')}
            ${error('name')}
        </div>
        <div>
            ${label('email', 'Email')}
            ${input(`id="email" name="email" type="email" value="${o('email', u.email)}" required autocomplete="username"`, 'mt-1 block w-full')}
            ${error('email')}
        </div>
        <div class="flex items-center gap-4">
            ${primary('Save')}
            ${saved('profile-updated')}
        </div>
    </form>
</section>
                </div>
            </div>
            <div class="p-4 sm:p-8 bg-white shadow sm:rounded-lg">
                <div class="max-w-xl">
<section>
    <header>
        <h2 class="text-lg font-medium text-gray-900">Update Password</h2>
        <p class="mt-1 text-sm text-gray-600">Ensure your account is using a long, random password to stay secure.</p>
    </header>
    <form method="post" data-action="update-password" class="mt-6 space-y-6">
        <div>
            ${label('update_password_current_password', 'Current Password')}
            ${input('id="update_password_current_password" name="current_password" type="password" autocomplete="current-password"', 'mt-1 block w-full')}
            ${error('current_password')}
        </div>
        <div>
            ${label('update_password_password', 'New Password')}
            ${input('id="update_password_password" name="password" type="password" autocomplete="new-password"', 'mt-1 block w-full')}
            ${error('new_password')}
        </div>
        <div>
            ${label('update_password_password_confirmation', 'Confirm Password')}
            ${input('id="update_password_password_confirmation" name="password_confirmation" type="password" autocomplete="new-password"', 'mt-1 block w-full')}
            ${error('password_confirmation')}
        </div>
        <div class="flex items-center gap-4">
            ${primary('Save')}
            ${saved('password-updated')}
        </div>
    </form>
</section>
                </div>
            </div>
            <div class="p-4 sm:p-8 bg-white shadow sm:rounded-lg">
                <div class="max-w-xl">
<section class="space-y-6">
    <header>
        <h2 class="text-lg font-medium text-gray-900">Delete Account</h2>
        <p class="mt-1 text-sm text-gray-600">Once your account is deleted, all of its resources and data will be permanently deleted. Before deleting your account, please download any data or information that you wish to retain.</p>
    </header>
    <button type="submit" class="inline-flex items-center px-4 py-2 bg-red-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-red-500 active:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition ease-in-out duration-150" x-data="" x-on:click.prevent="$dispatch('open-modal', 'confirm-user-deletion')">Delete Account</button>
    <div
        x-data="{
            show: ${showDelete},
            focusables() {
                let selector = 'a, button, input:not([type=\\'hidden\\']), textarea, select, details, [tabindex]:not([tabindex=\\'-1\\'])'
                return [...$el.querySelectorAll(selector)].filter(el => ! el.hasAttribute('disabled'))
            },
            firstFocusable() { return this.focusables()[0] },
            lastFocusable() { return this.focusables().slice(-1)[0] },
            nextFocusable() { return this.focusables()[this.nextFocusableIndex()] || this.firstFocusable() },
            prevFocusable() { return this.focusables()[this.prevFocusableIndex()] || this.lastFocusable() },
            nextFocusableIndex() { return (this.focusables().indexOf(document.activeElement) + 1) % (this.focusables().length + 1) },
            prevFocusableIndex() { return Math.max(0, this.focusables().indexOf(document.activeElement)) -1 },
        }"
        x-init="$watch('show', value => {
            if (value) {
                document.body.classList.add('overflow-y-hidden');
                setTimeout(() => firstFocusable().focus(), 100)
            } else {
                document.body.classList.remove('overflow-y-hidden');
            }
        })"
        x-on:open-modal.window="$event.detail == 'confirm-user-deletion' ? show = true : null"
        x-on:close-modal.window="$event.detail == 'confirm-user-deletion' ? show = false : null"
        x-on:close.stop="show = false"
        x-on:keydown.escape.window="show = false"
        x-on:keydown.tab.prevent="$event.shiftKey || nextFocusable().focus()"
        x-on:keydown.shift.tab.prevent="prevFocusable().focus()"
        x-show="show"
        class="fixed inset-0 overflow-y-auto px-4 py-6 sm:px-0 z-50"
        style="display: ${showDelete ? 'block' : 'none'};"
    >
        <div x-show="show" class="fixed inset-0 transform transition-all" x-on:click="show = false"
            x-transition:enter="ease-out duration-300" x-transition:enter-start="opacity-0" x-transition:enter-end="opacity-100"
            x-transition:leave="ease-in duration-200" x-transition:leave-start="opacity-100" x-transition:leave-end="opacity-0">
            <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <div x-show="show" class="mb-6 bg-white rounded-lg overflow-hidden shadow-xl transform transition-all sm:w-full sm:max-w-2xl sm:mx-auto"
            x-transition:enter="ease-out duration-300" x-transition:enter-start="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" x-transition:enter-end="opacity-100 translate-y-0 sm:scale-100"
            x-transition:leave="ease-in duration-200" x-transition:leave-start="opacity-100 translate-y-0 sm:scale-100" x-transition:leave-end="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            <form method="post" data-action="delete-account" class="p-6">
                <h2 class="text-lg font-medium text-gray-900">Are you sure you want to delete your account?</h2>
                <p class="mt-1 text-sm text-gray-600">Once your account is deleted, all of its resources and data will be permanently deleted. Please enter your password to confirm you would like to permanently delete your account.</p>
                <div class="mt-6">
                    ${label('password', 'Password', 'sr-only')}
                    ${input('id="password" name="password" type="password" placeholder="Password"', 'mt-1 block w-3/4')}
                    ${error('userDeletion')}
                </div>
                <div class="mt-6 flex justify-end">
                    ${secondary('Cancel', 'x-on:click="$dispatch(\'close\')"')}
                    ${danger('Delete Account', 'ms-3')}
                </div>
            </form>
        </div>
    </div>
</section>
                </div>
            </div>
        </div>
    </div>`)];
  };

  V.admin = function (u) {
    function th(t, right) { return `<th class="px-6 py-3 bg-gray-50 dark:bg-gray-700 ${right ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">${t}</th>`; }
    return ['Laravel', app(u, 'admin.dashboard', h2('Admin Dashboard'), `<div class="py-12">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
            <div class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                <div class="p-6">
                    <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Users</h3>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead><tr>${th('Name')}${th('Email')}${th('Actions', true)}</tr></thead>
                            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                ${db.users.map(function (x) {
                                  return `<tr>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">${e(x.name)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${e(x.email)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">${!x.is_admin
                                          ? `<form method="POST" data-action="admin-delete-user" data-id="${x.id}" data-confirm="Delete this user?"><button class="text-red-600 hover:text-red-900">Delete</button></form>`
                                          : '<span class="text-gray-400">Admin</span>'}</td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                <div class="p-6">
                    <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Projects</h3>
                     <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead><tr>${th('Name')}${th('Owner')}${th('Actions', true)}</tr></thead>
                            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                ${db.projects.map(function (p) {
                                  var ow = find(db.users, p.owner_id);
                                  return `<tr>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">${e(p.name)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${e(ow ? ow.name : '')}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><form method="POST" data-action="admin-delete-project" data-id="${p.id}" data-confirm="Delete this project?"><button class="text-red-600 hover:text-red-900">Delete</button></form></td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                </div>
            </div>
            <div class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                <div class="p-6">
                    <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Tasks</h3>
                     <ul class="divide-y divide-gray-200 dark:divide-gray-700">
                        ${db.tasks.slice(0, 10).map(function (t) {
                          return `<li class="py-3 flex justify-between">
                                <span class="text-gray-800 dark:text-gray-200">${e(t.title)}</span>
                                <form method="POST" data-action="admin-delete-task" data-id="${t.id}" data-confirm="Delete this task?"><button class="text-red-600 hover:text-red-900 text-sm">Delete</button></form>
                            </li>`;
                        }).join('')}
                     </ul>
                </div>
            </div>
        </div>
    </div>`)];
  };

  V.forbidden = function () {
    setBody('antialiased');
    document.documentElement.classList.remove('dark');
    return ['Forbidden', `<div class="relative flex items-top justify-center min-h-screen bg-gray-100 sm:items-center sm:pt-0"><div class="max-w-xl mx-auto sm:px-6 lg:px-8"><div class="flex items-center pt-8 sm:justify-start sm:pt-0"><div class="px-4 text-lg text-gray-500 border-r border-gray-400 tracking-wider">403</div><div class="ml-4 text-lg text-gray-500 uppercase tracking-wider">This action is unauthorized.</div></div></div></div>`, true];
  };
  V.notFound = function () {
    setBody('antialiased');
    return ['Not Found', `<div class="relative flex items-top justify-center min-h-screen bg-gray-100 sm:items-center sm:pt-0"><div class="max-w-xl mx-auto sm:px-6 lg:px-8"><div class="flex items-center pt-8 sm:justify-start sm:pt-0"><div class="px-4 text-lg text-gray-500 border-r border-gray-400 tracking-wider">404</div><div class="ml-4 text-lg text-gray-500 uppercase tracking-wider">Not Found</div></div></div></div>`, true];
  };

  /* ---------- routes (routes/web.php, routes/auth.php) ---------- */
  var ROUTES = [
    [/^\/$/, 'welcome'],
    [/^\/login$/, 'login', 'guest'], [/^\/register$/, 'register', 'guest'], [/^\/forgot-password$/, 'forgot', 'guest'],
    [/^\/forgot-password-security$/, 'forgotSecurity', 'guest'], [/^\/reset-password-security$/, 'resetSecurity', 'guest'],
    [/^\/admin\/login$/, 'adminLogin'],
    [/^\/admin$/, 'admin', 'admin'],
    [/^\/dashboard$/, 'dashboard', 'auth'], [/^\/profile$/, 'profile', 'auth'],
    [/^\/tasks$/, 'tasks', 'auth'], [/^\/tasks\/create$/, 'taskCreate', 'auth'], [/^\/tasks\/(\d+)\/edit$/, 'taskEdit', 'auth'],
    [/^\/projects$/, 'projects', 'auth'], [/^\/projects\/create$/, 'projectCreate', 'auth'], [/^\/projects\/(\d+)$/, 'projectShow', 'auth'], [/^\/projects\/(\d+)\/edit$/, 'projectEdit', 'auth']
  ];

  function parse() {
    var h = location.hash.replace(/^#/, '') || '/', parts = h.split('?'), q = {};
    (parts[1] || '').split('&').forEach(function (kv) { if (kv) { var p = kv.split('='); q[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' ')); } });
    return { path: parts[0], q: q };
  }

  function render() {
    var r = parse(), u = me(), out;
    var match = null;
    ROUTES.some(function (rt) { var m = r.path.match(rt[0]); if (m) { match = [rt, m]; return true; } return false; });
    if (!match) out = V.notFound();
    else {
      var rt = match[0], guard = rt[2];
      if ((guard === 'auth' || guard === 'admin') && !u) { location.replace('#/login'); return; }
      if (guard === 'guest' && u) { location.replace('#/dashboard'); return; }
      if (guard === 'admin' && !u.is_admin) out = V.forbidden(u);
      else out = V[rt[1]](u, r.q, match[1][1]);
    }
    document.title = out[0];
    document.getElementById('app').innerHTML = out[1];
    status = null; errors = {}; old = {};
    window.scrollTo(0, 0);
  }

  /* ---------- controllers ---------- */
  function values(form) { var v = {}; new FormData(form).forEach(function (val, k) { v[k] = val; }); return v; }
  var A = {
    login: function (v) {
      var key = /@/.test(v.login) ? 'email' : 'username';
      var u = db.users.filter(function (x) { return String(x[key]).toLowerCase() === String(v.login).trim().toLowerCase(); })[0];
      if (!u || u.password !== v.password) return fail({ login: 'These credentials do not match our records.' }, { login: v.login });
      signIn(u); go('/dashboard');
    },
    register: function (v) {
      var errs = {};
      if (!/^[A-Za-z0-9_-]+$/.test(v.username)) errs.username = 'The username field must only contain letters, numbers, dashes, and underscores.';
      else if (db.users.some(function (x) { return x.username.toLowerCase() === v.username.toLowerCase(); })) errs.username = 'The username has already been taken.';
      if (db.users.some(function (x) { return x.email.toLowerCase() === v.email.toLowerCase(); })) errs.email = 'The email has already been taken.';
      if (v.password.length < 8) errs.password = 'The password field must be at least 8 characters.';
      else if (v.password !== v.password_confirmation) errs.password = 'The password field confirmation does not match.';
      if (Object.keys(errs).length) return fail(errs, v);
      var u = { id: nextId(db.users), name: v.name, username: v.username, email: v.email, password: v.password, is_admin: false, security_question: v.security_question, security_answer: v.security_answer };
      db.users.push(u); save(); signIn(u); go('/dashboard');
    },
    logout: function () { signOut(); go('/'); },
    forgot: function (v) {
      if (!db.users.some(function (x) { return x.email.toLowerCase() === v.email.toLowerCase(); })) return fail({ email: "We can't find a user with that email address." }, v);
      old = v; go('/forgot-password', 'We have emailed your password reset link.');
    },
    'forgot-security': function (v) {
      var u = db.users.filter(function (x) { return x.email.toLowerCase() === v.email.toLowerCase(); })[0];
      if (!u) return fail({ email: 'The selected email is invalid.' }, v);
      if (!u.security_question) return fail({ email: 'This account does not have a security question set up.' }, v);
      go('/reset-password-security?email=' + encodeURIComponent(u.email));
    },
    'reset-security': function (v) {
      var u = db.users.filter(function (x) { return x.email === v.email; })[0];
      if (v.password.length < 8) return fail({ password: 'The password field must be at least 8 characters.' });
      if (v.password !== v.password_confirmation) return fail({ password: 'The password field confirmation does not match.' });
      if (String(v.security_answer).trim().toLowerCase() !== String(u.security_answer).trim().toLowerCase()) return fail({ security_answer: 'Incorrect answer.' });
      u.password = v.password; save(); go('/login', 'Password reset successfully.');
    },
    'admin-login': function (v) {
      var u = db.users.filter(function (x) { return x.email.toLowerCase() === v.email.toLowerCase(); })[0];
      if (!u || u.password !== v.password) return fail({ email: 'These credentials do not match our records.' }, { email: v.email });
      if (!u.is_admin) return fail({ email: 'You do not have admin access.' }, { email: v.email });
      signIn(u); go('/admin');
    },
    'filter-tasks': function (v) {
      var q = Object.keys(v).filter(function (k) { return v[k]; }).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(v[k]); }).join('&');
      go('/tasks' + (q ? '?' + q : ''));
    },
    'store-task': function (v, u) {
      if (v.deadline && Date.parse(v.deadline) <= Date.now()) return fail({ deadline: 'The deadline field must be a date after now.' }, v);
      db.tasks.push({ id: nextId(db.tasks), user_id: u.id, title: v.title, description: v.description || '', deadline: v.deadline ? new Date(v.deadline).toISOString() : null, priority: v.priority, status: 'pending', project_id: v.project_id ? +v.project_id : null, assigned_to: v.assigned_to ? +v.assigned_to : null });
      save(); go('/tasks');
    },
    'update-task': function (v, u, f) {
      var t = find(db.tasks, f.dataset.id);
      Object.assign(t, { title: v.title, description: v.description || '', deadline: v.deadline ? new Date(v.deadline).toISOString() : null, priority: v.priority, status: v.status });
      if ('assigned_to' in v) t.assigned_to = v.assigned_to ? +v.assigned_to : null;
      save(); go('/tasks');
    },
    'toggle-task': function (v, u, f) {
      var t = find(db.tasks, f.dataset.id);
      t.status = t.status === 'completed' ? 'pending' : 'completed';
      save(); render();
    },
    'delete-task': function (v, u, f) { db.tasks = db.tasks.filter(function (t) { return t.id !== +f.dataset.id; }); save(); go('/tasks'); },
    'store-project': function (v, u) {
      var p = { id: nextId(db.projects), name: v.name, description: v.description || '', owner_id: u.id, members: [u.id] };
      db.projects.push(p); save(); go('/projects/' + p.id);
    },
    'update-project': function (v, u, f) { var p = find(db.projects, f.dataset.id); p.name = v.name; p.description = v.description || ''; save(); go('/projects/' + p.id); },
    invite: function (v, u, f) {
      var p = find(db.projects, f.dataset.id);
      // the view has no error or success output for this form, so (as in the original) nothing visible changes
      if (!p.members.some(function (id) { var m = find(db.users, id); return m && m.email.toLowerCase() === v.email.toLowerCase(); })) {
        db.invitations.push({ id: nextId(db.invitations), project_id: p.id, email: v.email, token: Math.random().toString(36).slice(2) });
        save();
      }
      render();
    },
    'remove-member': function (v, u, f) {
      var p = find(db.projects, f.dataset.id), uid = +f.dataset.user;
      if (uid !== p.owner_id) { p.members = p.members.filter(function (id) { return id !== uid; }); save(); }
      render();
    },
    'leave-project': function (v, u, f) { var p = find(db.projects, f.dataset.id); p.members = p.members.filter(function (id) { return id !== u.id; }); save(); go('/projects'); },
    'update-profile': function (v, u) {
      if (db.users.some(function (x) { return x.id !== u.id && x.email.toLowerCase() === v.email.toLowerCase(); })) return fail({ email: 'The email has already been taken.' }, v);
      u.name = v.name; u.email = v.email; save(); go('/profile', 'profile-updated');
    },
    'update-password': function (v, u) {
      if (v.current_password !== u.password) return fail({ current_password: 'The password is incorrect.' });
      if (v.password.length < 8) return fail({ new_password: 'The password field must be at least 8 characters.' });
      if (v.password !== v.password_confirmation) return fail({ new_password: 'The password field confirmation does not match.' });
      u.password = v.password; save(); go('/profile', 'password-updated');
    },
    'delete-account': function (v, u) {
      if (v.password !== u.password) return fail({ userDeletion: 'The password is incorrect.' });
      db.users = db.users.filter(function (x) { return x.id !== u.id; }); save(); signOut(); go('/');
    },
    'admin-delete-user': function (v, u, f) { db.users = db.users.filter(function (x) { return x.id !== +f.dataset.id; }); save(); render(); },
    'admin-delete-project': function (v, u, f) { db.projects = db.projects.filter(function (x) { return x.id !== +f.dataset.id; }); save(); render(); },
    'admin-delete-task': function (v, u, f) { db.tasks = db.tasks.filter(function (x) { return x.id !== +f.dataset.id; }); save(); render(); }
  };

  document.addEventListener('submit', function (ev) {
    var f = ev.target, act = f.dataset.action;
    if (!act || !A[act]) return;
    ev.preventDefault();
    if (f.dataset.confirm && !window.confirm(f.dataset.confirm)) return;
    A[act](values(f), me(), f);
  });
  document.addEventListener('change', function (ev) { if (ev.target.hasAttribute('data-autosubmit')) ev.target.form.requestSubmit(); });

  /* ---------- demo bar ---------- */
  function demoBar() {
    var st = document.createElement('style');
    st.textContent = '.demo-bar{background:#0f172a;color:#e2e8f0;font:13px/1.45 system-ui,Segoe UI,sans-serif;padding:8px 14px;display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;position:relative;z-index:60}' +
      '.demo-bar b{color:#38bdf8;font-size:11px;letter-spacing:.08em}.demo-bar a{color:#f8fafc;background:#1e293b;padding:2px 9px;border-radius:999px;text-decoration:none;border:1px solid #334155}' +
      '.demo-bar a:hover{border-color:#38bdf8}.demo-bar button{margin-left:auto;border:1px solid #334155;background:#1e293b;color:#f1f5f9;border-radius:999px;padding:2px 10px;font:inherit;cursor:pointer}';
    document.head.appendChild(st);
    var bar = document.createElement('div');
    bar.className = 'demo-bar';
    bar.innerHTML = '<b>DEMO</b><span>Laravel app replayed in your browser. Sample data.</span>' +
      '<a href="#" data-as="1">Sign in as Demo User</a><a href="#" data-as="4">Admin panel</a><a href="#/forgot-password-security">Security-question reset</a>' +
      '<button type="button">Reset data</button>';
    bar.addEventListener('click', function (ev) {
      var a = ev.target.closest('[data-as]');
      if (a) { ev.preventDefault(); signIn(find(db.users, a.dataset.as)); go(a.dataset.as === '4' ? '/admin' : '/dashboard'); }
      if (ev.target.tagName === 'BUTTON') { localStorage.removeItem(KEY); signOut(); db = load(); go('/'); }
    });
    document.body.insertBefore(bar, document.body.firstChild);
  }

  db = load();
  demoBar();
  window.addEventListener('hashchange', render);
  render();
})();
