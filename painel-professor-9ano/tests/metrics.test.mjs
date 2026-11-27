// Testes das métricas e do detector de risco (funções puras, sem banco).
// Rodar: cd painel-professor-9ano && node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularTurma, faixaDeUso, resolverPeriodo } from '../js/analytics/metrics.js';
import { detectarRisco, corDominio } from '../js/analytics/risk-detector.js';

const CONFIG = { meta_streak: 3, risco_acerto_minimo: 50, risco_dias_sem_exportar: 10 };
const HOJE = '2026-03-20';

function aluno(ra, { dias = [], acertos = [], streak = 0, exportou = '2026-03-19', desafio = [] } = {}) {
  return {
    aluno: { ra, nome: `Aluno ${ra}`, exported_at: `${exportou}T10:00:00-03:00` },
    progresso: { streak_atual: streak, bloco_atual: 2 },
    export_log: { ultima_exportacao: `${exportou}T10:00:00-03:00` },
    sessoes: [
      ...dias.map((d, i) => ({ id: `s${i}`, tipo: 'missao', data: `${d}T18:00:00-03:00` })),
      ...desafio.map((d, i) => ({ id: `d${i}`, tipo: 'desafio', data: `${d}T18:00:00-03:00` }))
    ],
    respostas: acertos.map((c, i) => ({ id: `r${i}`, correta: c, bloco_id: 1, respondida_em: `${dias[0] ?? HOJE}T18:00:00-03:00` })),
    dominio_bloco: [{ bloco_id: 1, percentual: 70 }]
  };
}

test('risco: nenhum, um e dois motivos', () => {
  assert.equal(detectarRisco({ streak: 5, acerto: 80, diasSemExportar: 2 }, CONFIG).nivel, 'ok');
  assert.equal(detectarRisco({ streak: 1, acerto: 80, diasSemExportar: 2 }, CONFIG).nivel, 'atencao');
  const r = detectarRisco({ streak: 1, acerto: 40, diasSemExportar: 2 }, CONFIG);
  assert.equal(r.nivel, 'risco');
  assert.equal(r.motivos.length, 2);
});

test('risco: limites exatos não contam (streak 3, acerto 50, 10 dias)', () => {
  assert.equal(detectarRisco({ streak: 3, acerto: 50, diasSemExportar: 10 }, CONFIG).nivel, 'ok');
  assert.equal(detectarRisco({ streak: 3, acerto: 50, diasSemExportar: 11 }, CONFIG).nivel, 'atencao');
});

test('risco: sem respostas no período não gera motivo de acerto', () => {
  assert.equal(detectarRisco({ streak: 4, acerto: null, diasSemExportar: 0 }, CONFIG).nivel, 'ok');
});

test('cores do mini-mapa', () => {
  assert.deepEqual([null, 59, 60, 79, 80].map(corDominio), ['cinza', 'vermelho', 'amarelo', 'amarelo', 'verde']);
});

test('faixas de uso: alta, média e baixa', () => {
  assert.deepEqual([3, 2.9, 1, 0.9].map(faixaDeUso), ['alta', 'media', 'media', 'baixa']);
});

test('período: início usa a primeira sessão; 30d e personalizado', () => {
  const itens = [aluno('1', { dias: ['2026-02-16', '2026-03-01'] })];
  assert.deepEqual(resolverPeriodo({ tipo: 'inicio' }, itens, HOJE), { inicio: '2026-02-16', fim: HOJE });
  assert.deepEqual(resolverPeriodo({ tipo: '30d' }, itens, HOJE), { inicio: '2026-02-19', fim: HOJE });
  assert.deepEqual(resolverPeriodo({ tipo: 'personalizado', de: '2026-03-10', ate: '2026-03-05' }, itens, HOJE), { inicio: '2026-03-05', fim: '2026-03-10' });
});

test('cards: ativos, sessões por semana, acerto e risco', () => {
  const itens = [
    aluno('1', { dias: ['2026-03-16', '2026-03-17', '2026-03-18', '2026-03-19'], acertos: [true, true, true, false], streak: 4 }),
    aluno('2', { dias: ['2026-03-10'], acertos: [false, false], streak: 0 }),
    aluno('3', { dias: ['2026-03-13', '2026-03-19'], acertos: [true], streak: 1, exportou: '2026-03-01' })
  ];
  const t = calcularTurma(itens, { tipo: 'personalizado', de: '2026-03-14', ate: HOJE }, HOJE, CONFIG);
  assert.equal(t.resumo.total, 3);
  assert.equal(t.resumo.ativos, 2); // 1 e 3 tiveram missão nos últimos 7 dias; o 2 não
  assert.equal(t.semanas, 1);
  assert.equal(t.resumo.sessoesPorSemana, 2.5); // (4 + 1) / 2 ativos; a sessão de 13/03 do aluno 3 fica fora
  assert.equal(t.resumo.acertoMedio, 75); // só o aluno 1 respondeu dentro do período: 3 de 4
  assert.equal(t.resumo.emRisco, 2); // aluno 2 (streak 0) e aluno 3 (streak 1 e 19 dias sem exportar)
  assert.equal(t.alunos[2].risco.nivel, 'risco');
});

test('desafio diário não conta como sessão de prática', () => {
  const itens = [aluno('1', { dias: ['2026-03-19'], desafio: ['2026-03-18', '2026-03-19'] })];
  const t = calcularTurma(itens, { tipo: '30d' }, HOJE, CONFIG);
  assert.equal(t.alunos[0].sessoes, 1);
});

test('turma vazia não quebra', () => {
  const t = calcularTurma([], { tipo: 'inicio' }, HOJE, CONFIG);
  assert.deepEqual(t.resumo, { total: 0, ativos: 0, sessoesPorSemana: null, acertoMedio: null, emRisco: 0 });
});
