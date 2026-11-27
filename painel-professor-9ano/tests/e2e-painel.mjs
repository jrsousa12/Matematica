// Teste de ponta a ponta do painel (Playwright). Sobe o próprio servidor na porta 8081.
// Rodar: cd painel-professor-9ano && node tests/e2e-painel.mjs
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const aqui = join(fileURLToPath(import.meta.url), '..', '..');
const raiz = join(aqui, '..');
const pasta = join(raiz, 'ferramentas', 'saida', 'snapshots');
if (!existsSync(join(pasta, 'problemas'))) {
  execFileSync('node', [join(raiz, 'ferramentas', 'gerar-snapshots.mjs'), '--hoje', '2026-03-20', '--semente', '9'], { stdio: 'ignore' });
}
const validos = readdirSync(pasta).filter((f) => f.endsWith('.json')).map((f) => join(pasta, f));
const problemas = readdirSync(join(pasta, 'problemas')).map((f) => join(pasta, 'problemas', f));

let falhas = 0;
const confere = (nome, ok, extra = '') => {
  console.log(`${ok ? 'OK    ' : 'FALHA '} ${nome}${ok ? '' : ` ${extra}`}`);
  if (!ok) falhas++;
};

const servidor = spawn('python3', ['-m', 'http.server', '8081'], { cwd: aqui, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1000));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  page.on('dialog', (d) => d.accept());
  await page.clock.setFixedTime(new Date('2026-03-21T12:00:00-03:00'));
  await page.goto('http://localhost:8081/#/importar');
  await page.waitForSelector('#dropzone');

  const importar = async (arquivos) => {
    await page.setInputFiles('#arquivos', arquivos);
    await page.waitForSelector('#relatorio .tabela');
    return page.textContent('#relatorio p');
  };
  const alunosNoBanco = () => page.evaluate(() => new Promise((res) => {
    const q = indexedDB.open('painel_matematica_9ano');
    q.onsuccess = () => {
      const t = q.result.transaction('alunos').objectStore('alunos').getAll();
      t.onsuccess = () => res(t.result.map((a) => [a.ra, a.exported_at]));
    };
  }));

  // Lote A: 25 arquivos válidos (o RA 900001 aparece 2 vezes: vale o mais recente).
  let resumo = await importar(validos);
  confere('lote A: 24 novos e 1 ignorado', /25 arquivo\(s\) lido\(s\): 24 novo\(s\), 0 atualizado\(s\), 1 ignorado\(s\), 0 com erro/.test(resumo), resumo);
  const antes = await alunosNoBanco();
  confere('banco tem 24 alunos', antes.length === 24, String(antes.length));
  confere('900001 ficou com a exportação mais recente', antes.some(([ra, d]) => ra === '900001' && d.startsWith('2026-03-20')));

  // Reimportar uma exportação antiga não troca a mais nova.
  resumo = await importar([validos.find((f) => f.includes('900001_2026-03-13'))]);
  confere('exportação antiga é ignorada', /1 ignorado\(s\)/.test(resumo), resumo);

  // Lote B: 9 arquivos com defeito. 6 erros; 1 atualizado (data futura); 2 ignorados (mesma data).
  resumo = await importar(problemas);
  confere('lote B: 6 erros, 1 atualizado, 2 ignorados', /9 arquivo\(s\) lido\(s\): 0 novo\(s\), 1 atualizado\(s\), 2 ignorado\(s\), 6 com erro/.test(resumo), resumo);
  const avisos = await page.$$eval('#relatorio .pilula--amarelo', (e) => e.length);
  confere('avisos leves aparecem no relatório', avisos >= 3, String(avisos));
  const depois = await alunosNoBanco();
  confere('o lote com defeito não tirou nenhum aluno', depois.length === 24);

  // Desfazer o lote B restaura a data anterior do aluno atualizado.
  await page.click('#desfazer');
  await page.waitForSelector('#relatorio [role=status]');
  const restaurado = await alunosNoBanco();
  confere('desfazer devolve o estado anterior', JSON.stringify(restaurado.sort()) === JSON.stringify(antes.sort()));
  confere('botão desfazer some depois de usado', (await page.$('#desfazer')) === null);
  confere('histórico lista os 3 lotes', (await page.$$('#historico tbody tr')).length === 3);

  // Aba Painel: números esperados calculados à parte, direto dos arquivos (exportação mais recente de cada RA).
  const maisRecentes = new Map();
  for (const f of validos) {
    const s = JSON.parse(readFileSync(f, 'utf8'));
    const atual = maisRecentes.get(s.perfil.ra);
    if (!atual || s.exported_at > atual.exported_at) maisRecentes.set(s.perfil.ra, s);
  }
  const turma = [...maisRecentes.values()];
  const ativos = turma.filter((s) => s.sessoes.some((x) => x.tipo === 'missao' && x.data.slice(0, 10) >= '2026-03-15')).length;
  const emRisco = turma.filter((s) => {
    const acerto = (s.respostas.filter((r) => r.correta).length / s.respostas.length) * 100;
    const dias = Math.round((Date.parse('2026-03-21') - Date.parse(s.export_log.ultima_exportacao.slice(0, 10))) / 86400000);
    return s.progresso.streak_atual < 3 || acerto < 50 || dias > 10;
  }).length;

  await page.click('a[data-aba="painel"]');
  await page.waitForSelector('#tabela .tabela');
  const cards = await page.$$eval('.resumo__valor', (e) => e.map((x) => x.textContent));
  confere('card Alunos ativos bate', cards[0] === `${ativos} de ${turma.length}`, `${cards[0]} esperado ${ativos} de ${turma.length}`);
  confere('card Alunos em risco bate', cards[3] === String(emRisco), `${cards[3]} esperado ${emRisco}`);
  confere('tabela tem 1 linha por aluno', (await page.$$('#tabela tbody tr')).length === turma.length);
  confere('mini-mapa tem 10 blocos por aluno', (await page.$$('#tabela tbody tr:first-child .mapa__bloco')).length === 10);

  await page.fill('input[name=busca]', '900005');
  confere('busca por RA', (await page.$$('#tabela tbody tr')).length === 1);
  await page.fill('input[name=busca]', '');
  await page.selectOption('select[name=situacao]', 'risco');
  const nRisco = (await page.$$('#tabela tbody tr')).length;
  confere('filtro "com sinal de alerta" bate com o card', nRisco === emRisco, String(nRisco));
  await page.selectOption('select[name=situacao]', 'todos');
  await page.selectOption('select[name=tipo]', '30d');
  confere('período 30 dias mostra as datas', /20\/02\/2026 a 21\/03\/2026/.test(await page.textContent('#periodo')), await page.textContent('#periodo'));
  await page.selectOption('select[name=tipo]', 'personalizado');
  await page.fill('input[name=de]', '2026-03-16');
  await page.fill('input[name=ate]', '2026-03-20');
  confere('período personalizado', /16\/03\/2026 a 20\/03\/2026/.test(await page.textContent('#periodo')));
  await page.selectOption('select[name=tipo]', 'inicio');
  await page.click('#tabela tbody tr:first-child .link-aluno');
  await page.waitForSelector('#modal-aluno[open]');
  confere('modal abre com nome e RA do aluno', /Código 9000/.test(await page.textContent('#modal-aluno')));
  confere('modal mostra 10 blocos e 12 badges', (await page.$$('#modal-aluno .lista-blocos li')).length === 10 && (await page.$$('#modal-aluno .badges .pilula')).length === 12);
  await page.keyboard.press('Escape');
  confere('Esc fecha o modal', (await page.$('#modal-aluno[open]')) === null);
  await page.click('#tabela tbody tr:first-child .link-aluno');
  await page.click('#modal-aluno [data-fechar]');
  confere('botão Fechar fecha o modal', (await page.$('#modal-aluno[open]')) === null);

  // Aba Exportar: CSV e PDF.
  await page.goto('http://localhost:8081/#/exportar');
  await page.waitForSelector('#csv');
  confere('exportar mostra prévia com número de alunos', /terá \d+ aluno/.test(await page.textContent('#previa')));
  const [dlCsv] = await Promise.all([page.waitForEvent('download'), page.click('#csv')]);
  const caminhoCsv = await dlCsv.path();
  const bytes = readFileSync(caminhoCsv);
  confere('CSV tem BOM UTF-8 e nome do relatório', bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF && /^relatorio_9A-2026_.*\.csv$/.test(dlCsv.suggestedFilename()), dlCsv.suggestedFilename());
  const linhasCsv = bytes.toString('utf8').trim().split('\r\n');
  confere('CSV tem cabeçalho e 24 alunos', linhasCsv.length === 25 && linhasCsv[0].includes('Código;Nome;Situação'), String(linhasCsv.length));
  const [dlPdf] = await Promise.all([page.waitForEvent('download'), page.click('#pdf')]);
  const pdf = readFileSync(await dlPdf.path());
  confere('PDF gerado (cabeçalho %PDF)', pdf.subarray(0, 4).toString() === '%PDF' && /\.pdf$/.test(dlPdf.suggestedFilename()));

  if (process.env.CAPTURA) await page.screenshot({ path: process.env.CAPTURA });

  confere('nenhum erro no console', erros.length === 0, erros.join(' | '));
} finally {
  await browser.close();
  servidor.kill();
}
console.log(falhas ? `\n${falhas} verificação(ões) falharam.` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
