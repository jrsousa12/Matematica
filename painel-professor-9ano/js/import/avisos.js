// Avisos leves de adulteração ou inconsistência. Não bloqueiam a importação; só alertam o professor.
// Recebe um snapshot que já passou nos 4 níveis do validador.

const BONUS_BLOCO = 100;
const BONUS_DESAFIO_DIA = 15;
const MARGEM_XP = 10;
const TOLERANCIA_RELOGIO_MS = 24 * 3600 * 1000;

function avisoData(s, agora) {
  const quando = Date.parse(s.exported_at);
  if (quando > agora.getTime() + TOLERANCIA_RELOGIO_MS) {
    return ['A data de exportação está no futuro (o relógio do celular pode estar errado).'];
  }
  return [];
}

// XP esperado = soma do XP das sessões + bônus de blocos concluídos + desafio diário (no máximo 1 por dia).
function avisoXp(s) {
  const soma = s.sessoes.reduce((total, x) => total + (Number(x.xp_ganho) || 0), 0);
  const dias = new Set(s.sessoes.map((x) => String(x.data).slice(0, 10))).size;
  const concluidos = Array.isArray(s.progresso.blocos_concluidos) ? s.progresso.blocos_concluidos.length : 0;
  const limite = soma + concluidos * BONUS_BLOCO + dias * BONUS_DESAFIO_DIA + MARGEM_XP;
  if (s.progresso.xp_total > limite) {
    return [`O XP total (${s.progresso.xp_total}) é maior do que as sessões justificam (até ${limite}).`];
  }
  return [];
}

// O domínio de cada bloco deve bater com as respostas registradas (quando há respostas).
function avisoDominio(s) {
  if (!s.respostas.length) return [];
  const avisos = [];
  for (const d of s.dominio_bloco) {
    const doBloco = s.respostas.filter((r) => r.bloco_id === d.bloco_id);
    const acertos = doBloco.filter((r) => r.correta).length;
    if (doBloco.length !== d.total || acertos !== d.acertos) {
      avisos.push(`O domínio do bloco ${d.bloco_id} (${d.acertos}/${d.total}) não bate com as respostas (${acertos}/${doBloco.length}).`);
    }
  }
  return avisos;
}

export function gerarAvisos(s, agora = new Date()) {
  return [...avisoData(s, agora), ...avisoXp(s), ...avisoDominio(s)];
}
