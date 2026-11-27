// Detector de risco (função pura). Aluno em risco = streak baixo OU acerto baixo OU muito tempo sem exportar.
// Limites vêm da configuração do painel (meta_streak, risco_acerto_minimo, risco_dias_sem_exportar).

// Retorna { motivos[], nivel }. nivel: "ok" (nenhum motivo), "atencao" (1 motivo) ou "risco" (2 ou mais).
export function detectarRisco({ streak, acerto, diasSemExportar }, config) {
  const motivos = [];
  if (streak < config.meta_streak) motivos.push(`Streak abaixo de ${config.meta_streak}`);
  if (acerto !== null && acerto < config.risco_acerto_minimo) motivos.push(`Acerto abaixo de ${config.risco_acerto_minimo}%`);
  if (diasSemExportar > config.risco_dias_sem_exportar) motivos.push(`Sem exportar há ${diasSemExportar} dias`);
  const nivel = motivos.length === 0 ? 'ok' : motivos.length === 1 ? 'atencao' : 'risco';
  return { motivos, nivel };
}

// Cor do mini-mapa de blocos a partir do percentual de domínio (null = sem dados).
export function corDominio(percentual) {
  if (percentual === null || percentual === undefined) return 'cinza';
  if (percentual >= 80) return 'verde';
  if (percentual >= 60) return 'amarelo';
  return 'vermelho';
}
