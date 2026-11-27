// CRUD de progresso, sessao_atual, configuracoes e eventos.

import { db, CHAVE_ALUNO, CONFIG_PADRAO, progressoInicial } from './schema.js';
import { isoLocal } from '../util/datas.js';

// ---------- Perfil ----------
export async function obterPerfil() {
  return db.perfil.get(CHAVE_ALUNO);
}

export async function salvarPerfil(dados) {
  await db.perfil.put({ key: CHAVE_ALUNO, ...dados });
}

// ---------- Progresso ----------
export async function obterProgresso() {
  const p = await db.progresso.get(CHAVE_ALUNO);
  return p ? { ...progressoInicial(), ...p } : progressoInicial();
}

export async function salvarProgresso(progresso) {
  await db.progresso.put({ ...progresso, key: CHAVE_ALUNO });
}

// ---------- Config ----------
export async function obterConfig(chave) {
  const reg = await db.config.get(chave);
  return reg ? reg.value : CONFIG_PADRAO[chave];
}

export async function definirConfig(chave, valor) {
  await db.config.put({ key: chave, value: valor });
}

export async function obterSessaoAtual() {
  return obterConfig('sessao_atual');
}

export async function salvarSessaoAtual(sessao) {
  await definirConfig('sessao_atual', sessao);
}

export async function limparSessaoAtual() {
  await definirConfig('sessao_atual', null);
}

// ---------- Conteudo ----------
export async function listarBlocos() {
  return db.blocos.orderBy('ordem').toArray();
}

export async function listarQuestoes() {
  return db.questoes.toArray();
}

export async function obterQuestao(id) {
  return db.questoes.get(id);
}

export async function obterLicao(blocoId) {
  return db.licoes.get(blocoId);
}

// ---------- Historico ----------
export async function listarRespostas() {
  return db.respostas.orderBy('respondida_em').toArray();
}

export async function listarSessoes() {
  return db.sessoes.orderBy('data').toArray();
}

export async function listarDominio() {
  return db.dominio_bloco.toArray();
}

export async function listarFila() {
  return db.fila_revisao.toArray();
}

export async function listarBadges() {
  return db.badges.toArray();
}

// Estado completo usado pelo motor para montar e corrigir sessoes.
export async function carregarEstadoMotor() {
  const [blocos, questoes, respostas, fila, dominio, progresso] = await Promise.all([
    listarBlocos(), listarQuestoes(), listarRespostas(), listarFila(), listarDominio(), obterProgresso()
  ]);
  return { blocos, questoes, respostas, fila, dominio, progresso };
}

// Grava, em uma unica transacao, o efeito de uma resposta.
export async function gravarResposta({ resposta, dominio, filaPut, filaDelete, progresso, sessaoAtual }) {
  await db.transaction('rw', [db.respostas, db.dominio_bloco, db.fila_revisao, db.progresso, db.config],
    async () => {
      await db.respostas.put(resposta);
      await db.dominio_bloco.put(dominio);
      if (filaPut) await db.fila_revisao.put(filaPut);
      if (filaDelete) await db.fila_revisao.delete(filaDelete);
      await db.progresso.put({ ...progresso, key: CHAVE_ALUNO });
      await db.config.put({ key: 'sessao_atual', value: sessaoAtual });
    });
}

// Grava a conclusao de uma sessao (sessao, progresso, badges e limpa sessao_atual).
export async function gravarConclusao({ sessao, progresso, badges }) {
  await db.transaction('rw', [db.sessoes, db.progresso, db.badges, db.config], async () => {
    await db.sessoes.put(sessao);
    await db.progresso.put({ ...progresso, key: CHAVE_ALUNO });
    if (badges && badges.length) await db.badges.bulkPut(badges);
    await db.config.put({ key: 'sessao_atual', value: null });
  });
}

export async function salvarBadges(badges) {
  if (badges.length) await db.badges.bulkPut(badges);
}

// ---------- Eventos ----------
export async function registrarEvento(tipo, payload = {}) {
  try {
    await db.eventos.add({ tipo, payload, data: isoLocal() });
  } catch (e) {
    // Eventos sao auxiliares; falha aqui nunca bloqueia o aluno.
  }
}

// ---------- Exportacao ----------
export async function obterExportLog() {
  const reg = await db.export_log.get(CHAVE_ALUNO);
  return reg || { key: CHAVE_ALUNO, ultima_exportacao: null, total_exportacoes: 0 };
}

export async function registrarExportacao(quando) {
  const atual = await obterExportLog();
  const novo = { key: CHAVE_ALUNO, ultima_exportacao: quando, total_exportacoes: atual.total_exportacoes + 1 };
  await db.export_log.put(novo);
  return novo;
}
