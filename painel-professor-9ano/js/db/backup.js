// Backup e restauração completa do banco do painel, e reset dos dados dos alunos.
// Sem interface: a aba Configurações chama estas funções.

import { db } from './schema.js';

export const VERSAO_BACKUP = 1;
const TIPO = 'painel_matematica_9ano_backup';
const DADOS_DE_ALUNOS = ['alunos', 'progresso', 'sessoes', 'respostas', 'dominio_bloco', 'badges', 'export_log_aluno', 'import_log', 'import_snapshot'];
const TODAS = ['config', ...DADOS_DE_ALUNOS];

export async function gerarBackup(agora = new Date().toISOString()) {
  const tabelas = {};
  for (const nome of TODAS) tabelas[nome] = await db[nome].toArray();
  return { tipo: TIPO, backup_version: VERSAO_BACKUP, gerado_em: agora, tabelas };
}

// Devolve uma lista de problemas; vazia quando o arquivo serve.
export function validarBackup(b) {
  if (!b || typeof b !== 'object' || b.tipo !== TIPO) return ['Este arquivo não é um backup do painel.'];
  if (b.backup_version !== VERSAO_BACKUP) return [`Versão de backup não suportada: ${b.backup_version}.`];
  const erros = [];
  for (const nome of TODAS) {
    if (!Array.isArray(b.tabelas?.[nome])) erros.push(`Faltou a tabela "${nome}" no backup.`);
  }
  return erros;
}

// Troca todo o conteúdo do banco pelo do backup, de uma vez (tudo ou nada).
export async function restaurarBackup(b) {
  const erros = validarBackup(b);
  if (erros.length) throw new Error(erros[0]);
  await db.transaction('rw', TODAS.map((n) => db[n]), async () => {
    for (const nome of TODAS) {
      await db[nome].clear();
      await db[nome].bulkPut(b.tabelas[nome]);
    }
  });
}

// Apaga alunos, respostas e histórico de importação. A configuração (turma, metas) fica.
export async function resetarDados() {
  await db.transaction('rw', DADOS_DE_ALUNOS.map((n) => db[n]), async () => {
    for (const nome of DADOS_DE_ALUNOS) await db[nome].clear();
  });
}

export function nomeBackup(turmaCodigo, dia) {
  return `backup-painel_${turmaCodigo}_${dia}.json`;
}

export function baixarBackup(backup, nome) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nome });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
