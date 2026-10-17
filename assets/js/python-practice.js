// Local self-assessment only. These records are not trusted grades or entitlements.
(function (root) {
  const validId = id => typeof id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) && !['constructor','prototype','__proto__'].includes(id);
  const integer = (n, min, max) => Number.isSafeInteger(n) && n >= min && n <= max;
  const time = n => integer(n, 1, 8640000000000000);
  function normalize(value) {
    const state = { records: {}, hinted: {}, session: null };
    if (!value || typeof value !== 'object' || Array.isArray(value)) return state;
    for (const [id, rows] of Object.entries(value.records || {}).slice(0, 1000)) {
      if (!validId(id) || !Array.isArray(rows)) continue;
      state.records[id] = rows.filter(r => r && time(r.at) && ['practice','timed'].includes(r.mode)
        && integer(r.total,1,100) && integer(r.passed,0,r.total) && typeof r.assisted === 'boolean'
        && (r.elapsedMs === null || integer(r.elapsedMs,0,5400000))).slice(-10)
        .map(r => ({at:r.at, mode:r.mode, total:r.total, passed:r.passed, assisted:r.assisted, elapsedMs:r.elapsedMs}));
    }
    for (const [id, used] of Object.entries(value.hinted || {}).slice(0,1000)) if (validId(id) && used === true) state.hinted[id] = true;
    const s = value.session;
    if (s && validId(s.exerciseId) && time(s.startedAt) && time(s.deadlineAt)
      && integer(s.deadlineAt-s.startedAt, 60000, 5400000)
      && ['running','submitted','review'].includes(s.phase)
      && typeof s.code === 'string' && s.code.length <= 200000 && typeof s.input === 'string' && s.input.length <= 200000
      && integer(s.testCase,0,99) && (s.phase === 'running' || (time(s.endedAt) && s.endedAt >= s.startedAt && s.endedAt <= s.deadlineAt))) {
      state.session = {exerciseId:s.exerciseId, startedAt:s.startedAt, deadlineAt:s.deadlineAt, phase:s.phase,
        code:s.code, input:s.input, testCase:s.testCase, endedAt:s.phase === 'running' ? null : s.endedAt};
    }
    return state;
  }
  function begin(exerciseId, minutes, now = Date.now()) {
    if (!validId(exerciseId) || !integer(minutes,1,90) || !time(now)) throw Error('Invalid timed practice');
    return {exerciseId, startedAt:now, deadlineAt:now+minutes*60000, endedAt:null, phase:'running', code:'', input:'', testCase:0};
  }
  function remaining(session, now = Date.now()) { return Math.max(0, session.deadlineAt-now); }
  function submit(session, now = Date.now()) {
    if (session.phase !== 'running') return false;
    session.endedAt = Math.max(session.startedAt, Math.min(now, session.deadlineAt));
    session.phase = 'submitted'; return true;
  }
  function record(state, id, result) {
    if (!validId(id)) return;
    const rows = normalize({records:{[id]:[result]}}).records[id];
    if (!rows?.length) return;
    state.records[id] = [...(state.records[id] || []), rows[0]].slice(-10);
  }
  function status(state, id, completed, hasDraft) {
    const last = state.records[id]?.at(-1);
    if (last) return last.passed === last.total ? 'passed' : 'review';
    return completed ? 'passed' : hasDraft ? 'draft' : 'new';
  }
  function clock(ms) {
    const seconds = Math.max(0,Math.ceil(ms/1000));
    return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  }
  root.IT1140PythonPractice = {normalize, begin, remaining, submit, record, status, clock};
})(globalThis);
