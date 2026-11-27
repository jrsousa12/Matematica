// Orquestra o fluxo de uma sessao: iniciar, responder (persistindo a cada resposta),
// concluir e a rotina diaria (freeze, virada semanal e avanco de bloco).
// A UI chama apenas estas funcoes; as regras ficam nos demais modulos de motor/.

import * as repo from '../db/progress-repo.js';
import { hoje, isoLocal } from '../util/datas.js';
import { novoId } from '../util/ids.js';
import { planejarSessao, escolherProxima, escolherDesafio, NIVEL } from './session-builder.js';
import { atualizarDominio, atualizarFila, mapaDominio, verificarAvanco, blocosDisponiveis } from './adaptive.js';
import { avaliarDiasPerdidos, registrarMissao } from './streak.js';
import * as gami from './gamification.js';

const LETRAS = ['A', 'B', 'C', 'D'];

async function aplicarAvanco(progresso, estado, dia) {
  const disp = blocosDisponiveis(estado.blocos, estado.questoes);
  const r = verificarAvanco(progresso, mapaDominio(estado.dominio), disp, dia);
  let p = r.progresso;
  let xp = 0;
  r.concluidos.filter((c) => c.recompensa).forEach(() => {
    p = gami.aplicarGanhos(p, gami.XP.bloco, gami.MOEDAS.bloco);
    xp += gami.XP.bloco;
  });
  for (const c of r.concluidos) await repo.registrarEvento('bloco_concluido', c);
  return { progresso: p, concluidos: r.concluidos, xp };
}

async function badgesNovas(contexto) {
  const ja = (await repo.listarBadges()).filter((b) => b.conquistada).map((b) => b.id);
  return gami.avaliarBadges(contexto, ja);
}

// Executada no boot: consome freezes de dias perdidos, vira a semana e avanca blocos.
export async function rotinaDiaria() {
  const dia = hoje();
  const estado = await repo.carregarEstadoMotor();
  const freezeAtivo = await repo.obterConfig('freeze_automatico');
  const av = avaliarDiasPerdidos(estado.progresso, dia, freezeAtivo);
  if (av.freezesConsumidos) await repo.registrarEvento('freeze_consumido', { dias: av.freezesConsumidos });
  if (av.quebrou) await repo.registrarEvento('streak_quebrado', { data: dia });
  const avanco = await aplicarAvanco(av.progresso, estado, dia);
  const novas = await badgesNovas({ progresso: avanco.progresso });
  await repo.salvarProgresso(avanco.progresso);
  await repo.salvarBadges(gami.registrosBadges(novas, isoLocal()));
  return { freezes: av.freezesConsumidos, quebrou: av.quebrou, concluidos: avanco.concluidos, badges: novas };
}

async function definirCorrente(sessao, estado, dia) {
  const prox = escolherProxima(estado, sessao, dia);
  sessao.corrente = prox ? { questao_id: prox.questao.id, fonte: prox.fonte, nivel: prox.nivel } : null;
  if (!prox) sessao.fontes = sessao.fontes.slice(0, sessao.itens.length); // sem questoes suficientes
  sessao.exibida_em = Date.now();
  return sessao;
}

export async function iniciarMissao() {
  const existente = await repo.obterSessaoAtual();
  if (existente && existente.tipo === 'missao') return existente;
  const dia = hoje();
  const estado = await repo.carregarEstadoMotor();
  const sessao = planejarSessao(estado, dia, novoId('s'));
  sessao.iniciada_em = isoLocal();
  sessao.xp_ganho = 0;
  sessao.moedas_ganhas = 0;
  await definirCorrente(sessao, estado, dia);
  if (!sessao.corrente) return null;
  await repo.salvarSessaoAtual(sessao);
  await repo.registrarEvento('sessao_iniciada', { id: sessao.id, tipo: 'missao' });
  return sessao;
}

export async function desafioDisponivel() {
  return (await repo.obterConfig('desafio_data')) !== hoje();
}

export async function iniciarDesafio() {
  const existente = await repo.obterSessaoAtual();
  if (existente) return existente;
  if (!(await desafioDisponivel())) return null;
  const estado = await repo.carregarEstadoMotor();
  const q = escolherDesafio(estado);
  if (!q) return null;
  const sessao = {
    id: novoId('s'), tipo: 'desafio', bloco_id: q.bloco_id, data: hoje(), iniciada_em: isoLocal(),
    fontes: ['desafio'], itens: [], blocos_revisao: [], nivel_max: 3, xp_ganho: 0, moedas_ganhas: 0,
    corrente: { questao_id: q.id, fonte: 'desafio', nivel: NIVEL[q.dificuldade] || 3 }, exibida_em: Date.now()
  };
  await repo.salvarSessaoAtual(sessao);
  await repo.definirConfig('desafio_data', hoje());
  return sessao;
}

export async function sessaoEmAndamento() {
  return repo.obterSessaoAtual();
}

export async function questaoCorrente(sessao) {
  if (!sessao || !sessao.corrente) return null;
  return repo.obterQuestao(sessao.corrente.questao_id);
}

export function sessaoTerminada(sessao) {
  return !sessao.corrente && sessao.itens.length >= sessao.fontes.length;
}

