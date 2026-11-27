// Navegação por hash entre as 4 abas: Painel, Importar, Exportar e Configurações.
// Cada aba é um módulo com renderizar(elemento). Abas ainda sem módulo mostram um aviso.

import * as painel from './ui/tab-painel.js';
import * as importar from './ui/tab-importar.js';
import { esc } from './ui/comum.js';

const ABAS = {
  painel: { titulo: 'Painel', modulo: painel },
  importar: { titulo: 'Importar', modulo: importar },
  exportar: { titulo: 'Exportar', aviso: 'Relatórios em CSV e PDF entram na parte 3.6.' },
  config: { titulo: 'Configurações', aviso: 'Código da turma, metas, backup e reset entram na parte 3.7.' }
};

const ABA_INICIAL = 'painel';
let versao = 0;

function abaAtual() {
  const nome = location.hash.replace(/^#\/?/, '').split('/')[0];
  return ABAS[nome] ? nome : ABA_INICIAL;
}

async function renderizar() {
  const minha = ++versao;
  const nome = abaAtual();
  const aba = ABAS[nome];
  const el = document.getElementById('conteudo');
  document.querySelectorAll('.abas a').forEach((a) => {
    if (a.dataset.aba === nome) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  document.title = `${aba.titulo} · Painel do Professor`;
  if (!aba.modulo) {
    el.innerHTML = `<h1>${esc(aba.titulo)}</h1><section class="cartao"><p class="suave">${esc(aba.aviso)}</p></section>`;
    return;
  }
  const area = document.createElement('div');
  try {
    await aba.modulo.renderizar(area);
  } catch (erro) {
    console.error(erro);
    area.innerHTML = '<p role="alert">Não foi possível montar esta tela. Veja o console do navegador.</p>';
  }
  if (minha === versao) el.replaceChildren(area);
}

export function iniciarRouter() {
  window.addEventListener('hashchange', renderizar);
  if (!location.hash) location.replace(`#/${ABA_INICIAL}`);
  renderizar();
}
