// CSV com UTF-8 BOM (abre com acentos no Excel) e separador ";" (padrão do Excel em português).

import { COLUNAS } from './dados-relatorio.js';

const BOM = '﻿';

// Protege contra fórmula no Excel (=, +, -, @ no início) e escapa aspas, ";" e quebras de linha.
function celula(valor) {
  let t = String(valor ?? '');
  if (/^[=+\-@\t\r]/.test(t) && !/^-?\d+([.,]\d+)?%?$/.test(t) && t !== '-') t = `'${t}`;
  return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

export function gerarCsv(linhas) {
  const todas = [COLUNAS, ...linhas];
  return BOM + todas.map((l) => l.map(celula).join(';')).join('\r\n') + '\r\n';
}

export function baixarCsv(texto, nome) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nome });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
