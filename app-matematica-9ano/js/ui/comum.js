// Utilitarios de apresentacao compartilhados pelas telas (sem regras de negocio).

export function esc(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function toast(mensagem, ms = 2600) {
  const el = document.createElement('div');
  el.className = 'aviso-toast';
  el.setAttribute('role', 'status');
  el.textContent = mensagem;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

// Abre um modal simples. Retorna { el, fechar }.
export function abrirModal(html, { aoFechar } = {}) {
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = `<div class="modal pilha" role="dialog" aria-modal="true">${html}</div>`;
  const fechar = () => {
    fundo.remove();
    document.removeEventListener('keydown', tecla);
    if (aoFechar) aoFechar();
  };
  const tecla = (e) => { if (e.key === 'Escape') fechar(); };
  fundo.addEventListener('click', (e) => { if (e.target === fundo) fechar(); });
  document.addEventListener('keydown', tecla);
  document.body.appendChild(fundo);
  const foco = fundo.querySelector('button, textarea, input');
  if (foco) foco.focus();
  return { el: fundo.querySelector('.modal'), fechar };
}

export function plural(n, singular, pluralForma) {
  return `${n} ${n === 1 ? singular : pluralForma}`;
}

export function formatarNumero(n) {
  return Number(n || 0).toLocaleString('pt-BR');
}

export const NOME_DIFICULDADE = { facil: 'Fácil', media: 'Média', dificil: 'Difícil' };
