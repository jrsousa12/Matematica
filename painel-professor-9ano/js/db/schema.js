// Stores IndexedDB do painel (Dexie carregado globalmente via vendor/dexie.min.js).
// Cada aluno é identificado pelo RA. Tabelas de dados do aluno têm chave composta [ra+...].

/* global Dexie */

export const db = new Dexie('painel_matematica_9ano');

db.version(1).stores({
  config: 'key',
  alunos: 'ra, turma_codigo',
  progresso: 'ra',
  sessoes: '[ra+id], ra, data',
  respostas: '[ra+id], ra, bloco_id, respondida_em',
  dominio_bloco: '[ra+bloco_id], ra',
  badges: '[ra+id], ra',
  export_log_aluno: 'ra',
  import_log: '++id, lote_id, importado_em',
  import_snapshot: 'lote_id'
});

export const CONFIG_PADRAO = {
  turma_codigo: '9A-2026',
  turma_nome: '9º Ano A',
  meta_sessoes_semana: 3,
  meta_streak: 3,
  risco_acerto_minimo: 50,
  risco_dias_sem_exportar: 10
};

export async function garantirConfigPadrao() {
  for (const [key, value] of Object.entries(CONFIG_PADRAO)) {
    if (!(await db.config.get(key))) await db.config.put({ key, value });
  }
}

export async function lerConfig() {
  const linhas = await db.config.toArray();
  return { ...CONFIG_PADRAO, ...Object.fromEntries(linhas.map((l) => [l.key, l.value])) };
}
