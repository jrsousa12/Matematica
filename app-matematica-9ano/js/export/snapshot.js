// Geracao do snapshot JSON (schema 1.0), download, compartilhamento e copia.

import * as repo from '../db/progress-repo.js';
import { obterMeta } from '../db/seed.js';
import { isoLocal, hoje } from '../util/datas.js';

export const SCHEMA_VERSION = '1.0';

function limpar(registro) {
  const { key, ...resto } = registro;
  return resto;
}

export async function gerarSnapshot() {
  const quando = isoLocal();
  const [meta, perfil, progresso, sessoes, respostas, dominio, badges, log] = await Promise.all([
    obterMeta(), repo.obterPerfil(), repo.obterProgresso(), repo.listarSessoes(), repo.listarRespostas(),
    repo.listarDominio(), repo.listarBadges(), repo.obterExportLog()
  ]);
  const exportLog = { ultima_exportacao: quando, total_exportacoes: (log.total_exportacoes || 0) + 1 };
  const snapshot = {
    schema_version: SCHEMA_VERSION,
    exported_at: quando,
    app_version: meta.app_version || '1.0.0',
    content_version: meta.content_version || '1.0.0',
    turma_codigo: perfil.turma_codigo,
    perfil: { nome: perfil.nome, ra: perfil.ra },
    progresso: {
      xp_total: progresso.xp_total,
      nivel: progresso.nivel,
      moedas: progresso.moedas,
      streak_atual: progresso.streak_atual,
      streak_recorde: progresso.streak_recorde,
      freezes_usados_semana: progresso.freezes_usados_semana,
      semana_ref: progresso.semana_ref,
      ultima_missao_data: progresso.ultima_missao_data,
      bloco_atual: progresso.bloco_atual,
      blocos_concluidos: progresso.blocos_concluidos
    },
    sessoes,
    respostas,
    dominio_bloco: dominio,
    badges: badges.filter((b) => b.conquistada),
    export_log: exportLog
  };
  return snapshot;
}

export function nomeArquivo(snapshot) {
  const turma = String(snapshot.turma_codigo).replace(/[^A-Za-z0-9-]/g, '');
  const ra = String(snapshot.perfil.ra).replace(/[^A-Za-z0-9-]/g, '');
  return `${turma}_${ra}_${hoje()}.json`;
}

export function serializar(snapshot) {
  return JSON.stringify(snapshot, null, 2);
}

// Tenta baixar como arquivo. Retorna true se o download foi disparado.
export function baixar(snapshot) {
  try {
    const blob = new Blob([serializar(snapshot)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo(snapshot);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  } catch (e) {
    return false;
  }
}

export function podeCompartilhar(snapshot) {
  try {
    if (!navigator.canShare) return false;
    const f = new File(['{}'], nomeArquivo(snapshot), { type: 'application/json' });
    return navigator.canShare({ files: [f] });
  } catch (e) {
    return false;
  }
}

// Compartilha o arquivo pelo menu nativo (WhatsApp, Drive, e-mail...).
export async function compartilhar(snapshot) {
  const arquivo = new File([serializar(snapshot)], nomeArquivo(snapshot), { type: 'application/json' });
  await navigator.share({ files: [arquivo], title: 'Progresso de Matemática' });
  return true;
}

export async function copiarTexto(texto, textarea) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch (e) { /* tenta o metodo alternativo */ }
  if (textarea) {
    textarea.focus();
    textarea.select();
    try { return document.execCommand('copy'); } catch (e) { return false; }
  }
  return false;
}

// Registra a exportacao no log local (chamar apos download, compartilhamento ou copia).
export async function confirmarExportacao(snapshot, meio) {
  const log = await repo.registrarExportacao(snapshot.exported_at);
  await repo.registrarEvento('exportacao', { meio });
  return log;
}
