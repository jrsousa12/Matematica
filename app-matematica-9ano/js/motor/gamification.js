// XP, moedas, niveis e os 12 badges. Funcoes puras, sem acesso ao banco.

export const XP = {
  acerto: 10,
  erro: 2,
  missao: 20,
  desafio: 15,
  bloco: 100
};

export const MOEDAS = {
  acerto: 5,
  missao: 20,
  bloco: 50
};

export const CURVA_NIVEIS = [0, 100, 250, 500, 850, 1300, 1900, 2600, 3500, 4500];

export const BADGES = [
  { id: 'primeiro_passo', titulo: 'Primeiro passo', descricao: 'Concluiu a primeira missão.' },
  { id: 'streak_3', titulo: 'Sequência de 3', descricao: '3 dias seguidos de missão.' },
  { id: 'streak_7', titulo: 'Sequência de 7', descricao: '7 dias seguidos de missão.' },
  { id: 'streak_14', titulo: 'Sequência de 14', descricao: '14 dias seguidos de missão.' },
  { id: 'streak_30', titulo: 'Sequência de 30', descricao: '30 dias seguidos de missão.' },
  { id: 'blocos_1_2', titulo: 'Blocos 1 e 2', descricao: 'Concluiu os blocos 1 e 2.' },
  { id: 'blocos_3_4', titulo: 'Blocos 3 e 4', descricao: 'Concluiu os blocos 3 e 4.' },
  { id: 'blocos_5_6', titulo: 'Blocos 5 e 6', descricao: 'Concluiu os blocos 5 e 6.' },
  { id: 'blocos_7_8', titulo: 'Blocos 7 e 8', descricao: 'Concluiu os blocos 7 e 8.' },
  { id: 'blocos_9_10', titulo: 'Blocos 9 e 10', descricao: 'Concluiu os blocos 9 e 10.' },
  { id: 'pratica_perfeita', titulo: 'Prática perfeita', descricao: '100% de acerto em uma prática.' },
  { id: 'sequencia_10', titulo: '10 em sequência', descricao: '10 acertos seguidos.' }
];

export function bonusStreak(streakAtual) {
  return Math.min(streakAtual * 5, 50);
}

export function nivelPorXp(xp) {
  let nivel = 1;
  CURVA_NIVEIS.forEach((minimo, i) => {
    if (xp >= minimo) nivel = i + 1;
  });
  return nivel;
}

// Progresso dentro do nivel atual, para a barra de XP.
export function progressoNivel(xp) {
  const nivel = nivelPorXp(xp);
  const inicio = CURVA_NIVEIS[nivel - 1];
  const fim = CURVA_NIVEIS[nivel] ?? null;
  if (fim === null) return { nivel, inicio, fim: inicio, percentual: 100, faltam: 0 };
  const percentual = Math.round(((xp - inicio) / (fim - inicio)) * 100);
  return { nivel, inicio, fim, percentual, faltam: fim - xp };
}

export function xpPorResposta(correta) {
  return correta ? XP.acerto : XP.erro;
}

export function moedasPorResposta(correta) {
  return correta ? MOEDAS.acerto : 0;
}

// Aplica ganhos ao progresso e recalcula o nivel.
export function aplicarGanhos(progresso, xp, moedas) {
  const p = { ...progresso };
  p.xp_total = (p.xp_total || 0) + xp;
  p.moedas = (p.moedas || 0) + moedas;
  p.nivel = nivelPorXp(p.xp_total);
  return p;
}

// Atualiza o contador de acertos seguidos.
export function atualizarSequencia(progresso, correta) {
  return { ...progresso, sequencia_acertos: correta ? (progresso.sequencia_acertos || 0) + 1 : 0 };
}

const PARES_BLOCOS = [
  ['blocos_1_2', [1, 2]], ['blocos_3_4', [3, 4]], ['blocos_5_6', [5, 6]],
  ['blocos_7_8', [7, 8]], ['blocos_9_10', [9, 10]]
];

// Devolve os ids de badges que devem ser conquistados agora (e ainda nao foram).
// contexto: { progresso, missaoConcluida, acertosSessao, totalSessao }
export function avaliarBadges(contexto, jaConquistadas) {
  const ja = new Set(jaConquistadas);
  const novas = [];
  const add = (id) => { if (!ja.has(id)) { novas.push(id); ja.add(id); } };
  const { progresso, missaoConcluida, acertosSessao = 0, totalSessao = 0 } = contexto;

  if (missaoConcluida) add('primeiro_passo');
  [3, 7, 14, 30].forEach((n) => { if (progresso.streak_atual >= n) add(`streak_${n}`); });
  const concluidos = new Set(progresso.blocos_concluidos || []);
  PARES_BLOCOS.forEach(([id, par]) => { if (par.every((b) => concluidos.has(b))) add(id); });
  if (missaoConcluida && totalSessao >= 3 && acertosSessao === totalSessao) add('pratica_perfeita');
  if ((progresso.sequencia_acertos || 0) >= 10) add('sequencia_10');
  return novas;
}

export function registrosBadges(ids, quando) {
  return ids.map((id) => ({ id, conquistada: true, conquistada_em: quando }));
}

export function infoBadge(id) {
  return BADGES.find((b) => b.id === id);
}
