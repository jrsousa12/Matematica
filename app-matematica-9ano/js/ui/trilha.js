// Mapa dos 10 blocos com percentual de dominio.

import { resumoTrilha } from '../motor/resumos.js';
import { esc } from './comum.js';

const ROTULO_ESTADO = {
  atual: 'Bloco da semana',
  concluido: 'Concluído',
  bloqueado: 'Bloqueado',
  em_breve: 'Em breve'
};

function itemBloco(b) {
  const pct = b.percentual === null ? null : b.percentual;
  const barra = pct === null ? '' : `
    <div class="barra-progresso barra-progresso--dominio" aria-hidden="true">
      <span style="width:${pct}%"></span></div>`;
  const detalhe = pct === null ? ROTULO_ESTADO[b.estado] : `${ROTULO_ESTADO[b.estado]} · ${pct}% de acerto`;
  const podeAbrir = (b.estado === 'atual' || b.estado === 'concluido') && b.temLicao;
  const acao = podeAbrir
    ? `<a class="botao botao--compacto botao--secundario" href="#/licao/${b.id}"
         aria-label="Abrir lição do bloco ${b.ordem}">Lição</a>`
    : '';
  return `<li class="card trilha__item trilha__item--${b.estado}">
    <span class="trilha__num" aria-hidden="true">${b.ordem}</span>
    <div class="trilha__corpo pilha-sm">
      <strong>${esc(b.titulo)}</strong>
      <span class="pequeno suave">${esc(detalhe)}</span>
      ${barra}
    </div>
    ${acao}
  </li>`;
}

export async function render(container) {
  const blocos = await resumoTrilha();
  const camadas = [...new Set(blocos.map((b) => b.camada))];
  container.innerHTML = `
    <div class="pilha">
      <div class="pilha-sm">
        <h1>Sua trilha</h1>
        <p class="suave pequeno">Um bloco por semana. Os blocos anteriores voltam na revisão.</p>
      </div>
      ${camadas.map((c) => `
        <section class="pilha-sm">
          <h2 class="rotulo">${esc(c)}</h2>
          <ol class="trilha">${blocos.filter((b) => b.camada === c).map(itemBloco).join('')}</ol>
        </section>`).join('')}
    </div>`;
}
