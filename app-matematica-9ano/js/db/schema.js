// Definicao das stores IndexedDB (Dexie carregado globalmente via vendor/dexie.min.js).
// Stores em portugues, conforme contrato de dados (secao 4.1 da especificacao).

/* global Dexie */

export const db = new Dexie('app_matematica_9ano');

db.version(1).stores({
  // Conteudo (estatico / versionado)
  meta: 'key',
  blocos: 'id, ordem',
  questoes: 'id, bloco_id, dificuldade',
  licoes: 'bloco_id',

  // Progresso (mutavel / exportavel). Registros unicos usam key = "aluno".
  perfil: 'key',
  progresso: 'key',
  sessoes: 'id, data, tipo, bloco_id',
  respostas: 'id, sessao_id, questao_id, bloco_id, respondida_em',
  dominio_bloco: 'bloco_id',
  fila_revisao: 'questao_id, bloco_id, proxima_revisao',
  badges: 'id',
  eventos: '++id, tipo, data',

  // Sistema
  export_log: 'key',
  config: 'key'
});

export const CHAVE_ALUNO = 'aluno';

export const CONFIG_PADRAO = {
  lembrete_exportacao_dias: 7,
  freeze_automatico: true,
  sessao_atual: null,
  desafio_data: null
};

export function progressoInicial() {
  return {
    key: CHAVE_ALUNO,
    xp_total: 0,
    nivel: 1,
    moedas: 0,
    streak_atual: 0,
    streak_recorde: 0,
    ultima_missao_data: null,
    freezes_usados_semana: 0,
    semana_ref: null,
    dias_congelados: [],
    bloco_atual: 1,
    bloco_inicio: null,
    blocos_concluidos: [],
    sequencia_acertos: 0
  };
}
