// Navegação por hash entre as 4 abas: Painel, Importar, Exportar e Configurações.
// Nesta etapa cada aba mostra apenas um aviso; o conteúdo entra nas partes seguintes.

const ABAS = {
  painel: { titulo: 'Painel', aviso: 'Cards de resumo, busca e tabela de alunos entram na parte 3.4.' },
  importar: { titulo: 'Importar', aviso: 'Importação em lote dos arquivos dos alunos entra na parte 3.3.' },
  exportar: { titulo: 'Exportar', aviso: 'Relatórios em CSV e PDF entram na parte 3.6.' },
  config: { titulo: 'Configurações', aviso: 'Código da turma, metas, backup e reset entram na parte 3.7.' }
};

const ABA_INICIAL = 'painel';

function abaAtual() {
  const nome = location.hash.replace(/^#\/?/, '').split('/')[0];
  return ABAS[nome] ? nome : ABA_INICIAL;
}

function esc(texto) {
  const d = document.createElement('div');
  d.textContent = texto;
  return d.innerHTML;
}

function renderizar() {
  const nome = abaAtual();
  const aba = ABAS[nome];
  document.querySelectorAll('.abas a').forEach((a) => {
    if (a.dataset.aba === nome) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  document.title = `${aba.titulo} · Painel do Professor`;
  document.getElementById('conteudo').innerHTML =
    `<h1>${esc(aba.titulo)}</h1><section class="cartao"><p class="suave">${esc(aba.aviso)}</p></section>`;
}

export function iniciarRouter() {
  window.addEventListener('hashchange', renderizar);
  if (!location.hash) location.replace(`#/${ABA_INICIAL}`);
  renderizar();
}
