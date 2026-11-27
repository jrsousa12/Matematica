// Utilitarios de data. Todas as datas usam o fuso local do dispositivo.
// Formato de dia: "AAAA-MM-DD" (string local, nunca UTC).

function pad(n) {
  return String(n).padStart(2, '0');
}

export function diaLocal(data = new Date()) {
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}`;
}

export function hoje() {
  return diaLocal(new Date());
}

export function parseDia(dia) {
  const [a, m, d] = dia.split('-').map(Number);
  return new Date(a, m - 1, d, 12, 0, 0); // meio-dia evita problemas de horario de verao
}

export function somarDias(dia, n) {
  const d = parseDia(dia);
  d.setDate(d.getDate() + n);
  return diaLocal(d);
}

export function diferencaDias(diaA, diaB) {
  // diaB - diaA em dias inteiros
  const ms = parseDia(diaB) - parseDia(diaA);
  return Math.round(ms / 86400000);
}

// Semana ISO (segunda a domingo), ex.: "2026-W08"
export function semanaIso(dia) {
  const d = parseDia(dia);
  const diaSemana = (d.getDay() + 6) % 7; // 0 = segunda
  d.setDate(d.getDate() - diaSemana + 3); // quinta-feira da semana
  const anoIso = d.getFullYear();
  const primeiraQuinta = new Date(anoIso, 0, 4, 12);
  const diaPQ = (primeiraQuinta.getDay() + 6) % 7;
  primeiraQuinta.setDate(primeiraQuinta.getDate() - diaPQ + 3);
  const semana = 1 + Math.round((d - primeiraQuinta) / (7 * 86400000));
  return `${anoIso}-W${pad(semana)}`;
}

// ISO 8601 com deslocamento local, ex.: "2026-02-20T18:30:00-03:00"
export function isoLocal(data = new Date()) {
  const off = -data.getTimezoneOffset();
  const sinal = off >= 0 ? '+' : '-';
  const abs = Math.abs(off);
  return `${diaLocal(data)}T${pad(data.getHours())}:${pad(data.getMinutes())}:${pad(data.getSeconds())}` +
    `${sinal}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

export function formatarDiaBr(dia) {
  if (!dia) return '-';
  const [a, m, d] = dia.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}
