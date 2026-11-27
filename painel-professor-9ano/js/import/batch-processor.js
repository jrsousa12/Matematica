// Importação em lote tolerante a falhas: um arquivo ruim não derruba os outros.
// Regras: valida cada arquivo; por RA fica só a exportação mais recente (inclusive contra o que já está no banco).

import { db } from '../db/schema.js';
import { validarSnapshot } from './validator.js';
import { guardarFotoDoLote } from './undo-manager.js';
import { lerAlunoCompleto, substituirSnapshot } from '../db/teacher-repo.js';
import { isoLocal } from '../util/datas.js';

const quando = (iso) => Date.parse(iso);

function item(nome, status, extras = {}) {
  return { arquivo: nome, status, ra: null, aluno: null, mensagem: '', avisos: [], ...extras };
}

function ignoradoNoLote(nome, r) {
  return item(nome, 'ignorado', {
    ra: r.ra, aluno: r.snapshot.perfil.nome, avisos: r.avisos,
    mensagem: 'Há uma exportação mais recente do mesmo aluno neste lote.'
  });
}

// Valida todos os arquivos e, entre vários do mesmo RA no lote, mantém só o mais recente.
function prepararCandidatos(arquivos, config) {
  const itens = [];
  const melhorPorRa = new Map();
  for (const arq of arquivos) {
    const r = validarSnapshot(arq.texto, { turma_codigo: config.turma_codigo });
    if (!r.ok) {
      itens.push(item(arq.nome, 'erro', { ra: r.ra, mensagem: `Nível ${r.nivel_falha}: ${r.erros[0]}` }));
      continue;
    }
    const atual = melhorPorRa.get(r.ra);
    if (!atual || quando(r.snapshot.exported_at) > quando(atual.r.snapshot.exported_at)) {
      if (atual) itens.push(ignoradoNoLote(atual.nome, atual.r));
      melhorPorRa.set(r.ra, { nome: arq.nome, r });
    } else {
      itens.push(ignoradoNoLote(arq.nome, r));
    }
  }
  return { itens, candidatos: [...melhorPorRa.values()] };
}

async function importarCandidato({ nome, r }, antes, importadoEm) {
  const { snapshot, ra } = r;
  const base = { ra, aluno: snapshot.perfil.nome, avisos: r.avisos };
  const existente = await lerAlunoCompleto(ra);
  if (existente && quando(existente.alunos.exported_at) >= quando(snapshot.exported_at)) {
    return item(nome, 'ignorado', { ...base, mensagem: 'O painel já tem uma exportação igual ou mais recente deste aluno.' });
  }
  antes[ra] = existente;
  await substituirSnapshot(snapshot, importadoEm);
  return item(nome, existente ? 'atualizado' : 'importado', base);
}

// arquivos: [{ nome, texto }]. Retorna o relatório do lote (e o grava em import_log).
export async function processarLote(arquivos, config) {
  const importadoEm = isoLocal();
  const loteId = `lote_${Date.now()}`;
  const { itens, candidatos } = prepararCandidatos(arquivos, config);
  const antes = {};
  for (const cand of candidatos) {
    try {
      itens.push(await importarCandidato(cand, antes, importadoEm));
    } catch (erro) {
      console.error(erro);
      itens.push(item(cand.nome, 'erro', { ra: cand.r.ra, mensagem: `Falha ao gravar no banco: ${erro.message}` }));
    }
  }
  const conta = (status) => itens.filter((i) => i.status === status).length;
  const relatorio = {
    lote_id: loteId, importado_em: importadoEm, total: arquivos.length, desfeito: false,
    importados: conta('importado'), atualizados: conta('atualizado'), ignorados: conta('ignorado'), erros: conta('erro'),
    itens
  };
  await db.import_log.add(relatorio);
  if (relatorio.importados + relatorio.atualizados > 0) await guardarFotoDoLote(loteId, antes);
  return relatorio;
}

export function listarLotes(limite = 10) {
  return db.import_log.orderBy('id').reverse().limit(limite).toArray();
}
