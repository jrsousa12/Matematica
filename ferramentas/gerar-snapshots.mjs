// Motor: gera snapshots JSON de alunos fictícios para testar o painel do professor.
// Uso (na raiz do repositório):
//   node ferramentas/gerar-snapshots.mjs [--hoje 2026-03-20] [--semente 9] [--saida ferramentas/saida/snapshots]
// Os arquivos válidos seguem o schema 1.0 do app do aluno; os da pasta "problemas/"
// têm defeitos de propósito, para testar a validação e os avisos de adulteração.

process.env.TZ = 'America/Sao_Paulo'; // fuso da turma (antes de qualquer data)

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { simularAluno, criarRng } from './simulador.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DADOS = join(RAIZ, 'app-matematica-9ano/js/data');
const INICIO_PILOTO = '2026-02-16'; // segunda-feira

function argumento(nome, padrao) {
  const i = process.argv.indexOf(`--${nome}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : padrao;
}

const hoje = argumento('hoje', '2026-03-20');
const semente = Number(argumento('semente', 9));
const saida = join(RAIZ, argumento('saida', 'ferramentas/saida/snapshots'));

const indice = JSON.parse(readFileSync(join(DADOS, 'blocos.json'), 'utf8'));
const questoes = indice.lotes.flatMap((l) => JSON.parse(readFileSync(join(DADOS, `questoes-${l}.json`), 'utf8')))
  .filter((q) => q.ativa !== false);
const turma = indice.turma.codigo;
const versoes = { app: '1.0.0', conteudo: indice.content_version };

// Faixas de uso da especificação (seção 1.2) + casos de risco do painel.
const FAIXAS = [
  { faixa: 'alta', qtd: 8, chanceDia: 0.8, acerto: 0.78 },
  { faixa: 'media', qtd: 7, chanceDia: 0.25, acerto: 0.62 },
  { faixa: 'baixa', qtd: 5, chanceDia: 0.07, acerto: 0.5 },
  { faixa: 'risco_acerto', qtd: 2, chanceDia: 0.6, acerto: 0.35 },
  { faixa: 'sem_exportar', qtd: 2, chanceDia: 0.6, acerto: 0.7, diasSemExportar: 13 }
];

const nomeArquivo = (s) => `${s.turma_codigo}_${s.perfil.ra}_${s.exported_at.slice(0, 10)}.json`;
const json = (obj) => JSON.stringify(obj, null, 2);

rmSync(saida, { recursive: true, force: true });
mkdirSync(join(saida, 'problemas'), { recursive: true });

const rng = criarRng(semente);
const validos = [];
let n = 0;
FAIXAS.forEach((f) => {
  for (let i = 0; i < f.qtd; i++) {
    n += 1;
    const perfil = { ...f, nome: `Aluno Teste ${String(n).padStart(2, '0')}`, ra: String(900000 + n) };
    const snap = simularAluno({ perfil, inicio: INICIO_PILOTO, fim: hoje, questoes, turma, versoes, rng });
    writeFileSync(join(saida, nomeArquivo(snap)), json(snap));
    validos.push({ faixa: f.faixa, snap });
  }
});

// Mesmo aluno exportado uma semana antes: o painel deve manter só o mais recente.
const base = validos[0].snap;
const antigo = simularAluno({
  perfil: { ...FAIXAS[0], nome: base.perfil.nome, ra: base.perfil.ra, diasSemExportar: 7 },
  inicio: INICIO_PILOTO, fim: hoje, questoes, turma, versoes, rng: criarRng(semente + 1)
});
writeFileSync(join(saida, nomeArquivo(antigo)), json(antigo));

// Arquivos com defeito de propósito.
const copia = () => JSON.parse(JSON.stringify(validos[1].snap));
const problemas = {
  'json-quebrado.json': '{ "schema_version": "1.0", "perfil": { "nome": "Aluno ',
  'nao-e-snapshot.json': json({ titulo: 'lista de compras', itens: ['arroz', 'feijão'] }),
  'schema-desconhecido.json': json({ ...copia(), schema_version: '2.0' }),
  'sem-ra.json': json((() => { const s = copia(); delete s.perfil.ra; return s; })()),
  'tipo-errado.json': json((() => { const s = copia(); s.progresso.xp_total = 'muito'; return s; })()),
  'turma-diferente.json': json({ ...copia(), turma_codigo: '9B-2026' }),
  'aviso-xp-adulterado.json': json((() => { const s = copia(); s.progresso.xp_total *= 10; return s; })()),
  'aviso-data-futura.json': json({ ...copia(), exported_at: '2030-01-01T10:00:00-03:00' }),
  'aviso-dominio-incoerente.json': json((() => {
    const s = copia(); s.dominio_bloco.forEach((d) => { d.acertos = d.total; d.percentual = 100; }); return s;
  })())
};
Object.entries(problemas).forEach(([nome, conteudo]) => writeFileSync(join(saida, 'problemas', nome), conteudo));

// Resumo curto (sem despejar os arquivos).
const resumo = {};
validos.forEach(({ faixa, snap }) => {
  const r = (resumo[faixa] ||= { alunos: 0, sessoes: 0 });
  r.alunos += 1;
  r.sessoes += snap.sessoes.length;
});
console.log(`Snapshots em ${saida} (data de referência ${hoje}, semente ${semente})`);
Object.entries(resumo).forEach(([f, r]) => console.log(`  ${f}: ${r.alunos} alunos, ${r.sessoes} sessões`));
console.log(`  + 1 exportação antiga do RA ${base.perfil.ra} e ${Object.keys(problemas).length} arquivos em problemas/`);
