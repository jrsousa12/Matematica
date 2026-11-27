import test from 'node:test';
import assert from 'node:assert/strict';
import {
  atualizarDominio, atualizarFila, filaVencida, ultimasDoBloco, modoAdaptacao,
  blocosDisponiveis, verificarAvanco, primeiroDiaDoBloco
} from '../js/motor/adaptive.js';

const q = { id: 'b01_q01', bloco_id: 1 };
const resp = (blocoId, certas) => certas.map((c) => ({ bloco_id: blocoId, correta: c }));

test('domínio: percentual arredondado', () => {
  let d = atualizarDominio(null, 1, true, 'x');
  d = atualizarDominio(d, 1, true, 'x');
  d = atualizarDominio(d, 1, false, 'x');
  assert.equal(d.acertos, 2);
  assert.equal(d.total, 3);
  assert.equal(d.percentual, 67);
});

test('fila: erro novo entra com +3 dias', () => {
  const r = atualizarFila(null, q, false, '2026-02-16');
  assert.equal(r.put.proxima_revisao, '2026-02-19');
  assert.equal(r.put.ultima_resposta, 'erro');
});

test('fila: acerto de questão fora da fila não faz nada', () => {
  assert.deepEqual(atualizarFila(null, q, true, '2026-02-16'), { put: null, remover: null });
});

test('fila: erro de novo -> +7 dias', () => {
  const e = { questao_id: q.id, bloco_id: 1, proxima_revisao: '2026-02-19', tentativas: 1, ultima_resposta: 'erro' };
  const r = atualizarFila(e, q, false, '2026-02-19');
  assert.equal(r.put.proxima_revisao, '2026-02-26');
  assert.equal(r.put.tentativas, 2);
});

test('fila: acerto após erro -> +14 dias; novo acerto sai da fila', () => {
  const e = { questao_id: q.id, bloco_id: 1, proxima_revisao: '2026-02-19', tentativas: 1, ultima_resposta: 'erro' };
  const r1 = atualizarFila(e, q, true, '2026-02-19');
  assert.equal(r1.put.proxima_revisao, '2026-03-05');
  assert.equal(r1.put.ultima_resposta, 'acerto');
  const r2 = atualizarFila(r1.put, q, true, '2026-03-05');
  assert.equal(r2.remover, q.id);
  assert.equal(r2.put, null);
});

test('filaVencida usa data menor ou igual a hoje', () => {
  const fila = [{ proxima_revisao: '2026-02-16' }, { proxima_revisao: '2026-02-17' }];
  assert.equal(filaVencida(fila, '2026-02-16').length, 1);
});

test('ultimasDoBloco considera só as 10 últimas do bloco', () => {
  const r = [...resp(1, Array(10).fill(false)), ...resp(2, [true]), ...resp(1, Array(10).fill(true))];
  const u = ultimasDoBloco(r, 1, 10);
  assert.equal(u.total, 10);
  assert.equal(u.percentual, 100);
});

test('modo de adaptação: normal com menos de 5 respostas', () => {
  assert.equal(modoAdaptacao(resp(1, [false, false, false, false]), 1), 'normal');
});
test('modo de adaptação: reforço (<50%) e dominado (>=80%)', () => {
  assert.equal(modoAdaptacao(resp(1, [true, false, false, false, false, true]), 1), 'reforco');
  assert.equal(modoAdaptacao(resp(1, [true, true, true, true, false]), 1), 'dominado');
  assert.equal(modoAdaptacao(resp(1, [true, true, true, false, false]), 1), 'normal');
});

test('blocosDisponiveis: só blocos com questão ativa, em ordem', () => {
  const blocos = [{ id: 2, ordem: 2 }, { id: 1, ordem: 1 }, { id: 3, ordem: 3 }];
  const questoes = [{ bloco_id: 1 }, { bloco_id: 2, ativa: false }, { bloco_id: 3 }];
  assert.deepEqual(blocosDisponiveis(blocos, questoes), [1, 3]);
});

test('avanço por tempo após 7 dias, mantendo o ritmo semanal', () => {
  const p = { bloco_atual: 1, bloco_inicio: '2026-02-16', blocos_concluidos: [] };
  const dom = { 1: { total: 5, percentual: 50 } };
  const r = verificarAvanco(p, dom, [1, 2, 3], '2026-02-23');
  assert.equal(r.progresso.bloco_atual, 2);
  assert.equal(r.progresso.bloco_inicio, '2026-02-23');
  assert.equal(r.concluidos[0].criterio, 'tempo');
  assert.equal(r.concluidos[0].recompensa, true);
});

test('aluno ausente acompanha o ritmo da turma (vários blocos)', () => {
  const p = { bloco_atual: 1, bloco_inicio: '2026-02-16', blocos_concluidos: [] };
  const r = verificarAvanco(p, {}, [1, 2, 3, 4], '2026-03-05'); // 17 dias
  assert.equal(r.progresso.bloco_atual, 3);
  assert.equal(r.concluidos.length, 2);
  assert.equal(r.concluidos[0].recompensa, false); // não praticou: sem XP de bloco
});

test('avanço por desempenho: 20 questões e 80%', () => {
  const p = { bloco_atual: 1, bloco_inicio: '2026-02-16', blocos_concluidos: [] };
  const r = verificarAvanco(p, { 1: { total: 20, percentual: 80 } }, [1, 2], '2026-02-18');
  assert.equal(r.progresso.bloco_atual, 2);
  assert.equal(r.concluidos[0].criterio, 'desempenho');
  assert.equal(r.progresso.bloco_inicio, '2026-02-18');
});

test('sem avanço com 19 questões ou 79%', () => {
  const p = { bloco_atual: 1, bloco_inicio: '2026-02-16', blocos_concluidos: [] };
  assert.equal(verificarAvanco(p, { 1: { total: 19, percentual: 90 } }, [1, 2], '2026-02-18').progresso.bloco_atual, 1);
  assert.equal(verificarAvanco(p, { 1: { total: 25, percentual: 79 } }, [1, 2], '2026-02-18').progresso.bloco_atual, 1);
});

test('não avança se não há próximo bloco disponível', () => {
  const p = { bloco_atual: 3, bloco_inicio: '2026-01-01', blocos_concluidos: [] };
  const r = verificarAvanco(p, {}, [1, 2, 3], '2026-02-18');
  assert.equal(r.progresso.bloco_atual, 3);
  assert.equal(r.concluidos.length, 0);
});

test('primeiroDiaDoBloco', () => {
  const p = { bloco_atual: 2, bloco_inicio: '2026-02-16' };
  assert.equal(primeiroDiaDoBloco(p, [], '2026-02-16'), true);
  assert.equal(primeiroDiaDoBloco(p, [], '2026-02-18'), true); // nenhum contato antes
  const antes = [{ bloco_id: 2, respondida_em: '2026-02-17T10:00:00-03:00' }];
  assert.equal(primeiroDiaDoBloco(p, antes, '2026-02-18'), false);
});
