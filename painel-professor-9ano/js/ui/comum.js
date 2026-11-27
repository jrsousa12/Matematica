// Ajudantes de interface compartilhados pelas abas.

export function esc(valor) {
  const d = document.createElement('div');
  d.textContent = valor ?? '';
  return d.innerHTML;
}

// Etiqueta colorida (verde, amarelo, vermelho ou cinza).
export function pilula(texto, cor) {
  return `<span class="pilula pilula--${cor}">${esc(texto)}</span>`;
}

export function numeroBr(n, casas = 0) {
  return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}
