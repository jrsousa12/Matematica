import test from 'node:test';
import assert from 'node:assert/strict';
import { avaliar, valorAlternativa, ultimoNumero, Q } from './racional.mjs';
import { resolverDireto } from './auto.mjs';

const v = (txt) => avaliar(txt).toString();

test('aritmética exata com sinais, ordem e parênteses', () => {
  assert.equal(v('4 + 3 × 5'), '19');
  assert.equal(v('(−9) + 4'), '-5');
  assert.equal(v('−10 + 18 − 12 + 3'), '-1');
  assert.equal(v('(−80) ÷ (−5) ÷ (−2)'), '-8');
  assert.equal(v('10 − (6 − (4 − 9))'), '-1');
});

test('frações e decimais sem erro de arredondamento', () => {
  assert.equal(v('(2/7) + (3/7)'), '5/7');
  assert.equal(v('2 − (3/5) + (1/10)'), '3/2');
  assert.equal(v('0,1 + 0,2'), '3/10');
  assert.equal(v('1,4 × 0,6'), '21/25');
  assert.equal(v('7,5 ÷ 1,5'), '5');
});

test('porcentagem e números em pt-BR', () => {
  assert.equal(v('50% × 84'), '42');
  assert.equal(v('800 × (1 + 5%)'), '840');
  assert.equal(v('1.250 − 380'), '870');
  assert.equal(v('R$ 46,25'), '185/4');
});

test('expressão inválida lança erro (divisão por zero, símbolo estranho)', () => {
  assert.throws(() => avaliar('3 ÷ 0'));
  assert.throws(() => avaliar('3 + abc'));
});

test('valor de alternativa: só aceita valores puros', () => {
  assert.equal(valorAlternativa('R$ 46,25').toString(), '185/4');
  assert.equal(valorAlternativa('−R$ 90').toString(), '-90');
  assert.equal(valorAlternativa('(5/7)').toString(), '5/7');
  assert.equal(valorAlternativa('35%').toString(), '7/20');
  assert.equal(valorAlternativa('120 copos').toString(), '120');
  assert.equal(valorAlternativa('50 − 3 × 12 = R$ 14'), null);
  assert.equal(valorAlternativa('(3/0)'), null);
});

test('último número do texto', () => {
  assert.equal(ultimoNumero('Equipe Azul, por 25 pontos').toString(), '25');
  assert.equal(ultimoNumero('50 − 3 × 12 = R$ 14').toString(), '14');
});

test('resolvedor automático: resolve conta direta e recusa problema em texto', () => {
  assert.equal(resolverDireto('Qual é o resultado de 246 + 138?').valor.toString(), '384');
  assert.equal(resolverDireto('Quanto é 50% de 84?').valor.toString(), '42');
  assert.equal(resolverDireto('Resolva a expressão: −10 + 18 − 12 + 3.').valor.toString(), '-1');
  assert.equal(resolverDireto('Lucas tinha 85 figurinhas e ganhou mais 47. Quantas ficou?'), null);
  assert.ok(new Q(2n, 4n).igual(new Q(1n, 2n)));
});
