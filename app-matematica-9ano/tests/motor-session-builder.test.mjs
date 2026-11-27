import test from 'node:test';
import assert from 'node:assert/strict';
import { planejarSessao, nivelAlvo, escolherProxima, escolherDesafio } from '../js/motor/session-builder.js';

const DIFS = ['facil', 'media', 'dificil'];
function gerarQuestoes(blocos) {
  const qs = [];
  blocos.forEach((b) => {
    for (let i = 0; i < 15; i++) {
      qs.push({ id: `b${b}_q${i}`, bloco_id: b, ativa: true, dificuldade: DIFS[i % 3] });
    }
  });
  return qs;
}
function estado(extra = {}) {
  return {
    blocos: [1, 2, 3].map((id) => ({ id, ordem: id })),
    questoes: gerarQuestoes([1, 2, 3]),
    respostas: [], dominio: [], fila: [],
    progresso: { bloco_atual: 3, bloco_inicio: '2026-02-09' },
    ...extra
  };
}
// Respostas antigas no bloco atual, para não ser o 1º dia do bloco.
const antigas = [{ bloco_id: 3, questao_id: 'x', correta: true, respondida_em: '2026-02-10T10:00:00-03:00' }];

test('1º dia do bloco: 5 questões do bloco novo', () => {
  const s = planejarSessao(estado({ progresso: { bloco_atual: 3, bloco_inicio: '2026-02-16' } }), '2026-02-16', 's1');
  assert.deepEqual(s.fontes, ['atual', 'atual', 'atual', 'atual', 'atual']);
});

test('dia normal: revisão nas posições 2 e 4', () => {
  const s = planejarSessao(estado({ respostas: antigas }), '2026-02-16', 's1');
  assert.deepEqual(s.fontes, ['atual', 'revisao', 'atual', 'revisao', 'atual']);
});

test('sem bloco anterior para revisar: 5 do atual', () => {
  const e = estado({ respostas: antigas, progresso: { bloco_atual: 1, bloco_inicio: '2026-02-09' } });
  assert.deepEqual(planejarSessao(e, '2026-02-16', 's1').fontes, Array(5).fill('atual'));
});

test('modo dominado: 2 atuais + 3 revisões', () => {
  const certas = Array.from({ length: 10 }, (_, i) => ({
    bloco_id: 3, questao_id: `r${i}`, correta: true, respondida_em: '2026-02-10T10:00:00-03:00'
  }));
  const s = planejarSessao(estado({ respostas: certas }), '2026-02-16', 's1');
  assert.equal(s.modo, 'dominado');
  assert.equal(s.fontes.filter((f) => f === 'revisao').length, 3);
});

test('modo reforço limita a dificuldade a média', () => {
  const erradas = Array.from({ length: 6 }, (_, i) => ({
    bloco_id: 3, questao_id: `r${i}`, correta: false, respondida_em: '2026-02-10T10:00:00-03:00'
  }));
  const s = planejarSessao(estado({ respostas: erradas }), '2026-02-16', 's1');
  assert.equal(s.modo, 'reforco');
  assert.equal(s.nivel_max, 2);
});

test('nivelAlvo segue a curva 1-2-3-2-1 quando acerta', () => {
  const itens = [];
  const sessao = { itens, nivel_max: 3 };
  const alvos = [];
  for (let i = 0; i < 5; i++) {
    const alvo = nivelAlvo(sessao);
    alvos.push(alvo);
    itens.push({ correta: true, nivel: alvo });
  }
  assert.deepEqual(alvos, [1, 2, 3, 2, 1]);
});

test('nivelAlvo não sobe após erro', () => {
  const sessao = { itens: [{ correta: true, nivel: 1 }, { correta: false, nivel: 2 }], nivel_max: 3 };
  assert.equal(nivelAlvo(sessao), 2); // curva pediria 3, mas errou a média
  const s2 = { itens: [{ correta: false, nivel: 1 }], nivel_max: 3 };
  assert.equal(nivelAlvo(s2), 1); // errou fácil: mantém fácil
});

test('escolherProxima: sem repetir questão e revisão em bloco anterior', () => {
  const e = estado({ respostas: antigas });
  const s = planejarSessao(e, '2026-02-16', 's1');
  const usadas = new Set();
  for (let i = 0; i < 5; i++) {
    const p = escolherProxima(e, s, '2026-02-16');
    assert.ok(p, `questão ${i + 1} deve existir`);
    assert.ok(!usadas.has(p.questao.id), 'não repete questão');
    usadas.add(p.questao.id);
    if (s.fontes[i] === 'revisao') assert.ok(p.questao.bloco_id < 3);
    else assert.equal(p.questao.bloco_id, 3);
    s.itens.push({ questao_id: p.questao.id, correta: true, nivel: p.nivel });
    if (p.fonte === 'revisao') s.blocos_revisao.push(p.questao.bloco_id);
  }
  assert.equal(escolherProxima(e, s, '2026-02-16'), null);
});

test('revisão nunca repete o mesmo bloco na sessão', () => {
  const e = estado({ respostas: antigas });
  const s = planejarSessao(e, '2026-02-16', 's1');
  const blocosRev = [];
  for (let i = 0; i < 5; i++) {
    const p = escolherProxima(e, s, '2026-02-16');
    if (p.fonte === 'revisao') { blocosRev.push(p.questao.bloco_id); s.blocos_revisao.push(p.questao.bloco_id); }
    s.itens.push({ questao_id: p.questao.id, correta: true, nivel: p.nivel });
  }
  assert.equal(new Set(blocosRev).size, blocosRev.length);
});

test('revisão prioriza o bloco com menor domínio (<60%)', () => {
  const e = estado({
    respostas: antigas,
    dominio: [
      { bloco_id: 1, total: 10, percentual: 90 },
      { bloco_id: 2, total: 10, percentual: 40 }
    ]
  });
  const s = planejarSessao(e, '2026-02-16', 's1');
  s.itens.push({ questao_id: 'b3_q0', correta: true, nivel: 1 }); // posição 2 = revisão
  const p = escolherProxima(e, s, '2026-02-16');
  assert.equal(p.fonte, 'revisao');
  assert.equal(p.questao.bloco_id, 2);
});

test('desafio diário: questão difícil do bloco atual ou anteriores', () => {
  const e = estado();
  for (let i = 0; i < 20; i++) {
    const q = escolherDesafio(e);
    assert.equal(q.dificuldade, 'dificil');
    assert.ok(q.bloco_id <= 3);
  }
});

test('desafio diário: sem questão difícil devolve null', () => {
  const e = estado({ questoes: gerarQuestoes([3]).filter((q) => q.dificuldade !== 'dificil') });
  assert.equal(escolherDesafio(e), null);
});
