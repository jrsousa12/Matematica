import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bonusStreak, nivelPorXp, progressoNivel, xpPorResposta, moedasPorResposta,
  aplicarGanhos, atualizarSequencia, avaliarBadges, registrosBadges, BADGES
} from '../js/motor/gamification.js';

test('bônus de streak: 5 por dia, teto 50', () => {
  assert.equal(bonusStreak(1), 5);
  assert.equal(bonusStreak(10), 50);
  assert.equal(bonusStreak(30), 50);
});

test('níveis nas fronteiras da curva', () => {
  assert.equal(nivelPorXp(0), 1);
  assert.equal(nivelPorXp(99), 1);
  assert.equal(nivelPorXp(100), 2);
  assert.equal(nivelPorXp(4499), 9);
  assert.equal(nivelPorXp(4500), 10);
  assert.equal(nivelPorXp(99999), 10);
});

test('progressoNivel: barra de XP', () => {
  assert.deepEqual(progressoNivel(175), { nivel: 2, inicio: 100, fim: 250, percentual: 50, faltam: 75 });
  assert.equal(progressoNivel(5000).percentual, 100);
});

test('XP e moedas por resposta', () => {
  assert.equal(xpPorResposta(true), 10);
  assert.equal(xpPorResposta(false), 2);
  assert.equal(moedasPorResposta(true), 5);
  assert.equal(moedasPorResposta(false), 0);
});

test('aplicarGanhos soma e recalcula o nível sem mutar a entrada', () => {
  const p = { xp_total: 95, moedas: 10, nivel: 1 };
  const r = aplicarGanhos(p, 10, 5);
  assert.equal(r.xp_total, 105);
  assert.equal(r.moedas, 15);
  assert.equal(r.nivel, 2);
  assert.equal(p.xp_total, 95);
});

test('sequência de acertos zera no erro', () => {
  let p = { sequencia_acertos: 3 };
  p = atualizarSequencia(p, true);
  assert.equal(p.sequencia_acertos, 4);
  p = atualizarSequencia(p, false);
  assert.equal(p.sequencia_acertos, 0);
});

test('existem exatamente 12 badges', () => {
  assert.equal(BADGES.length, 12);
});

test('badges de streak e primeiro passo', () => {
  const novas = avaliarBadges({ progresso: { streak_atual: 7 }, missaoConcluida: true }, []);
  assert.deepEqual(novas.sort(), ['primeiro_passo', 'streak_3', 'streak_7']);
});

test('badge já conquistada não repete', () => {
  const novas = avaliarBadges({ progresso: { streak_atual: 3 }, missaoConcluida: true }, ['primeiro_passo', 'streak_3']);
  assert.deepEqual(novas, []);
});

test('badges de blocos exigem os dois blocos do par', () => {
  assert.deepEqual(avaliarBadges({ progresso: { blocos_concluidos: [1] } }, []), []);
  assert.deepEqual(avaliarBadges({ progresso: { blocos_concluidos: [1, 2] } }, []), ['blocos_1_2']);
});

test('prática perfeita: 100% com pelo menos 3 questões', () => {
  const ctx = (a, t) => ({ progresso: {}, missaoConcluida: true, acertosSessao: a, totalSessao: t });
  assert.ok(avaliarBadges(ctx(5, 5), []).includes('pratica_perfeita'));
  assert.ok(!avaliarBadges(ctx(4, 5), []).includes('pratica_perfeita'));
  assert.ok(!avaliarBadges(ctx(2, 2), []).includes('pratica_perfeita'));
});

test('sequencia_10 dispara com 10 acertos seguidos', () => {
  assert.ok(!avaliarBadges({ progresso: { sequencia_acertos: 9 } }, []).includes('sequencia_10'));
  assert.ok(avaliarBadges({ progresso: { sequencia_acertos: 10 } }, []).includes('sequencia_10'));
});

test('registrosBadges monta os registros', () => {
  assert.deepEqual(registrosBadges(['streak_3'], 'X'), [{ id: 'streak_3', conquistada: true, conquistada_em: 'X' }]);
});
