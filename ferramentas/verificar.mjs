// Motor: verificação rápida do repositório. Imprime só OK / AVISO / FALHA.
// Uso (na raiz do repositório): node ferramentas/verificar.mjs
// Confere: (1) tamanho dos arquivos .js/.css (regra dos 300), (2) lista ARQUIVOS do sw.js,
// (3) testes unitários (node --test) do app do aluno e do painel.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(RAIZ, 'app-matematica-9ano');
const LIMITE_IDEAL = 250;
const LIMITE = 300;
// Arquivos acima do limite com decisão pendente do dono (viram AVISO, não FALHA).
const EXCECOES = { 'app-matematica-9ano/css/componentes.css': 'aguarda decisão do dono' };
const IGNORAR = new Set(['vendor', 'node_modules', '.git', 'saida', 'data']);

let falhas = 0;
const ok = (m) => console.log(`OK     ${m}`);
const aviso = (m) => console.log(`AVISO  ${m}`);
const falha = (m) => { falhas += 1; console.log(`FALHA  ${m}`); };

function listar(dir) {
  return readdirSync(dir).flatMap((nome) => {
    if (IGNORAR.has(nome)) return [];
    const caminho = join(dir, nome);
    return statSync(caminho).isDirectory() ? listar(caminho) : [caminho];
  });
}

// (1) Tamanho dos arquivos
function verificarTamanho() {
  const arquivos = listar(RAIZ).filter((f) => /\.(m?js|css)$/.test(f));
  let grandes = 0;
  arquivos.forEach((f) => {
    const rel = relative(RAIZ, f);
    const linhas = readFileSync(f, 'utf8').split('\n').length - 1;
    if (linhas > LIMITE) {
      grandes += 1;
      if (EXCECOES[rel]) aviso(`${rel}: ${linhas} linhas (${EXCECOES[rel]})`);
      else falha(`${rel}: ${linhas} linhas (limite ${LIMITE})`);
    } else if (linhas > LIMITE_IDEAL) {
      aviso(`${rel}: ${linhas} linhas (perto do limite)`);
    }
  });
  if (!grandes) ok(`tamanho: ${arquivos.length} arquivos .js/.css dentro do limite de ${LIMITE} linhas`);
}

// (2) Lista ARQUIVOS do sw.js
function verificarSw() {
  const sw = readFileSync(join(APP, 'sw.js'), 'utf8');
  const bloco = sw.match(/const ARQUIVOS = \[([\s\S]*?)\];/);
  if (!bloco) return falha('sw.js: lista ARQUIVOS não encontrada');
  const listados = [...bloco[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((a) => a !== './');
  const reais = ['index.html', 'manifest.webmanifest', 'icons', 'vendor', 'css', 'js']
    .flatMap((n) => {
      const c = join(APP, n);
      if (!existsSync(c)) return [];
      if (!statSync(c).isDirectory()) return [c];
      return readdirSync(c, { recursive: true }).map((r) => join(c, r)).filter((r) => statSync(r).isFile());
    })
    .map((f) => relative(APP, f).split('\\').join('/'));
  const faltam = reais.filter((f) => !listados.includes(f));
  const sobram = listados.filter((f) => !reais.includes(f));
  faltam.forEach((f) => falha(`sw.js: ${f} existe mas não está em ARQUIVOS (não funcionará offline)`));
  sobram.forEach((f) => falha(`sw.js: ${f} está em ARQUIVOS mas o arquivo não existe (a instalação falha)`));
  if (!faltam.length && !sobram.length) ok(`sw.js: os ${listados.length} arquivos do app estão na lista ARQUIVOS`);
}

// (3) Testes unitários (app do aluno e painel do professor)
function verificarTestes() {
  for (const pasta of ['app-matematica-9ano', 'painel-professor-9ano', 'ferramentas']) {
    const r = spawnSync(process.execPath, ['--test'], { cwd: join(RAIZ, pasta), encoding: 'utf8' });
    const saida = `${r.stdout}${r.stderr}`;
    const passou = saida.match(/^# pass (\d+)/m);
    const falhou = saida.match(/^# fail (\d+)/m);
    if (r.status === 0) ok(`testes unitários (${pasta}): ${passou ? passou[1] : '?'} passando`);
    else falha(`testes unitários (${pasta}): ${falhou ? falhou[1] : '?'} falhando (rode "cd ${pasta} && node --test")`);
  }
}

// (4) Motor de calculo: confere o gabarito das 150 questoes. Divergencia vira AVISO (decisao do professor).
function verificarCalculo() {
  const r = spawnSync(process.execPath, ['ferramentas/conferir-calculo.mjs'], { cwd: RAIZ, encoding: 'utf8' });
  const linhas = `${r.stdout}${r.stderr}`.split('\n').filter((l) => l.startsWith('FALHA ') && !/conferidas pelo/.test(l));
  if (r.status === 0) ok('motor de cálculo: gabarito das 150 questões confere com as contas');
  else linhas.forEach((l) => aviso(`motor de cálculo: ${l.slice(6)}`));
}

verificarTamanho();
verificarSw();
verificarTestes();
verificarCalculo();
console.log(falhas ? `\n${falhas} falha(s).` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
