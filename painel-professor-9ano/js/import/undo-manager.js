// Desfazer lote: guarda a foto dos alunos antes do lote e a restaura se o professor pedir.
// Só o lote mais recente pode ser desfeito (os anteriores perdem a foto, para o banco não crescer).

import { db } from '../db/schema.js';
import { restaurarAluno } from '../db/teacher-repo.js';

export async function guardarFotoDoLote(loteId, antes) {
  await db.import_snapshot.clear();
  await db.import_snapshot.put({ lote_id: loteId, antes });
}

// Retorna o lote mais recente que ainda pode ser desfeito, ou null.
export async function loteDesfazivel() {
  const ultimo = await db.import_log.orderBy('id').last();
  if (!ultimo || ultimo.desfeito || ultimo.importados + ultimo.atualizados === 0) return null;
  const foto = await db.import_snapshot.get(ultimo.lote_id);
  return foto ? ultimo : null;
}

export async function desfazerUltimoLote() {
  const lote = await loteDesfazivel();
  if (!lote) return { ok: false, mensagem: 'Não há lote que possa ser desfeito.' };
  const foto = await db.import_snapshot.get(lote.lote_id);
  for (const [ra, dados] of Object.entries(foto.antes)) await restaurarAluno(ra, dados);
  await db.import_log.update(lote.id, { desfeito: true });
  await db.import_snapshot.delete(lote.lote_id);
  return { ok: true, mensagem: `Lote desfeito: ${Object.keys(foto.antes).length} aluno(s) voltaram ao estado anterior.` };
}
