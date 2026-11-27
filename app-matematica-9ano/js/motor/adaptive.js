// Dominio por bloco, fila de revisao espacada, modo adaptativo e avanco de bloco.
// Funcoes puras, sem acesso ao banco.

import { somarDias, diferencaDias } from '../util/datas.js';

export const LIMIAR_DOMINIO = 60;      // abaixo disso o bloco tem prioridade na revisao
export const AVANCO_DIAS = 7;
export const AVANCO_MIN_QUESTOES = 20;
export const AVANCO_MIN_PERCENTUAL = 80;

// ---------- Dominio ----------
export function atualizarDominio(registro, blocoId, correta, quando) {
  const r = registro ? { ...registro } : { bloco_id: blocoId, acertos: 0, total: 0, percentual: 0 };
  r.total += 1;
  if (correta) r.acertos += 1;
  r.percentual = Math.round((r.acertos / r.total) * 100);
  r.ultima_atualizacao = quando;
  return r;
}

export function mapaDominio(lista) {
  const mapa = {};
  lista.forEach((d) => { mapa[d.bloco_id] = d; });
  return mapa;
}

// ---------- Fila de revisao espacada ----------
// Erro -> +3d -> erro de novo -> +7d -> acerto -> +14d -> acerto de novo -> sai da fila.
export function atualizarFila(entrada, questao, correta, diaHoje) {
  if (!entrada) {
    if (correta) return { put: null, remover: null };
    return {
      put: {
        questao_id: questao.id, bloco_id: questao.bloco_id,
        proxima_revisao: somarDias(diaHoje, 3), tentativas: 1, ultima_resposta: 'erro'
      },
      remover: null
    };
  }
  const e = { ...entrada, tentativas: (entrada.tentativas || 0) + 1 };
  if (correta) {
    if (entrada.ultima_resposta === 'acerto') return { put: null, remover: entrada.questao_id };
    e.ultima_resposta = 'acerto';
    e.proxima_revisao = somarDias(diaHoje, 14);
  } else {
    e.proxima_revisao = somarDias(diaHoje, entrada.ultima_resposta === 'erro' ? 7 : 3);
    e.ultima_resposta = 'erro';
  }
  return { put: e, remover: null };
}

export function filaVencida(fila, diaHoje) {
  return fila.filter((f) => f.proxima_revisao <= diaHoje);
}

// ---------- Desempenho recente ----------
export function ultimasDoBloco(respostas, blocoId, n = 10) {
  const doBloco = respostas.filter((r) => r.bloco_id === blocoId);
  const ultimas = doBloco.slice(-n);
  const acertos = ultimas.filter((r) => r.correta).length;
  return {
    acertos,
    total: ultimas.length,
    percentual: ultimas.length ? Math.round((acertos / ultimas.length) * 100) : null
  };
}

// 'reforco' (< 50%), 'dominado' (>= 80%) ou 'normal'. Exige ao menos 5 respostas.
export function modoAdaptacao(respostas, blocoId) {
  const u = ultimasDoBloco(respostas, blocoId, 10);
  if (u.total < 5) return 'normal';
  if (u.percentual < 50) return 'reforco';
  if (u.percentual >= 80) return 'dominado';
  return 'normal';
}

// ---------- Avanco de bloco ----------
// Blocos com conteudo disponivel (ao menos 1 questao ativa), em ordem.
export function blocosDisponiveis(blocos, questoes) {
  const comQuestao = new Set(questoes.filter((q) => q.ativa !== false).map((q) => q.bloco_id));
  return blocos.filter((b) => comQuestao.has(b.id)).sort((a, b) => a.ordem - b.ordem).map((b) => b.id);
}

function criterioAtingido(progresso, dominio, diaHoje) {
  const dias = progresso.bloco_inicio ? diferencaDias(progresso.bloco_inicio, diaHoje) : 0;
  if (dias >= AVANCO_DIAS) return 'tempo';
  const d = dominio[progresso.bloco_atual];
  if (d && d.total >= AVANCO_MIN_QUESTOES && d.percentual >= AVANCO_MIN_PERCENTUAL) return 'desempenho';
  return null;
}

// Avanca quantos blocos forem devidos (prioridade ao tempo, acompanhando o ritmo da turma).
// Retorna o progresso atualizado e a lista de blocos concluidos agora.
export function verificarAvanco(progresso, dominio, disponiveis, diaHoje) {
  const p = { ...progresso, blocos_concluidos: [...(progresso.blocos_concluidos || [])] };
  if (!p.bloco_inicio) p.bloco_inicio = diaHoje;
  const concluidos = [];
  for (let guarda = 0; guarda < 20; guarda++) {
    const idx = disponiveis.indexOf(p.bloco_atual);
    const proximo = idx >= 0 ? disponiveis[idx + 1] : disponiveis[0];
    if (proximo === undefined) break;
    const criterio = criterioAtingido(p, dominio, diaHoje);
    if (!criterio) break;
    const praticou = Boolean(dominio[p.bloco_atual] && dominio[p.bloco_atual].total > 0);
    concluidos.push({ bloco_id: p.bloco_atual, criterio, recompensa: praticou });
    if (!p.blocos_concluidos.includes(p.bloco_atual)) p.blocos_concluidos.push(p.bloco_atual);
    // Por tempo, o novo bloco comeca 7 dias apos o anterior (mantem o ritmo semanal).
    p.bloco_inicio = criterio === 'tempo' ? somarDias(p.bloco_inicio, AVANCO_DIAS) : diaHoje;
    if (p.bloco_inicio > diaHoje) p.bloco_inicio = diaHoje;
    p.bloco_atual = proximo;
  }
  return { progresso: p, concluidos };
}

// Primeiro dia do bloco atual: a sessao usa 5 questoes do bloco novo.
// Considera tambem o primeiro contato com o bloco (aluno que abriu o app dias depois).
export function primeiroDiaDoBloco(progresso, respostas, diaHoje) {
  if (!progresso.bloco_inicio || progresso.bloco_inicio === diaHoje) return true;
  const atual = progresso.bloco_atual;
  const antesDeHoje = respostas.some((r) => r.bloco_id === atual &&
    String(r.respondida_em).slice(0, 10) < diaHoje);
  return !antesDeHoje;
}
