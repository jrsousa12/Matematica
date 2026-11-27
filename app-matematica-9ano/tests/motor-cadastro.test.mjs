// Testes das partes puras de cadastro.js. O modulo importa o repositorio (Dexie),
// entao usamos um Dexie falso apenas para permitir o import em Node.
import test from 'node:test';
import assert from 'node:assert/strict';

const falso = new Proxy(function () {}, { get: () => falso, apply: () => falso, construct: () => falso });
globalThis.Dexie = falso;
const { gerarCodigoAluno, normalizarCodigo, validarCadastro, EXIGIR_RA, EXIGIR_CODIGO_TURMA } =
  await import('../js/motor/cadastro.js');

test('gerarCodigoAluno: 6 caracteres sem letras confundíveis', () => {
  for (let i = 0; i < 200; i++) {
    const c = gerarCodigoAluno();
    assert.match(c, /^[A-HJKMNP-Z2-9]{6}$/);
  }
});

test('gerarCodigoAluno: usa o sorteio recebido', () => {
  assert.equal(gerarCodigoAluno(() => 0), 'AAAAAA');
});

test('normalizarCodigo: maiúsculas e sem espaços', () => {
  assert.equal(normalizarCodigo(' 9a - 2026 '), '9A-2026');
  assert.equal(normalizarCodigo(null), '');
});

test('validarCadastro: nome curto e aviso não aceito geram erros', () => {
  const v = validarCadastro({ nome: 'Ab', aceite: false }, '9A-2026');
  assert.equal(v.valido, false);
  assert.ok(v.erros.nome);
  assert.ok(v.erros.aceite);
});

test('validarCadastro: nome é limpo e RA/código automático é gerado', () => {
  const v = validarCadastro({ nome: '  Maria   da Silva ', aceite: true }, '9A-2026');
  assert.equal(v.valido, true);
  assert.equal(v.dados.nome, 'Maria da Silva');
  if (!EXIGIR_RA) assert.match(v.dados.ra, /^[A-HJKMNP-Z2-9]{6}$/);
  if (!EXIGIR_CODIGO_TURMA) assert.equal(v.erros.codigo, undefined);
});
