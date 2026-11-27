// Testes das linhas do relatório e do CSV (funções puras). Rodar: cd painel-professor-9ano && node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { montarLinhas, filtrarPorSituacao, COLUNAS, nomeArquivo } from '../js/reports/dados-relatorio.js';
import { gerarCsv } from '../js/reports/csv-exporter.js';

const alunos = [
  { ra: 'B2', nome: 'Zélia', faixa: 'media', sessoesPorSemana: 1.5, streak: 4, acerto: 72, blocoAtual: 3, ultimaExportacao: '2026-03-19', diasSemExportar: 1, risco: { nivel: 'ok', motivos: [] } },
  { ra: 'A1', nome: 'Ana; "Maria"', faixa: 'baixa', sessoesPorSemana: 0, streak: 0, acerto: null, blocoAtual: 1, ultimaExportacao: '2026-03-01', diasSemExportar: 19, risco: { nivel: 'risco', motivos: ['Streak abaixo de 3', 'Sem exportar há 19 dias'] } }
];
const itens = [{ aluno: { ra: 'B2' }, progresso: { xp_total: 300, nivel: 3 } }, { aluno: { ra: 'A1' } }];

test('linhas: ordem por nome, formatos pt-BR e colunas completas', () => {
  const l = montarLinhas(alunos, itens);
  assert.equal(l[0][0], 'A1');
  assert.equal(l[1][5], '1,5');
  assert.equal(l[1][9], '72%');
  assert.equal(l[0][9], '-');
  assert.equal(l[0][7], 0);
  assert.equal(l[1][7], 300);
  assert.equal(l[1][11], '19/03/2026');
  assert.ok(l.every((x) => x.length === COLUNAS.length));
});

test('filtro de situação', () => {
  assert.equal(filtrarPorSituacao(alunos, 'todos').length, 2);
  assert.equal(filtrarPorSituacao(alunos, 'risco').length, 1);
  assert.equal(filtrarPorSituacao(alunos, 'ok')[0].ra, 'B2');
  assert.equal(filtrarPorSituacao(alunos, 'atencao').length, 0);
});

test('CSV: BOM, separador ;, aspas escapadas e proteção de fórmula', () => {
  const csv = gerarCsv([['1', 'Ana; "Maria"', '=SOMA(A1)', '-', '72%']]);
  assert.equal(csv.charCodeAt(0), 0xFEFF);
  assert.ok(csv.startsWith('﻿Código;Nome;'));
  assert.ok(csv.includes('"Ana; ""Maria"""'));
  assert.ok(csv.includes("'=SOMA(A1)"));
  assert.ok(csv.includes(';-;72%'));
  assert.ok(csv.endsWith('\r\n'));
});

test('nome do arquivo', () => {
  assert.equal(nomeArquivo({ turma_codigo: '9A-2026' }, '2026-03-20', 'csv'), 'relatorio_9A-2026_2026-03-20.csv');
});
