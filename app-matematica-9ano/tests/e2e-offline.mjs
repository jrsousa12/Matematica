// Simula o QA de modo aviao num Android de entrada (tela pequena, CPU lenta).
// Uso: com o servidor ativo (porta 8080), node tests/e2e-offline.mjs
import { createRequire } from 'node:module';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
const URL = process.env.APP_URL || 'http://localhost:8080/';
let falhas = 0;
const ok = (c, m) => { console.log(`${c ? 'OK  ' : 'FALHA'} ${m}`); if (!c) falhas++; };

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['Galaxy S5'], serviceWorkers: 'allow' });
const page = await ctx.newPage();
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

await page.goto(URL + 'index.html');
await page.evaluate(() => navigator.serviceWorker.ready);
await page.waitForTimeout(2500); // deixa o cache terminar
ok((await page.evaluate(() => navigator.serviceWorker.getRegistrations())).length === 1, 'service worker registrado');

await ctx.setOffline(true);
await page.reload(); await page.waitForTimeout(1500);
ok((await page.locator('#nome').count()) === 1, 'abre sem internet (tela de cadastro)');
await page.fill('#nome', 'Aluno Offline');
await page.check('input[name=aceite]'); await page.click('button[type=submit]');
await page.waitForTimeout(1200);
ok((await page.locator('[data-acao=missao]').count()) === 1, 'cadastro offline leva a tela inicial');

await page.click('[data-acao=missao]'); await page.waitForTimeout(500);
const lerSessao = () => page.evaluate(() => new Promise((res) => { const q = indexedDB.open('app_matematica_9ano');
  q.onsuccess = () => { const g = q.result.transaction('config').objectStore('config').get('sessao_atual');
    g.onsuccess = () => res(g.result && g.result.value); }; }));
for (let i = 0; i < 2; i++) {
  await page.locator('.alternativa').first().click();
  await page.locator('#proxima').click(); await page.waitForTimeout(400);
}
const antes = await lerSessao();
ok(antes && antes.itens && antes.itens.length >= 2, `sessao salva a cada resposta (${antes && antes.itens ? antes.itens.length : 0} itens)`);
await page.reload(); await page.waitForTimeout(1500); // equivale a fechar e reabrir o navegador, ainda offline
const depois = await lerSessao();
ok(depois && depois.itens.length === antes.itens.length, 'sessao continua salva apos recarregar offline');
ok((await page.locator('.alternativa').count()) === 4 || (await page.locator('[data-acao=missao]').count()) === 1,
  'app volta a uma tela utilizavel (questao ou botao de retomar)');
await page.goto(URL + 'index.html#/trilha'); await page.waitForTimeout(800);
ok((await page.locator('body').innerText()).includes('Bloco') || (await page.locator('body').innerText()).length > 50, 'trilha abre offline');
await page.goto(URL + 'index.html#/perfil'); await page.waitForTimeout(800);
ok((await page.locator('body').innerText()).length > 50, 'perfil abre offline');

ok(erros.length === 0, `sem erros de JavaScript (${erros.slice(0, 2).join(' | ')})`);
await browser.close();
console.log(falhas ? `\n${falhas} falha(s)` : '\nTodos os testes passaram');
process.exit(falhas ? 1 : 0);
