// Testes do validador com os arquivos gerados por ferramentas/gerar-snapshots.mjs (semente fixa).
// Rodar: cd painel-professor-9ano && node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { validarSnapshot } from '../js/import/validator.js';

const raiz = join(fileURLToPath(import.meta.url), '..', '..', '..');
const pasta = join(raiz, 'ferramentas', 'saida', 'snapshots');
if (!existsSync(join(pasta, 'problemas'))) {
  execFileSync('node', [join(raiz, 'ferramentas', 'gerar-snapshots.mjs'), '--hoje', '2026-03-20', '--semente', '9'], { stdio: 'ignore' });
}
const opcoes = { turma_codigo: '9A-2026', agora: new Date('2026-03-21T12:00:00-03:00') };
const ler = (...partes) => readFileSync(join(pasta, ...partes), 'utf8');
const validar = (nome) => validarSnapshot(ler('problemas', nome), opcoes);

test('todos os arquivos válidos passam sem erros nem avisos', () => {
  const arquivos = readdirSync(pasta).filter((f) => f.endsWith('.json'));
  assert.ok(arquivos.length >= 20);
  for (const f of arquivos) {
    const r = validarSnapshot(ler(f), opcoes);
    assert.equal(r.ok, true, `${f}: ${r.erros.join(' | ')}`);
    assert.deepEqual(r.avisos, [], `${f}: ${r.avisos.join(' | ')}`);
  }
});

const FALHAS = [
  ['json-quebrado.json', 1],
  ['nao-e-snapshot.json', 2],
  ['schema-desconhecido.json', 2],
  ['sem-ra.json', 2],
  ['tipo-errado.json', 3],
  ['turma-diferente.json', 4]
];
for (const [arquivo, nivel] of FALHAS) {
  test(`${arquivo} falha no nível ${nivel}`, () => {
    const r = validar(arquivo);
    assert.equal(r.ok, false);
    assert.equal(r.nivel_falha, nivel);
    assert.ok(r.erros.length > 0);
  });
}

const AVISOS = [
  ['aviso-xp-adulterado.json', /XP total/],
  ['aviso-data-futura.json', /futuro/],
  ['aviso-dominio-incoerente.json', /domínio do bloco/]
];
for (const [arquivo, padrao] of AVISOS) {
  test(`${arquivo} importa, mas gera aviso`, () => {
    const r = validar(arquivo);
    assert.equal(r.ok, true);
    assert.ok(r.avisos.some((a) => padrao.test(a)), r.avisos.join(' | '));
  });
}

test('aceita exportação de aluno sem nenhuma sessão', () => {
  const s = JSON.parse(ler('9A-2026_900001_2026-03-20.json'));
  Object.assign(s, { sessoes: [], respostas: [], dominio_bloco: [], badges: [] });
  s.progresso.xp_total = 0;
  const r = validarSnapshot(JSON.stringify(s), opcoes);
  assert.equal(r.ok, true, r.erros.join(' | '));
});
