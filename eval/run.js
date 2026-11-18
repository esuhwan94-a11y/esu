// Baseline check for Jarvis: asks every question in questions.json against a build with stand-in connectors
// and reports which path answered it. Usage: node eval/run.js [--json out.json]
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const Q = JSON.parse(fs.readFileSync(path.join(__dirname, 'questions.json'), 'utf8'));
const T2I = {}; try { const raw = fs.readFileSync(path.join(__dirname, '..', 'vault-pack.js'), 'utf8'); JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)).notes.forEach(n => { T2I[n.title.trim()] = n.id; }); } catch (e) { console.error('vault-pack.js 를 읽지 못했습니다. 노트 경로 판정이 제목으로만 됩니다.'); }
(async () => { const b = await chromium.launch(); const rows = [];
  for (const item of Q) { try { const p = await b.newPage({ viewport: { width: 1280, height: 780 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { const T = window.__t = { mcp: [], sql: [], sent: [], ai: 0 };
      const mcp = { callTool: async (server, tool, input) => { T.mcp.push(server); if (tool === 'execute_sql') { const sq = String(input && input.query || ''); T.sql.push(sq); return { payload: /select name from public\.dealers union/.test(sq) ? JSON.stringify([{ name: '㈜국도특장' }]) : '[]' }; }
        if (tool === 'search_threads') return { payload: { threads: [{ id: 't1', messages: [{ sender: 'a@b.com', subject: '견적 문의', snippet: '견적 부탁드립니다', date: new Date().toISOString() }] }] } };
        if (tool === 'get_thread') return { payload: { messages: [{ plaintextBody: '본문' }] } };
        if (tool === 'list_events') return { payload: JSON.stringify({ events: [{ summary: '소재입고', start: { dateTime: new Date().toISOString() } }] }) };
        if (tool === 'slack_read_channel') return { payload: { messages: [{ text: '출고 준비 완료', ts: String(Date.now() / 1000), user: 'U1' }] } };
        if (tool === 'search_files') return { payload: { files: [{ id: 'f1', name: '단가표.xlsx', webViewLink: 'https://drive.google.com/x' }] } }; return { payload: {} }; } };
      const sampler = async () => { T.ai++; return { text: '(AI가 답함)', content: [{ type: 'text', text: '(AI가 답함)' }] }; }; sampler.limits = async () => ({ tools: true });
      const cm = { anchorFor: async () => ({ a: 1 }), canSendToClaude: async () => 'yes', sendToClaude: async o => { T.sent.push(o.text); return {}; } }, dbm = { doc: () => ({ onSnapshot: () => () => {} }) };
      window.claude = { use: async n => n === 'mcp' ? mcp : n === 'sample' ? sampler : n === 'comments' ? cm : n === 'db' ? dbm : null }; });
    p.setDefaultTimeout(8000); await p.goto('file://' + path.join(__dirname, '..', 'index.html'), { waitUntil: 'domcontentloaded', timeout: 15000 }); await p.waitForTimeout(700);
    await p.fill('#jq', item.q); await p.press('#jq', 'Enter'); await p.waitForTimeout(1400);
    const r = await p.evaluate(() => ({ t: window.__t, say: document.querySelector('#jout').hidden ? '' : document.querySelector('#jsay').textContent, res: document.querySelector('#jres').textContent.slice(0, 200), vault: !document.querySelector('#v-vault').hidden, spread: !document.querySelector('#spread').hidden, modal: [...document.querySelectorAll('.modal')].some(m => !m.hidden), hasBtn: !!document.querySelector('#jres .jact, #jres textarea') }));
    const say = r.say, m = say.match(/^「(.+?)」[을를]? ?확대했습니다/); let got;
    if (r.t.sent.length) got = 'relay'; else if (r.modal) got = 'modal'; else if (r.vault) got = 'vault';
    else if (r.spread || /관련 기록 \d+건/.test(say)) got = 'search';
    else if (r.t.sql.length) got = 'db:' + ((r.t.sql.join(' ').match(/job_events|kab_job_packing|kab_slip_queue|kab_oem_state|dealers|jobs/) || ['?'])[0]);
    else if (r.t.mcp.length) got = 'mcp:' + r.t.mcp[0]; else if (r.t.ai) got = 'ai';
    else if (m) got = 'note:' + (T2I[m[1].trim()] || m[1]);
    else if (/관련 기록 \d+건/.test(say)) got = 'search'; else if (/찾지 못했습니다/.test(say)) got = 'miss'; else if (/가진 스킬 · 이 순서로|가진 스킬 \d+개 중|없는 스킬 · 찾아볼 것|딱 맞는 스킬이/.test(r.res + say)) got = 'skill'; else got = say ? 'answer' : 'nothing';
    if (got !== 'note:' && got.startsWith('note:') === false && r.hasBtn && /넘|보낼|시킬|확인/.test(say + r.res) && !r.t.sent.length && !r.t.mcp.length) got = got === 'answer' ? 'confirm' : got;
    const w = item.want; let ok;
    if (w.startsWith('any:')) ok = w.slice(4).split(',').some(x => got.startsWith(x)); else if (w.startsWith('answer:')) ok = ['answer', 'confirm'].includes(got) && new RegExp(w.slice(7)).test(say + r.res);
    else if (w === 'not-search') ok = !['search', 'miss', 'nothing'].includes(got); else if (w === 'confirm-or-relay') ok = got === 'confirm' || got === 'relay'; else ok = got === w;
    rows.push({ g: item.g, q: item.q, want: w, got, ok, say: say.slice(0, 70), err: errs[0] || '' }); process.stderr.write(ok ? '.' : 'x'); await p.close(); } catch (e) { rows.push({ g: item.g, q: item.q, want: item.want, got: 'error', ok: false, say: '', err: String(e.message || e).slice(0, 120) }); process.stderr.write('E'); } }
  await b.close(); const pass = rows.filter(r => r.ok).length;
  const by = {}; rows.forEach(r => { (by[r.g] = by[r.g] || [0, 0])[0] += r.ok ? 1 : 0; by[r.g][1]++; });
  console.log(`기준 질문 ${rows.length}개 중 통과 ${pass}개 (${Math.round(pass / rows.length * 100)}%)`); Object.entries(by).forEach(([g, [a, n]]) => console.log(`  ${g}: ${a}/${n}`));
  console.log('\n통과 못 한 질문'); rows.filter(r => !r.ok).forEach(r => console.log(`  [${r.g}] ${r.q}\n     기대 ${r.want} / 실제 ${r.got} / 답: ${r.say}${r.err ? ' / 오류: ' + r.err : ''}`));
  const j = process.argv.indexOf('--json'); if (j > 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify({ at: new Date().toISOString(), total: rows.length, pass, rows }, null, 1)); })();
