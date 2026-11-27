// Montagem da sessao de pratica (3 + 2 revisao, ou 5 do bloco novo) e escolha
// da proxima questao seguindo a curva facil -> media -> dificil -> media -> facil.
// Funcoes puras: recebem o estado do motor e devolvem dados.

import { embaralhar } from '../util/ids.js';
import { mapaDominio, modoAdaptacao, blocosDisponiveis, primeiroDiaDoBloco, LIMIAR_DOMINIO } from './adaptive.js';

export const NIVEL = { facil: 1, media: 2, dificil: 3 };
export const CURVA = [1, 2, 3, 2, 1];

function nivelDe(q) {
  return NIVEL[q.dificuldade] || 2;
}

// Blocos que podem servir de revisao: disponiveis e anteriores ao bloco atual.
function blocosRevisaveis(estado) {
  const disp = blocosDisponiveis(estado.blocos, estado.questoes);
  const ordem = {};
  estado.blocos.forEach((b) => { ordem[b.id] = b.ordem; });
  const atual = ordem[estado.progresso.bloco_atual];
  return disp.filter((id) => ordem[id] < atual);
}

export function planejarSessao(estado, diaHoje, id) {
  const { progresso, respostas } = estado;
  const revisaveis = blocosRevisaveis(estado);
  const modo = modoAdaptacao(respostas, progresso.bloco_atual);
  let fontes;
  if (primeiroDiaDoBloco(progresso, respostas, diaHoje) || revisaveis.length === 0) {
    fontes = ['atual', 'atual', 'atual', 'atual', 'atual'];
  } else if (modo === 'dominado') {
    fontes = ['atual', 'revisao', 'atual', 'revisao', 'revisao']; // reduz frequencia do bloco
  } else {
    fontes = ['atual', 'revisao', 'atual', 'revisao', 'atual']; // revisao nas posicoes 2 e 4
  }
  return {
    id, tipo: 'missao', bloco_id: progresso.bloco_atual, data: diaHoje,
    fontes, modo, nivel_max: modo === 'reforco' ? 2 : 3, itens: [], blocos_revisao: []
  };
}

// Nivel desejado para a posicao atual: sobe apenas se acertou; se errou, nao sobe.
export function nivelAlvo(sessao) {
  const i = sessao.itens.length;
  let alvo = Math.min(CURVA[i] ?? 1, sessao.nivel_max || 3);
  const anterior = sessao.itens[i - 1];
  if (anterior) {
    alvo = anterior.correta ? Math.min(alvo, anterior.nivel + 1) : Math.min(alvo, anterior.nivel);
  }
  return Math.max(1, alvo);
}

// Estatisticas por questao: ultima resposta e quando.
function historicoPorQuestao(respostas) {
  const h = {};
  respostas.forEach((r) => { h[r.questao_id] = { correta: r.correta, em: r.respondida_em }; });
  return h;
}

function ordenarCandidatos(lista, chave) {
  return embaralhar(lista)
    .map((q) => ({ q, k: chave(q) }))
    .sort((a, b) => {
      for (let i = 0; i < a.k.length; i++) {
        if (a.k[i] < b.k[i]) return -1;
        if (a.k[i] > b.k[i]) return 1;
      }
      return 0;
    })
    .map((x) => x.q);
}

function escolherDoBlocoAtual(candidatos, alvo, hist, filaIds, modo) {
  return ordenarCandidatos(candidatos, (q) => {
    const h = hist[q.id];
    let grupo;
    if (!h) grupo = modo === 'reforco' ? 1 : 0;                       // nao vista
    else if (!h.correta || filaIds.has(q.id)) grupo = modo === 'reforco' ? 0 : 1; // errada pendente
    else grupo = 2;                                                    // acertada ha mais tempo
    return [Math.abs(nivelDe(q) - alvo), grupo, h ? h.em : ''];
  })[0];
}

function escolherBlocoRevisao(estado, sessao, diaHoje) {
  const usados = new Set(sessao.blocos_revisao);
  const opcoes = blocosRevisaveis(estado).filter((b) => !usados.has(b));
  if (!opcoes.length) return null;
  const dom = mapaDominio(estado.dominio);
  const pct = (b) => (dom[b] && dom[b].total > 0 ? dom[b].percentual : 0);

  // (1) bloco com menor dominio (< 60%)
  const fracos = opcoes.filter((b) => pct(b) < LIMIAR_DOMINIO).sort((a, b) => pct(a) - pct(b));
  if (fracos.length) return fracos[0];
  // (2) bloco com erros vencidos na fila (>= 3 dias)
  const vencidos = estado.fila.filter((f) => f.proxima_revisao <= diaHoje && opcoes.includes(f.bloco_id))
    .sort((a, b) => (a.proxima_revisao < b.proxima_revisao ? -1 : 1));
  if (vencidos.length) return vencidos[0].bloco_id;
  // (3) ancora de bloco dominado
  return embaralhar(opcoes)[0];
}

function escolherDaRevisao(candidatos, alvo, hist, filaVencidaIds) {
  return ordenarCandidatos(candidatos, (q) => {
    const h = hist[q.id];
    const dist = Math.abs(nivelDe(q) - alvo);
    let grupo = 2;
    if (filaVencidaIds.has(q.id)) grupo = 0;
    else if (!h) grupo = 1;
    return [dist > 1 ? 1 : 0, grupo, dist, h ? h.em : ''];
  })[0];
}

// Escolhe a proxima questao da sessao. Retorna { questao, fonte, nivel } ou null.
export function escolherProxima(estado, sessao, diaHoje) {
  const i = sessao.itens.length;
  if (i >= sessao.fontes.length) return null;
  const alvo = nivelAlvo(sessao);
  const usadas = new Set(sessao.itens.map((it) => it.questao_id));
  const ativas = estado.questoes.filter((q) => q.ativa !== false && !usadas.has(q.id));
  const hist = historicoPorQuestao(estado.respostas);
  let fonte = sessao.fontes[i];
  let questao = null;

  if (fonte === 'revisao') {
    const bloco = escolherBlocoRevisao(estado, sessao, diaHoje);
    const candidatos = bloco ? ativas.filter((q) => q.bloco_id === bloco) : [];
    if (candidatos.length) {
      const vencidas = new Set(estado.fila.filter((f) => f.proxima_revisao <= diaHoje).map((f) => f.questao_id));
      questao = escolherDaRevisao(candidatos, alvo, hist, vencidas);
    } else {
      fonte = 'atual';
    }
  }
  if (!questao) {
    const filaIds = new Set(estado.fila.map((f) => f.questao_id));
    const candidatos = ativas.filter((q) => q.bloco_id === sessao.bloco_id);
    questao = candidatos.length ? escolherDoBlocoAtual(candidatos, alvo, hist, filaIds, sessao.modo) : null;
    fonte = 'atual';
  }
  if (!questao) return null;
  return { questao, fonte, nivel: nivelDe(questao) };
}

// Desafio diario: 1 questao dificil do bloco atual ou anteriores.
export function escolherDesafio(estado) {
  const revisaveis = new Set([...blocosRevisaveis(estado), estado.progresso.bloco_atual]);
  const hist = historicoPorQuestao(estado.respostas);
  const dificeis = estado.questoes.filter((q) => q.ativa !== false && q.dificuldade === 'dificil' &&
    revisaveis.has(q.bloco_id));
  if (!dificeis.length) return null;
  return ordenarCandidatos(dificeis, (q) => [hist[q.id] && hist[q.id].correta ? 1 : 0])[0];
}
