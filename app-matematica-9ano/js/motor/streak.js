// Streak diario com freeze semanal automatico (segunda a domingo, fuso local).
// Regras:
//  - Dia valido = missao de 5 questoes concluida.
//  - 1 freeze por semana: faltar 1 dia consome o freeze e preserva o streak (sem somar).
//  - Faltar um segundo dia na mesma semana (sem freeze disponivel) zera o streak;
//    a proxima missao concluida recomeca em 1.
// Funcoes puras: recebem um objeto de progresso e devolvem uma copia atualizada.

import { somarDias, diferencaDias, semanaIso } from '../util/datas.js';

function ultimoDiaCoberto(p) {
  const datas = [p.ultima_missao_data, ...(p.dias_congelados || [])].filter(Boolean).sort();
  return datas.length ? datas[datas.length - 1] : null;
}

function freezesNaSemana(diasCongelados, semana) {
  return diasCongelados.filter((d) => semanaIso(d) === semana).length;
}

// Atualiza semana_ref e freezes_usados_semana para a semana do dia informado.
export function aplicarViradaSemanal(progresso, diaHoje) {
  const p = { ...progresso, dias_congelados: [...(progresso.dias_congelados || [])] };
  const semana = semanaIso(diaHoje);
  p.semana_ref = semana;
  p.freezes_usados_semana = freezesNaSemana(p.dias_congelados, semana);
  // Mantem apenas congelamentos recentes (ultimas ~5 semanas) para nao crescer sem limite.
  p.dias_congelados = p.dias_congelados.filter((d) => diferencaDias(d, diaHoje) <= 35);
  return p;
}

// Percorre os dias perdidos ate ONTEM, consumindo freezes ou zerando o streak.
export function avaliarDiasPerdidos(progresso, diaHoje, freezeAtivo = true) {
  let p = { ...progresso, dias_congelados: [...(progresso.dias_congelados || [])] };
  const congeladosAntes = p.dias_congelados.length;
  if (!p.streak_atual || !p.ultima_missao_data) {
    return { progresso: aplicarViradaSemanal(p, diaHoje), freezesConsumidos: 0, quebrou: false };
  }
  const ontem = somarDias(diaHoje, -1);
  let dia = somarDias(ultimoDiaCoberto(p), 1);
  let quebrou = false;
  while (dia <= ontem) {
    const semana = semanaIso(dia);
    if (freezeAtivo && freezesNaSemana(p.dias_congelados, semana) < 1) {
      p.dias_congelados.push(dia);
    } else {
      p.streak_atual = 0;
      quebrou = true;
      break;
    }
    dia = somarDias(dia, 1);
  }
  const freezesConsumidos = quebrou ? 0 : p.dias_congelados.length - congeladosAntes;
  p = aplicarViradaSemanal(p, diaHoje);
  return { progresso: p, freezesConsumidos, quebrou };
}

// Registra uma missao concluida hoje. Retorna se foi a primeira missao do dia.
export function registrarMissao(progresso, diaHoje, freezeAtivo = true) {
  const { progresso: avaliado } = avaliarDiasPerdidos(progresso, diaHoje, freezeAtivo);
  const p = { ...avaliado };
  const primeiraDoDia = p.ultima_missao_data !== diaHoje;
  if (primeiraDoDia) {
    p.streak_atual = p.streak_atual > 0 ? p.streak_atual + 1 : 1;
    p.ultima_missao_data = diaHoje;
  }
  p.streak_recorde = Math.max(p.streak_recorde || 0, p.streak_atual);
  return { progresso: p, primeiraDoDia };
}

// Situacao do streak para exibicao na Home.
export function situacaoStreak(progresso, diaHoje) {
  if (!progresso.streak_atual) return 'inativo';
  if (progresso.ultima_missao_data === diaHoje) return 'feito_hoje';
  return 'pendente_hoje';
}
