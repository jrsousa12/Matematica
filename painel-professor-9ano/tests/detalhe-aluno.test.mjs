// Testes do detalhe do aluno (função pura). Rodar: cd painel-professor-9ano && node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { montarDetalhe } from '../js/analytics/detalhe-aluno.js';

const item = {
  aluno: { ra: '1', nome: 'Ana', turma_codigo: '9A-2026' },
  progresso: { xp_total: 10 },
  export_log: { total_exportacoes: 2 },
  sessoes: Array.from({ length: 12 }, (_, i) => ({ id: `s${i}`, tipo: i === 0 ? 'desafio' : 'missao', data: `2026-03-${String(i + 1).padStart(2, '0')}T10:00:00-03:00`, bloco_id: 1, acertos: 3, total: 5, xp_ganho: 40 })),
  respostas: [{ tempo_seg: 10 }, { tempo_seg: 21 }, {}],
  dominio_bloco: [{ bloco_id: 2, percentual: 75, acertos: 3, total: 4 }],
  badges: [{ id: 'primeiro_passo', conquistada: true }, { id: 'streak_3', conquistada: false }]
};
const calc = { risco: { nivel: 'ok', motivos: [] }, faixa: 'alta', sessoesPorSemana: 3, acerto: 80, ultimaExportacao: '2026-03-19', diasSemExportar: 1 };

test('detalhe: 10 blocos, com e sem dados', () => {
  const d = montarDetalhe(item, calc);
  assert.equal(d.blocos.length, 10);
  assert.equal(d.blocos[1].percentual, 75);
  assert.equal(d.blocos[0].percentual, null);
});

test('detalhe: 10 sessões mais recentes primeiro, tipos em português', () => {
  const d = montarDetalhe(item, calc);
  assert.equal(d.recentes.length, 10);
  assert.ok(d.recentes[0].data.startsWith('2026-03-12'));
  assert.equal(montarDetalhe({ ...item, sessoes: [item.sessoes[0]] }, calc).recentes[0].tipo, 'Desafio diário');
});

test('detalhe: 12 badges, só os conquistados marcados; tempo médio ignora vazios', () => {
  const d = montarDetalhe(item, calc);
  assert.equal(d.badges.length, 12);
  assert.deepEqual(d.badges.filter((b) => b.conquistada).map((b) => b.id), ['primeiro_passo']);
  assert.equal(d.tempoMedio, 16);
  assert.equal(montarDetalhe({ ...item, respostas: [] }, calc).tempoMedio, null);
});
