// Dados do detalhe de um aluno (função pura, sem banco). Entrada: item de lerBase() e o resultado de calcularAluno.

export const NOMES_BLOCOS = [
  'Adição e subtração (naturais)', 'Multiplicação e divisão (naturais)', 'Inteiros: adição e subtração',
  'Inteiros: multiplicação e divisão', 'Expressões numéricas', 'Frações: representação e comparação',
  'Frações: adição e subtração', 'Frações: multiplicação e divisão', 'Decimais: operações', 'Porcentagem básica'
];

export const NOMES_BADGES = {
  primeiro_passo: 'Primeiro passo', streak_3: 'Streak de 3 dias', streak_7: 'Streak de 7 dias',
  streak_14: 'Streak de 14 dias', streak_30: 'Streak de 30 dias', blocos_1_2: 'Blocos 1 e 2',
  blocos_3_4: 'Blocos 3 e 4', blocos_5_6: 'Blocos 5 e 6', blocos_7_8: 'Blocos 7 e 8',
  blocos_9_10: 'Blocos 9 e 10', pratica_perfeita: 'Prática perfeita', sequencia_10: 'Sequência de 10 acertos'
};

const TIPOS = { missao: 'Missão', desafio: 'Desafio diário' };
const RECENTES = 10;

export function montarDetalhe(item, calc) {
  const dominio = new Map(item.dominio_bloco.map((d) => [d.bloco_id, d]));
  const blocos = NOMES_BLOCOS.map((titulo, i) => {
    const d = dominio.get(i + 1);
    return { id: i + 1, titulo, percentual: d ? d.percentual : null, acertos: d?.acertos ?? 0, total: d?.total ?? 0 };
  });
  const recentes = [...item.sessoes].sort((a, b) => String(b.data).localeCompare(String(a.data))).slice(0, RECENTES)
    .map((s) => ({ data: s.data, tipo: TIPOS[s.tipo] ?? s.tipo, bloco: s.bloco_id, acertos: s.acertos, total: s.total, xp: s.xp_ganho }));
  const conquistadas = new Set(item.badges.filter((b) => b.conquistada).map((b) => b.id));
  const badges = Object.entries(NOMES_BADGES).map(([id, nome]) => ({ id, nome, conquistada: conquistadas.has(id) }));
  const tempos = item.respostas.map((r) => r.tempo_seg).filter((t) => Number.isFinite(t));
  return {
    nome: item.aluno.nome, ra: item.aluno.ra, turma: item.aluno.turma_codigo,
    progresso: item.progresso ?? {}, blocos, recentes, badges,
    totalSessoes: item.sessoes.length, totalRespostas: item.respostas.length,
    tempoMedio: tempos.length ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : null,
    exportacoes: item.export_log?.total_exportacoes ?? null,
    risco: calc.risco, faixa: calc.faixa, sessoesPorSemana: calc.sessoesPorSemana, acerto: calc.acerto,
    ultimaExportacao: calc.ultimaExportacao, diasSemExportar: calc.diasSemExportar
  };
}
