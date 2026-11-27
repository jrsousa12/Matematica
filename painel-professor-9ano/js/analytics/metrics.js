// Métricas calculadas na leitura (funções puras, sem banco). Recebem os itens de lerBase().
// Sessão de prática = sessão do tipo "missao" (o desafio diário não conta para a métrica-norte).

import { diferencaDias, somarDias } from '../util/datas.js';
import { detectarRisco } from './risk-detector.js';

export const TOTAL_BLOCOS = 10;
const DIAS_ATIVO = 7;

const dia = (iso) => String(iso).slice(0, 10);
const media = (lista) => (lista.length ? lista.reduce((a, b) => a + b, 0) / lista.length : null);

// filtro: { tipo: 'inicio' | '30d' | 'personalizado', de, ate } (datas AAAA-MM-DD).
export function resolverPeriodo(filtro, itens, hojeDia) {
  if (filtro.tipo === '30d') return { inicio: somarDias(hojeDia, -29), fim: hojeDia };
  if (filtro.tipo === 'personalizado') {
    const inicio = filtro.de || '0000-01-01';
    const fim = filtro.ate || hojeDia;
    return inicio <= fim ? { inicio, fim } : { inicio: fim, fim: inicio };
  }
  const dias = itens.flatMap((i) => i.sessoes.map((s) => dia(s.data)));
  return { inicio: dias.length ? dias.reduce((a, b) => (a < b ? a : b)) : hojeDia, fim: hojeDia };
}

const noPeriodo = (iso, p) => dia(iso) >= p.inicio && dia(iso) <= p.fim;

// Faixas de uso da pesquisa: alta (>= 3 por semana), média (1 a 2), baixa (< 1).
export function faixaDeUso(sessoesPorSemana) {
  if (sessoesPorSemana >= 3) return 'alta';
  if (sessoesPorSemana >= 1) return 'media';
  return 'baixa';
}

function diasSemExportar(item, hojeDia) {
  const ultima = item.export_log?.ultima_exportacao ?? item.aluno.exported_at;
  return Math.max(0, diferencaDias(dia(ultima), hojeDia));
}

function calcularAluno(item, periodo, semanas, hojeDia, config) {
  const missoes = item.sessoes.filter((s) => s.tipo === 'missao' && noPeriodo(s.data, periodo));
  const respostas = item.respostas.filter((r) => noPeriodo(r.respondida_em, periodo));
  const acertos = respostas.filter((r) => r.correta).length;
  const acerto = respostas.length ? Math.round((acertos / respostas.length) * 100) : null;
  const sessoesPorSemana = missoes.length / semanas;
  const limiteAtivo = somarDias(periodo.fim, -(DIAS_ATIVO - 1));
  const ativo = item.sessoes.some((s) => s.tipo === 'missao' && dia(s.data) >= limiteAtivo && dia(s.data) <= periodo.fim);
  const streak = item.progresso?.streak_atual ?? 0;
  const dominio = {};
  for (const d of item.dominio_bloco) dominio[d.bloco_id] = d.percentual;
  const exportar = diasSemExportar(item, hojeDia);
  return {
    ra: item.aluno.ra, nome: item.aluno.nome, sessoes: missoes.length, sessoesPorSemana,
    faixa: faixaDeUso(sessoesPorSemana), acerto, acertos, respostas: respostas.length, ativo, streak,
    ultimaExportacao: dia(item.export_log?.ultima_exportacao ?? item.aluno.exported_at), diasSemExportar: exportar,
    blocoAtual: item.progresso?.bloco_atual ?? 1, dominio,
    risco: detectarRisco({ streak, acerto, diasSemExportar: exportar }, config)
  };
}

// Resumo da turma para os 4 cards: ativos, sessões por semana (por aluno ativo), acerto médio e alunos em risco.
export function calcularTurma(itens, filtro, hojeDia, config) {
  const periodo = resolverPeriodo(filtro, itens, hojeDia);
  const semanas = Math.max(1, (diferencaDias(periodo.inicio, periodo.fim) + 1) / 7);
  const alunos = itens.map((i) => calcularAluno(i, periodo, semanas, hojeDia, config));
  const ativos = alunos.filter((a) => a.ativo);
  const totalRespostas = alunos.reduce((t, a) => t + a.respostas, 0);
  const totalAcertos = alunos.reduce((t, a) => t + a.acertos, 0);
  return {
    periodo, semanas, alunos,
    resumo: {
      total: alunos.length,
      ativos: ativos.length,
      sessoesPorSemana: media(ativos.map((a) => a.sessoesPorSemana)),
      acertoMedio: totalRespostas ? Math.round((totalAcertos / totalRespostas) * 100) : null,
      emRisco: alunos.filter((a) => a.risco.nivel !== 'ok').length
    }
  };
}
