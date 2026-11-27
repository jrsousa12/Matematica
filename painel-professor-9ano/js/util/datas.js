// Utilitários de data do painel. Datas no fuso local; dia no formato "AAAA-MM-DD".

const pad = (n) => String(n).padStart(2, '0');

export function diaLocal(data = new Date()) {
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}`;
}

export function hoje() {
  return diaLocal(new Date());
}

export function parseDia(dia) {
  const [a, m, d] = dia.split('-').map(Number);
  return new Date(a, m - 1, d, 12, 0, 0);
}

export function somarDias(dia, n) {
  const d = parseDia(dia);
  d.setDate(d.getDate() + n);
  return diaLocal(d);
}

// diaB - diaA em dias inteiros
export function diferencaDias(diaA, diaB) {
  return Math.round((parseDia(diaB) - parseDia(diaA)) / 86400000);
}

export function isoLocal(data = new Date()) {
  const off = -data.getTimezoneOffset();
  const sinal = off >= 0 ? '+' : '-';
  const abs = Math.abs(off);
  return `${diaLocal(data)}T${pad(data.getHours())}:${pad(data.getMinutes())}:${pad(data.getSeconds())}` +
    `${sinal}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

// DD/MM/AAAA
export function formatarDiaBr(dia) {
  if (!dia) return '-';
  const [a, m, d] = dia.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

export function formatarDataHoraBr(iso) {
  if (!iso) return '-';
  return `${formatarDiaBr(iso)} ${iso.slice(11, 16)}`;
}
