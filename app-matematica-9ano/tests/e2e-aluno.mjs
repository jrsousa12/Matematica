// Teste de ponta a ponta do PWA do aluno (Playwright + servidor estatico na porta 8080).
// Uso: cd app-matematica-9ano && python3 -m http.server 8080 &  node tests/e2e-aluno.mjs
// Simula datas com page.clock.setFixedTime (sem esperar dias reais).
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const URL = process.env.APP_URL || 'http://localhost:8080/';
let falhas = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'OK  ' : 'FALHA'} ${msg}`); if (!cond) falhas++; };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, acceptDownloads: true,
  permissions: ['clipboard-read', 'clipboard-write'] });
const page = await ctx.newPage();
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });

const dia = async (iso) => { await page.clock.setFixedTime(new Date(`${iso}T10:00:00-03:00`)); };
const abrir = async (hash = '') => {
  await page.goto(URL + 'index.html?x=' + Date.now()); // forca recarga completa (boot + rotina diaria)
  if (hash) await page.evaluate((h) => { location.hash = h; }, hash);
  await page.waitForTimeout(900);
};
const lerBanco = (loja, chave) => page.evaluate(async ([l, c]) => {
  const r = await new Promise((res) => { const q = indexedDB.open('app_matematica_9ano');
    q.onsuccess = () => { const t = q.result.transaction(l).objectStore(l);
      const g = c === undefined ? t.getAll() : t.get(c); g.onsuccess = () => res(g.result); }; });
  return r; }, [loja, chave]);

async function responderTudo() {
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(250);
    const alt = page.locator('.alternativa');
    if (!(await alt.count())) break;
    const sess = await lerBanco('config', 'sessao_atual');
    if (!sess || !sess.value || !sess.value.corrente) break;
    const q = await lerBanco('questoes', sess.value.corrente.questao_id);
    await alt.nth('ABCD'.indexOf(q.correta)).click();
    await page.locator('#proxima').click();
  }
}

// ---- Dia 1 (segunda 16/02/2026): cadastro e missao
await dia('2026-02-16');
await abrir();
await page.fill('#nome', 'Aluno Teste');
await page.check('input[name=aceite]'); await page.click('button[type=submit]');
await page.waitForTimeout(600);
await page.click('[data-acao=missao]'); await page.waitForTimeout(300);
await responderTudo();
await page.waitForTimeout(500);
let prog = await lerBanco('progresso', 'aluno');
ok(prog.streak_atual === 1, `streak 1 apos a primeira missao (veio ${prog.streak_atual})`);
ok(prog.xp_total >= 70, `XP de 5 acertos + missao + streak (veio ${prog.xp_total})`);

// ---- Desafio diario
await abrir('#/home');
if (await page.locator('[data-acao=desafio]').count()) {
  const xpAntes = (await lerBanco('progresso', 'aluno')).xp_total;
  await page.click('[data-acao=desafio]'); await page.waitForTimeout(300);
  const q = await lerBanco('questoes', (await lerBanco('config', 'sessao_atual')).value.corrente.questao_id);
  ok(q.dificuldade === 'dificil', `desafio e questao dificil (${q.dificuldade})`);
  await page.locator('.alternativa').nth('ABCD'.indexOf(q.correta)).click();
  await page.locator('#proxima').click(); await page.waitForTimeout(400);
  const p2 = await lerBanco('progresso', 'aluno');
  ok(p2.xp_total - xpAntes >= 15, `desafio certo rende +15 XP ou mais (ganhou ${p2.xp_total - xpAntes})`);
  await abrir('#/home');
  ok((await page.locator('[data-acao=desafio]').count()) === 0, 'desafio nao reaparece no mesmo dia');
} else ok(false, 'botao de desafio diario nao apareceu');

// ---- Perfil e exportacao
await abrir('#/perfil');
await page.click('#exportar'); await page.waitForTimeout(300);
const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-acao=baixar]')]);
ok(/^9A-2026_[A-Z2-9]{6}_2026-02-16\.json$/.test(download.suggestedFilename()), `nome do arquivo (${download.suggestedFilename()})`);
await page.waitForTimeout(300);
await page.click('[data-acao=mostrar]');
const texto = await page.inputValue('#json-exportado');
const snap = JSON.parse(texto);
ok(snap.schema_version === '1.0' && /^[A-Z2-9]{6}$/.test(snap.perfil.ra) && snap.turma_codigo === '9A-2026', 'JSON do snapshot valido');
ok(snap.sessoes.length >= 1 && snap.respostas.length >= 5, `snapshot tem sessoes (${snap.sessoes.length}) e respostas (${snap.respostas.length})`);
await page.click('[data-acao=copiar]'); await page.waitForTimeout(300);
const copiado = await page.evaluate(() => navigator.clipboard.readText());
ok(copiado === texto, 'botao Copiar JSON copia o texto completo');
const log = await lerBanco('export_log', 'aluno');
ok(log && log.total_exportacoes === 1, `export_log registrou 1 exportacao (veio ${log && log.total_exportacoes})`);

// ---- Freeze: dia 17 sem missao, aberto no dia 18 (perdeu 17) -> freeze preserva streak
await dia('2026-02-18'); await abrir('#/home');
prog = await lerBanco('progresso', 'aluno');
ok(prog.streak_atual === 1 && prog.freezes_usados_semana === 1, `freeze consumido, streak preservada (streak ${prog.streak_atual}, freezes ${prog.freezes_usados_semana})`);
// ---- Perdeu mais um dia na mesma semana (19) -> abre no dia 20 -> streak zera
await dia('2026-02-20'); await abrir('#/home');
prog = await lerBanco('progresso', 'aluno');
ok(prog.streak_atual === 0, `segundo dia perdido na semana zera streak (veio ${prog.streak_atual})`);

// ---- Avanco de bloco por tempo: 7 dias depois do inicio
ok(prog.bloco_atual === 1, `ainda no bloco 1 em 20/02 (bloco ${prog.bloco_atual})`);
await dia('2026-02-23'); await abrir('#/home');
prog = await lerBanco('progresso', 'aluno');
ok(prog.bloco_atual === 2, `avanca para o bloco 2 apos 7 dias (bloco ${prog.bloco_atual})`);
ok(prog.blocos_concluidos.includes(1), 'bloco 1 marcado como concluido');

// ---- Avanco de bloco por desempenho: 20 questoes e 80% (aluno novo, 2 dias no bloco)
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 800 } });
const page2 = await ctx2.newPage();
await page2.clock.setFixedTime(new Date('2026-03-02T10:00:00-03:00'));
await page2.goto(URL + 'index.html?x=' + Date.now());
await page2.waitForTimeout(900);
await page2.fill('#nome', 'Aluno Desempenho');
await page2.check('input[name=aceite]'); await page2.click('button[type=submit]');
await page2.waitForTimeout(600);
await page2.evaluate(() => new Promise((res) => { const q = indexedDB.open('app_matematica_9ano');
  q.onsuccess = () => { const t = q.result.transaction('dominio_bloco', 'readwrite');
    t.objectStore('dominio_bloco').put({ bloco_id: 1, acertos: 17, total: 20, percentual: 85, ultima_atualizacao: '2026-03-02' });
    t.oncomplete = res; }; }));
await page2.clock.setFixedTime(new Date('2026-03-03T10:00:00-03:00'));
await page2.goto(URL + 'index.html?x=' + Date.now()); await page2.waitForTimeout(900);
const prog2 = await page2.evaluate(() => new Promise((res) => { const q = indexedDB.open('app_matematica_9ano');
  q.onsuccess = () => { const g = q.result.transaction('progresso').objectStore('progresso').get('aluno');
    g.onsuccess = () => res(g.result); }; }));
ok(prog2.bloco_atual === 2, `avanca para o bloco 2 com 20 questoes e 85% em 1 dia (bloco ${prog2.bloco_atual})`);

ok(erros.length === 0, `sem erros no console (${erros.slice(0, 3).join(' | ')})`);
await browser.close();
console.log(falhas ? `\n${falhas} falha(s)` : '\nTodos os testes passaram');
process.exit(falhas ? 1 : 0);
