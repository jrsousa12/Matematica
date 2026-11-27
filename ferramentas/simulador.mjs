// Simula o uso do app por um aluno fictício e devolve um snapshot schema 1.0.
// Usa as regras reais do motor do app (streak, XP, domínio, badges) para que
// os números sejam coerentes entre si, como num arquivo exportado de verdade.

import { registrarMissao, avaliarDiasPerdidos } from '../app-matematica-9ano/js/motor/streak.js';
import * as gami from '../app-matematica-9ano/js/motor/gamification.js';
import { atualizarDominio } from '../app-matematica-9ano/js/motor/adaptive.js';
import { somarDias, diferencaDias, parseDia, isoLocal } from '../app-matematica-9ano/js/util/datas.js';

// Gerador pseudoaleatório com semente (mesma semente = mesmos arquivos).
export function criarRng(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sortear = (rng, lista) => lista[Math.floor(rng() * lista.length)];
const AJUSTE = { facil: 0.12, media: 0, dificil: -0.18 };

function horario(dia, rng) {
  const d = parseDia(dia);
  d.setHours(17 + Math.floor(rng() * 5), Math.floor(rng() * 60), Math.floor(rng() * 60));
  return d;
}

function escolherQuestoes(porBloco, bloco, primeiroDia, rng) {
  const doBloco = porBloco[bloco] || [];
  const anteriores = Object.keys(porBloco).map(Number).filter((b) => b < bloco);
  const fontes = primeiroDia || !anteriores.length
    ? [bloco, bloco, bloco, bloco, bloco]
    : [bloco, sortear(rng, anteriores), bloco, sortear(rng, anteriores), bloco];
  const usadas = new Set();
  return fontes.map((b) => {
    const lista = (b === bloco ? doBloco : porBloco[b]).filter((q) => !usadas.has(q.id));
    const q = sortear(rng, lista);
    usadas.add(q.id);
    return q;
  });
}

// perfil: { nome, ra, chanceDia, acerto, diasSemExportar }
export function simularAluno({ perfil, inicio, fim, questoes, turma, versoes, rng }) {
  const porBloco = {};
  questoes.forEach((q) => { (porBloco[q.bloco_id] ||= []).push(q); });
  const ultimoBloco = Math.max(...Object.keys(porBloco).map(Number));
  const diaExport = somarDias(fim, -(perfil.diasSemExportar || 0));

  let p = {
    xp_total: 0, nivel: 1, moedas: 0, streak_atual: 0, streak_recorde: 0, ultima_missao_data: null,
    freezes_usados_semana: 0, semana_ref: null, bloco_atual: 1, blocos_concluidos: [],
    dias_congelados: [], sequencia_acertos: 0
  };
  const sessoes = [];
  const respostas = [];
  const dominio = {};
  const badges = [];
  let nSessao = 0;

  for (let dia = inicio; dia <= diaExport; dia = somarDias(dia, 1)) {
    const bloco = Math.min(ultimoBloco, Math.floor(diferencaDias(inicio, dia) / 7) + 1);
    while (p.bloco_atual < bloco) { // avanço por tempo
      const praticou = Boolean(dominio[p.bloco_atual]);
      p.blocos_concluidos = [...p.blocos_concluidos, p.bloco_atual];
      if (praticou) p = gami.aplicarGanhos(p, gami.XP.bloco, gami.MOEDAS.bloco);
      p = { ...p, bloco_atual: p.bloco_atual + 1 };
    }
    p = avaliarDiasPerdidos(p, dia).progresso;
    if (rng() >= perfil.chanceDia) continue;

    const primeiroDia = !respostas.some((r) => r.bloco_id === bloco);
    const lista = escolherQuestoes(porBloco, bloco, primeiroDia, rng);
    const quando = horario(dia, rng);
    const sessaoId = `s_${perfil.ra}_${++nSessao}`;
    let acertos = 0;
    let xpSessao = 0;
    lista.forEach((q, i) => {
      const correta = rng() < perfil.acerto + (AJUSTE[q.dificuldade] || 0);
      const em = new Date(quando.getTime() + i * 60000);
      if (correta) acertos += 1;
      const xp = gami.xpPorResposta(correta);
      xpSessao += xp;
      p = gami.atualizarSequencia(gami.aplicarGanhos(p, xp, gami.moedasPorResposta(correta)), correta);
      dominio[q.bloco_id] = atualizarDominio(dominio[q.bloco_id], q.bloco_id, correta, isoLocal(em));
      respostas.push({
        id: `r_${sessaoId}_${i + 1}`, sessao_id: sessaoId, questao_id: q.id, bloco_id: q.bloco_id,
        correta, tempo_seg: 15 + Math.floor(rng() * 90), respondida_em: isoLocal(em)
      });
    });
    const reg = registrarMissao(p, dia);
    p = reg.progresso;
    let extra = gami.XP.missao + (reg.primeiraDoDia ? gami.bonusStreak(p.streak_atual) : 0);
    p = gami.aplicarGanhos(p, extra, gami.MOEDAS.missao);
    xpSessao += extra;
    const fimSessao = isoLocal(new Date(quando.getTime() + 5 * 60000));
    sessoes.push({
      id: sessaoId, data: fimSessao, tipo: 'missao', bloco_id: bloco,
      questoes_ids: lista.map((q) => q.id), xp_ganho: xpSessao, acertos, total: lista.length
    });
    const novas = gami.avaliarBadges({ progresso: p, missaoConcluida: true, acertosSessao: acertos, totalSessao: 5 },
      badges.map((b) => b.id));
    badges.push(...gami.registrosBadges(novas, fimSessao));
  }

  const momento = parseDia(diaExport);
  momento.setHours(21, Math.floor(rng() * 60), 0); // exporta depois das missões do dia
  const exportadoEm = isoLocal(momento);
  const semanas = Math.max(1, Math.floor(diferencaDias(inicio, diaExport) / 7));
  return {
    schema_version: '1.0',
    exported_at: exportadoEm,
    app_version: versoes.app,
    content_version: versoes.conteudo,
    turma_codigo: turma,
    perfil: { nome: perfil.nome, ra: perfil.ra },
    progresso: {
      xp_total: p.xp_total, nivel: p.nivel, moedas: p.moedas, streak_atual: p.streak_atual,
      streak_recorde: p.streak_recorde, freezes_usados_semana: p.freezes_usados_semana, semana_ref: p.semana_ref,
      ultima_missao_data: p.ultima_missao_data, bloco_atual: p.bloco_atual, blocos_concluidos: p.blocos_concluidos
    },
    sessoes,
    respostas,
    dominio_bloco: Object.values(dominio),
    badges,
    export_log: { ultima_exportacao: exportadoEm, total_exportacoes: semanas }
  };
}
