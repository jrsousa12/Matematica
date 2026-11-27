import test from 'node:test';
import assert from 'node:assert/strict';
import { avaliarDiasPerdidos, registrarMissao, situacaoStreak, aplicarViradaSemanal } from '../js/motor/streak.js';

// 2026-02-16 é segunda-feira (semana 2026-W08).
const base = { streak_atual: 4, streak_recorde: 4, ultima_missao_data: '2026-02-16', dias_congelados: [] };

test('sem dias perdidos: streak intacto', () => {
  const r = avaliarDiasPerdidos(base, '2026-02-17');
  assert.equal(r.progresso.streak_atual, 4);
  assert.equal(r.freezesConsumidos, 0);
  assert.equal(r.quebrou, false);
});

test('faltar 1 dia consome o freeze e preserva o streak', () => {
  const r = avaliarDiasPerdidos(base, '2026-02-18');
  assert.equal(r.freezesConsumidos, 1);
  assert.equal(r.quebrou, false);
  assert.equal(r.progresso.streak_atual, 4);
  assert.deepEqual(r.progresso.dias_congelados, ['2026-02-17']);
  assert.equal(r.progresso.freezes_usados_semana, 1);
});

test('faltar 2 dias na mesma semana zera o streak', () => {
  const r = avaliarDiasPerdidos(base, '2026-02-19');
  assert.equal(r.quebrou, true);
  assert.equal(r.progresso.streak_atual, 0);
});

test('freeze desativado: faltar 1 dia zera o streak', () => {
  const r = avaliarDiasPerdidos(base, '2026-02-18', false);
  assert.equal(r.quebrou, true);
});

test('freeze renova na semana seguinte', () => {
  const p = { ...base, ultima_missao_data: '2026-02-22', dias_congelados: ['2026-02-18'] }; // domingo
  const r = avaliarDiasPerdidos(p, '2026-02-24'); // faltou segunda (outra semana)
  assert.equal(r.quebrou, false);
  assert.equal(r.progresso.freezes_usados_semana, 1);
});

test('streak zero ou sem missão: nada a avaliar', () => {
  const r = avaliarDiasPerdidos({ streak_atual: 0, ultima_missao_data: null, dias_congelados: [] }, '2026-02-20');
  assert.equal(r.quebrou, false);
  assert.equal(r.freezesConsumidos, 0);
});

test('virada semanal atualiza semana_ref e descarta congelamentos antigos', () => {
  const p = aplicarViradaSemanal({ dias_congelados: ['2025-12-01', '2026-02-17'] }, '2026-02-20');
  assert.equal(p.semana_ref, '2026-W08');
  assert.deepEqual(p.dias_congelados, ['2026-02-17']);
});

test('registrarMissao soma 1 e atualiza recorde na 1ª missão do dia', () => {
  const r = registrarMissao(base, '2026-02-17');
  assert.equal(r.primeiraDoDia, true);
  assert.equal(r.progresso.streak_atual, 5);
  assert.equal(r.progresso.streak_recorde, 5);
  assert.equal(r.progresso.ultima_missao_data, '2026-02-17');
});

test('segunda missão no mesmo dia não soma de novo', () => {
  const r = registrarMissao(base, '2026-02-16');
  assert.equal(r.primeiraDoDia, false);
  assert.equal(r.progresso.streak_atual, 4);
});

test('após quebra, a próxima missão recomeça em 1 e preserva o recorde', () => {
  const r = registrarMissao(base, '2026-02-19');
  assert.equal(r.progresso.streak_atual, 1);
  assert.equal(r.progresso.streak_recorde, 4);
});

test('situacaoStreak', () => {
  assert.equal(situacaoStreak({ streak_atual: 0 }, '2026-02-16'), 'inativo');
  assert.equal(situacaoStreak(base, '2026-02-16'), 'feito_hoje');
  assert.equal(situacaoStreak(base, '2026-02-17'), 'pendente_hoje');
});
