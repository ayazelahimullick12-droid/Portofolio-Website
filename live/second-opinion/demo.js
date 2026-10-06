/* Portfolio demo for The Second Opinion Doctor.
   The real app posts to the Express backend, which forwards to an n8n AI agent
   (OpenAI chat model) and returns { success, data: { level, message, details,
   recommendation } }. That pipeline can't run on GitHub Pages, so this file:
     1. answers POST http://localhost:5000/api/get-opinion for a few sample cases, and
     2. adds a small bar above the app for picking a case.
   Case 1's response is the example in the project's N8N_WORKFLOW_SETUP.md; the
   others are written in the same format to show the other levels. */
(function () {
  var API = 'http://localhost:5000/api/get-opinion';

  var CASES = [
    {
      label: 'Headache + blurred vision',
      symptoms: 'Persistent headache for 3 weeks, occasional blurred vision, neck stiffness in the morning',
      doctorDiagnosis: 'Tension headache caused by stress and poor posture',
      recommendations: 'Paracetamol 500mg twice daily for 5 days, practice neck stretches',
      result: {
        level: 4,
        message: 'There are concerns about the symptoms that may warrant further evaluation.',
        details: 'The combination of persistent headache for 3 weeks with blurred vision and neck stiffness could indicate conditions beyond a simple tension headache. These symptoms together, especially the visual disturbances, are considered red flags that typically warrant more thorough investigation.',
        recommendation: 'We recommend seeking a second opinion from a neurologist. Consider requesting imaging studies (CT or MRI) to rule out other conditions. If symptoms worsen, especially vision changes, seek immediate medical attention.'
      }
    },
    {
      label: 'Common cold',
      symptoms: 'Runny nose, sneezing and a mild sore throat for 3 days, no fever',
      doctorDiagnosis: 'Common cold (viral upper respiratory infection)',
      recommendations: 'Rest, plenty of fluids, saline nasal spray, paracetamol if needed',
      result: {
        level: 1,
        message: 'The diagnosis and treatment appear appropriate for the symptoms described.',
        details: 'Mild, short-lived nasal and throat symptoms without fever are typical of a viral cold, and supportive care is the standard approach. Nothing in the description suggests a mismatch between the symptoms and the diagnosis.',
        recommendation: 'A second opinion is entirely optional. See a doctor again if you develop a high fever, trouble breathing, or symptoms that last more than 10 days.'
      }
    },
    {
      label: 'Back pain + tingling',
      symptoms: 'Lower back pain for 6 weeks, worse in the morning, occasional tingling down the left leg',
      doctorDiagnosis: 'Muscle strain',
      recommendations: 'Painkillers and rest for two weeks',
      result: {
        level: 3,
        message: 'Some aspects of this case are worth clarifying before continuing the current plan.',
        details: 'Back pain lasting six weeks with tingling down one leg can point to nerve involvement, which a simple muscle strain would not usually explain. No examination findings or imaging were mentioned to rule this out.',
        recommendation: 'A second opinion could be helpful, for example from an orthopaedic or spine specialist. Ask whether a nerve examination or imaging is needed, and seek care quickly if you notice weakness or numbness.'
      }
    },
    {
      label: 'Chest pain',
      symptoms: 'Sudden severe chest pain spreading to the left arm, shortness of breath and sweating',
      doctorDiagnosis: 'Acid reflux',
      recommendations: 'Antacids after meals',
      result: {
        level: 5,
        message: 'These symptoms are red flags that need urgent attention.',
        details: 'Sudden severe chest pain that spreads to the arm, with breathlessness and sweating, can signal a heart problem. Acid reflux does not adequately explain this combination, and no heart tests were ordered.',
        recommendation: 'Seek emergency care now, and strongly consider a second opinion. Ask specifically for an ECG and heart tests before accepting a reflux diagnosis.'
      }
    }
  ];

  function norm(s) { return String(s || '').trim().replace(/\s+/g, ' ').toLowerCase(); }

  var realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : input.url;
    if (url !== API) return realFetch(input, init);
    var body = {};
    try { body = JSON.parse((init && init.body) || '{}'); } catch (e) {}
    var hit = CASES.filter(function (c) {
      return norm(c.symptoms) === norm(body.symptoms) && norm(c.doctorDiagnosis) === norm(body.doctorDiagnosis) && norm(c.recommendations) === norm(body.recommendations);
    })[0];
    var payload = hit
      ? { success: true, data: Object.assign({}, hit.result, { timestamp: new Date().toISOString() }) }
      : { success: false, message: 'Demo mode: this copy isn\'t connected to the n8n AI agent, so it can only answer the sample cases above.' };
    return new Promise(function (resolve) {
      // roughly how long the agent takes, so the "Analyzing..." state shows
      setTimeout(function () {
        resolve(new Response(JSON.stringify(payload), { status: hit ? 200 : 503, headers: { 'Content-Type': 'application/json' } }));
      }, 1600);
    });
  };

  // React controls the textareas, so set values through the native setter and fire input events
  function fill(id, value) {
    var el = document.getElementById(id);
    if (!el) return false;
    var setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  function useCase(c) {
    var reset = document.querySelector('.reset-btn');
    if (reset) reset.click();
    setTimeout(function () {
      fill('symptoms', c.symptoms);
      fill('doctorDiagnosis', c.doctorDiagnosis);
      fill('recommendations', c.recommendations);
      var form = document.querySelector('.form-container');
      if (form) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, reset ? 60 : 0);
  }

  function bar() {
    var css = '' +
      '.demo-bar{background:#0f172a;color:#e2e8f0;font:13px/1.4 "Segoe UI",Tahoma,sans-serif;padding:10px 14px;display:flex;flex-wrap:wrap;align-items:center;gap:8px}' +
      '.demo-bar b{color:#38bdf8;font-weight:700;letter-spacing:.08em;font-size:11px;margin-right:4px}' +
      '.demo-bar span{opacity:.85;margin-right:4px}' +
      '.demo-bar button{border:1px solid #334155;background:#1e293b;color:#f1f5f9;border-radius:999px;padding:5px 11px;font:inherit;cursor:pointer}' +
      '.demo-bar button:hover{border-color:#38bdf8;color:#fff}';
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var el = document.createElement('div');
    el.className = 'demo-bar';
    el.innerHTML = '<b>DEMO</b><span>The live app asks an n8n AI agent. Try a sample case:</span>';
    CASES.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = c.label;
      b.addEventListener('click', function () { useCase(c); });
      el.appendChild(b);
    });
    document.body.insertBefore(el, document.getElementById('root'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bar); else bar();
})();
