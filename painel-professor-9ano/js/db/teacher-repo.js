// Acesso ao banco do painel: substituição atômica do snapshot de um aluno (por RA) e consultas.
// Nenhuma regra de validação aqui; só leitura e gravação.

import { db } from './schema.js';

const TABELAS_DO_ALUNO = ['sessoes', 'respostas', 'dominio_bloco', 'badges'];
const TODAS = ['alunos', 'progresso', 'export_log_aluno', ...TABELAS_DO_ALUNO];

const tabelas = () => TODAS.map((nome) => db[nome]);

// Converte o snapshot do app do aluno nas linhas do banco do painel.
export function snapshotParaLinhas(s, importadoEm) {
  const ra = s.perfil.ra.trim();
  const comRa = (lista) => lista.map((x) => ({ ...x, ra }));
  return {
    alunos: {
      ra,
      nome: s.perfil.nome.trim(),
      turma_codigo: s.turma_codigo,
      exported_at: s.exported_at,
      app_version: s.app_version ?? null,
      content_version: s.content_version ?? null,
      importado_em: importadoEm
    },
    progresso: { ...s.progresso, ra },
    export_log_aluno: s.export_log ? { ...s.export_log, ra } : null,
    sessoes: comRa(s.sessoes),
    respostas: comRa(s.respostas),
    dominio_bloco: comRa(s.dominio_bloco),
    badges: comRa(s.badges)
  };
}

// Lê tudo de um aluno (ou null se ele não existe). Serve de "foto" para o desfazer.
export async function lerAlunoCompleto(ra) {
  const aluno = await db.alunos.get(ra);
  if (!aluno) return null;
  const dados = { alunos: aluno, progresso: (await db.progresso.get(ra)) ?? null };
  dados.export_log_aluno = (await db.export_log_aluno.get(ra)) ?? null;
  for (const nome of TABELAS_DO_ALUNO) dados[nome] = await db[nome].where('ra').equals(ra).toArray();
  return dados;
}

async function apagarAluno(ra) {
  await db.alunos.delete(ra);
  await db.progresso.delete(ra);
  await db.export_log_aluno.delete(ra);
  for (const nome of TABELAS_DO_ALUNO) await db[nome].where('ra').equals(ra).delete();
}

async function gravarLinhas(linhas) {
  await db.alunos.put(linhas.alunos);
  if (linhas.progresso) await db.progresso.put(linhas.progresso);
  if (linhas.export_log_aluno) await db.export_log_aluno.put(linhas.export_log_aluno);
  for (const nome of TABELAS_DO_ALUNO) await db[nome].bulkPut(linhas[nome]);
}

// Substitui os dados do aluno pelo snapshot, tudo ou nada.
export function substituirSnapshot(snapshot, importadoEm) {
  const linhas = snapshotParaLinhas(snapshot, importadoEm);
  return db.transaction('rw', tabelas(), async () => {
    await apagarAluno(linhas.alunos.ra);
    await gravarLinhas(linhas);
  });
}

// Volta o aluno ao estado de antes (dados = foto de lerAlunoCompleto, ou null para remover).
export function restaurarAluno(ra, dados) {
  return db.transaction('rw', tabelas(), async () => {
    await apagarAluno(ra);
    if (dados) await gravarLinhas(dados);
  });
}

export function listarAlunos() {
  return db.alunos.orderBy('nome').toArray();
}

// Lê a base inteira, agrupada por RA, para o painel calcular métricas.
export async function lerBase() {
  const [alunos, progresso, exportLog, sessoes, respostas, dominio, badges] = await Promise.all([
    db.alunos.toArray(), db.progresso.toArray(), db.export_log_aluno.toArray(),
    db.sessoes.toArray(), db.respostas.toArray(), db.dominio_bloco.toArray(), db.badges.toArray()
  ]);
  const porRa = (lista) => {
    const mapa = new Map();
    for (const x of lista) {
      if (!mapa.has(x.ra)) mapa.set(x.ra, []);
      mapa.get(x.ra).push(x);
    }
    return mapa;
  };
  const prog = new Map(progresso.map((p) => [p.ra, p]));
  const log = new Map(exportLog.map((l) => [l.ra, l]));
  const [sessPorRa, respPorRa, domPorRa, badPorRa] = [sessoes, respostas, dominio, badges].map(porRa);
  return alunos.map((aluno) => ({
    aluno,
    progresso: prog.get(aluno.ra) ?? null,
    export_log: log.get(aluno.ra) ?? null,
    sessoes: sessPorRa.get(aluno.ra) ?? [],
    respostas: respPorRa.get(aluno.ra) ?? [],
    dominio_bloco: domPorRa.get(aluno.ra) ?? [],
    badges: badPorRa.get(aluno.ra) ?? []
  }));
}