// Registra a resposta da questao corrente e ja escolhe a proxima (persistindo tudo).
export async function responder(sessao, indiceAlternativa) {
  const dia = hoje();
  const quando = isoLocal();
  const questao = await repo.obterQuestao(sessao.corrente.questao_id);
  const correta = LETRAS[indiceAlternativa] === questao.correta;
  const tempo = Math.max(1, Math.round((Date.now() - (sessao.exibida_em || Date.now())) / 1000));
  const estado = await repo.carregarEstadoMotor();

  const dominioAnt = estado.dominio.find((d) => d.bloco_id === questao.bloco_id);
  const dominio = atualizarDominio(dominioAnt, questao.bloco_id, correta, quando);
  const filaAnt = estado.fila.find((f) => f.questao_id === questao.id);
  const fila = atualizarFila(filaAnt, questao, correta, dia);

  let xp = gami.xpPorResposta(correta);
  if (sessao.tipo === 'desafio' && correta) xp += gami.XP.desafio;
  const moedas = gami.moedasPorResposta(correta);
  let progresso = gami.aplicarGanhos(estado.progresso, xp, moedas);
  progresso = gami.atualizarSequencia(progresso, correta);

  const resposta = {
    id: novoId('r'), sessao_id: sessao.id, questao_id: questao.id, bloco_id: questao.bloco_id,
    correta, tempo_seg: tempo, respondida_em: quando
  };
  const s = { ...sessao, itens: [...sessao.itens], blocos_revisao: [...sessao.blocos_revisao] };
  s.itens.push({ ...sessao.corrente, bloco_id: questao.bloco_id, correta, alternativa: LETRAS[indiceAlternativa] });
  if (sessao.corrente.fonte === 'revisao') s.blocos_revisao.push(questao.bloco_id);
  s.xp_ganho += xp;
  s.moedas_ganhas += moedas;

  // Estado atualizado para escolher a proxima questao.
  const estadoNovo = {
    ...estado, progresso, respostas: [...estado.respostas, resposta],
    dominio: [...estado.dominio.filter((d) => d.bloco_id !== dominio.bloco_id), dominio],
    fila: estado.fila.filter((f) => f.questao_id !== questao.id).concat(fila.put ? [fila.put] : [])
  };
  if (s.tipo === 'desafio') s.corrente = null;
  else await definirCorrente(s, estadoNovo, dia);

  await repo.gravarResposta({
    resposta, dominio, filaPut: fila.put, filaDelete: fila.remover, progresso, sessaoAtual: s
  });
  return { sessao: s, correta, questao, xp, letraCorreta: questao.correta };
}

// Conclui a sessao: missao, streak, bonus, avanco de bloco e badges.
export async function concluirSessao(sessao) {
  const dia = hoje();
  const quando = isoLocal();
  const estado = await repo.carregarEstadoMotor();
  const nivelAntes = estado.progresso.nivel;
  let progresso = estado.progresso;
  const acertos = sessao.itens.filter((i) => i.correta).length;
  const total = sessao.itens.length;
  let xpExtra = 0;
  let moedasExtra = 0;
  let primeiraDoDia = false;
  const missao = sessao.tipo === 'missao' && total > 0;

  if (missao) {
    const freezeAtivo = await repo.obterConfig('freeze_automatico');
    const r = registrarMissao(progresso, dia, freezeAtivo);
    progresso = r.progresso;
    primeiraDoDia = r.primeiraDoDia;
    xpExtra += gami.XP.missao;
    moedasExtra += gami.MOEDAS.missao;
    if (primeiraDoDia) xpExtra += gami.bonusStreak(progresso.streak_atual);
    progresso = gami.aplicarGanhos(progresso, xpExtra, moedasExtra);
  }
  const avanco = await aplicarAvanco(progresso, estado, dia);
  progresso = avanco.progresso;
  xpExtra += avanco.xp;

  const novas = await badgesNovas({ progresso, missaoConcluida: missao, acertosSessao: acertos, totalSessao: total });
  const registro = {
    id: sessao.id, data: quando, tipo: sessao.tipo, bloco_id: sessao.bloco_id,
    questoes_ids: sessao.itens.map((i) => i.questao_id), xp_ganho: sessao.xp_ganho + xpExtra, acertos, total
  };
  await repo.gravarConclusao({ sessao: registro, progresso, badges: gami.registrosBadges(novas, quando) });
  await repo.registrarEvento('sessao_concluida', { id: sessao.id, tipo: sessao.tipo, acertos, total });

  const resumo = {
    tipo: sessao.tipo, acertos, total, xp: registro.xp_ganho, moedas: sessao.moedas_ganhas + moedasExtra,
    streak: progresso.streak_atual, primeiraDoDia, badges: novas, subiuNivel: progresso.nivel > nivelAntes,
    nivel: progresso.nivel, blocosConcluidos: avanco.concluidos.map((c) => c.bloco_id),
    itens: sessao.itens
  };
  await repo.definirConfig('ultimo_resultado', resumo);
  return resumo;
}

export async function ultimoResultado() {
  return repo.obterConfig('ultimo_resultado');
}
