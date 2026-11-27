// Monta os dados (view-models) que as telas exibem. A UI apenas renderiza.

import * as repo from '../db/progress-repo.js';
import { hoje, diferencaDias } from '../util/datas.js';
import { progressoNivel, BADGES } from './gamification.js';
import { situacaoStreak } from './streak.js';
import { mapaDominio, blocosDisponiveis, AVANCO_DIAS } from './adaptive.js';
import { desafioDisponivel } from './session-runner.js';

export async function resumoHome() {
  const dia = hoje();
  const [perfil, estado, sessao, log, lembreteDias, temDesafio, freezeAtivo] = await Promise.all([
    repo.obterPerfil(), repo.carregarEstadoMotor(), repo.obterSessaoAtual(), repo.obterExportLog(),
    repo.obterConfig('lembrete_exportacao_dias'), desafioDisponivel(), repo.obterConfig('freeze_automatico')
  ]);
  const { progresso, blocos, dominio } = estado;
  const bloco = blocos.find((b) => b.id === progresso.bloco_atual) || blocos[0];
  const dom = mapaDominio(dominio)[progresso.bloco_atual];
  const sessoesHoje = (await repo.listarSessoes())
    .filter((s) => s.tipo === 'missao' && String(s.data).slice(0, 10) === dia).length;
  const referencia = log.ultima_exportacao || perfil.criado_em;
  const diasSemExportar = referencia ? diferencaDias(String(referencia).slice(0, 10), dia) : 0;
  const diasNoBloco = progresso.bloco_inicio ? diferencaDias(progresso.bloco_inicio, dia) : 0;

  return {
    nome: perfil.nome.split(' ')[0],
    progresso,
    nivel: progressoNivel(progresso.xp_total),
    streak: situacaoStreak(progresso, dia),
    freezeDisponivel: freezeAtivo && (progresso.freezes_usados_semana || 0) < 1,
    bloco,
    dominioBloco: dom ? dom.percentual : null,
    diasRestantesBloco: Math.max(0, AVANCO_DIAS - diasNoBloco),
    sessaoEmAndamento: sessao && sessao.tipo === 'missao' ? sessao : null,
    desafioEmAndamento: sessao && sessao.tipo === 'desafio' ? sessao : null,
    desafioDisponivel: temDesafio,
    sessoesHoje,
    lembrarExportacao: diasSemExportar >= (lembreteDias || 7),
    diasSemExportar,
    nuncaExportou: !log.ultima_exportacao
  };
}

export async function resumoTrilha() {
  const estado = await repo.carregarEstadoMotor();
  const { progresso, blocos, questoes } = estado;
  const dom = mapaDominio(estado.dominio);
  const disponiveis = new Set(blocosDisponiveis(blocos, questoes));
  const licoes = new Set((await Promise.all(blocos.map((b) => repo.obterLicao(b.id))))
    .filter(Boolean).map((l) => l.bloco_id));
  const ordemAtual = (blocos.find((b) => b.id === progresso.bloco_atual) || { ordem: 1 }).ordem;
  return blocos.map((b) => {
    let estadoBloco = 'bloqueado';
    if (!disponiveis.has(b.id)) estadoBloco = 'em_breve';
    else if (b.id === progresso.bloco_atual) estadoBloco = 'atual';
    else if ((progresso.blocos_concluidos || []).includes(b.id) || b.ordem < ordemAtual) estadoBloco = 'concluido';
    return {
      ...b,
      estado: estadoBloco,
      temLicao: licoes.has(b.id),
      percentual: dom[b.id] && dom[b.id].total ? dom[b.id].percentual : null,
      respondidas: dom[b.id] ? dom[b.id].total : 0
    };
  });
}

export async function resumoPerfil() {
  const [perfil, progresso, respostas, sessoes, badges, log] = await Promise.all([
    repo.obterPerfil(), repo.obterProgresso(), repo.listarRespostas(), repo.listarSessoes(),
    repo.listarBadges(), repo.obterExportLog()
  ]);
  const conquistadas = new Map(badges.filter((b) => b.conquistada).map((b) => [b.id, b]));
  const acertos = respostas.filter((r) => r.correta).length;
  return {
    perfil,
    progresso,
    nivel: progressoNivel(progresso.xp_total),
    estatisticas: {
      questoes: respostas.length,
      percentual: respostas.length ? Math.round((acertos / respostas.length) * 100) : null,
      missoes: sessoes.filter((s) => s.tipo === 'missao').length,
      desafios: sessoes.filter((s) => s.tipo === 'desafio').length
    },
    badges: BADGES.map((b) => ({ ...b, conquistada: conquistadas.has(b.id),
      conquistada_em: conquistadas.has(b.id) ? conquistadas.get(b.id).conquistada_em : null })),
    exportacao: log
  };
}
