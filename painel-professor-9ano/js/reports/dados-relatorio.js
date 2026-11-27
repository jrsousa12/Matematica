// Monta as linhas do relatório (CSV e PDF) a partir do resultado de calcularTurma(). Funções puras.

import { formatarDiaBr } from '../util/datas.js';

export const COLUNAS = [
  'Código', 'Nome', 'Situação', 'Motivos', 'Faixa de uso', 'Sessões por semana',
  'Streak', 'XP', 'Nível', 'Acerto no período', 'Bloco atual', 'Última exportação', 'Dias sem exportar'
];

const SITUACAO = { ok: 'Em dia', atencao: 'Atenção', risco: 'Em risco' };
const FAIXA = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
const decimal = (n) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// situacao: 'todos' | 'risco' (atenção ou em risco) | 'atencao' | 'ok'
export function filtrarPorSituacao(alunos, situacao) {
  if (situacao === 'risco') return alunos.filter((a) => a.risco.nivel !== 'ok');
  if (situacao === 'atencao' || situacao === 'ok') return alunos.filter((a) => a.risco.nivel === situacao);
  return alunos;
}

// itens: base lida do banco (para XP e nível, que não estão em calcularTurma).
export function montarLinhas(alunos, itens) {
  const porRa = new Map(itens.map((i) => [i.aluno.ra, i]));
  return [...alunos]
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    .map((a) => {
      const prog = porRa.get(a.ra)?.progresso ?? {};
      return [
        a.ra, a.nome, SITUACAO[a.risco.nivel], a.risco.motivos.join('; '), FAIXA[a.faixa],
        decimal(a.sessoesPorSemana), a.streak, prog.xp_total ?? 0, prog.nivel ?? 1,
        a.acerto === null ? '-' : `${a.acerto}%`, a.blocoAtual,
        formatarDiaBr(a.ultimaExportacao), a.diasSemExportar
      ];
    });
}

export function tituloRelatorio(config, periodo) {
  return `Turma ${config.turma_codigo} (${config.turma_nome}) - período ${formatarDiaBr(periodo.inicio)} a ${formatarDiaBr(periodo.fim)}`;
}

export function nomeArquivo(config, hojeDia, extensao) {
  return `relatorio_${config.turma_codigo}_${hojeDia}.${extensao}`;
}
