// Licao do bloco: texto curto + 3 exemplos resolvidos passo a passo.
// O conteudo vem do autor (JSON versionado) e pode conter HTML simples (sup, sub, frac).

import { obterLicao, registrarEvento } from '../db/progress-repo.js';
import { esc } from './comum.js';

const TIPO_EXEMPLO = {
  direto: 'Exemplo direto',
  intermediario: 'Exemplo intermediário',
  contextualizado: 'Exemplo do dia a dia'
};

// Aceita dois formatos de exemplo: com "titulo" e a resposta dentro de "passos"
// ("Resposta: ..."), ou com "tipo" e um campo "resposta" separado.
function passo(texto) {
  if (/^Resposta:/i.test(texto)) return `<li class="passo-resposta"><strong>${texto}</strong></li>`;
  return `<li>${texto}</li>`;
}

function exemplo(e, i) {
  const titulo = e.titulo || TIPO_EXEMPLO[e.tipo] || `Exemplo ${i + 1}`;
  return `<section class="card pilha-sm exemplo">
    <span class="rotulo">${esc(titulo)}</span>
    <p><strong>${e.enunciado}</strong></p>
    <ul class="passos">${e.passos.map(passo).join('')}</ul>
    ${e.resposta ? `<p class="pequeno"><strong>Resposta:</strong> ${e.resposta}</p>` : ''}
  </section>`;
}

export async function render(container, params) {
  const blocoId = Number(params[0]);
  const licao = await obterLicao(blocoId);
  if (!licao) {
    container.innerHTML = `<div class="card pilha-sm"><h2>Lição em breve</h2>
      <p class="suave">Esta lição ainda não foi publicada.</p>
      <a class="botao" href="#/trilha">Voltar para a trilha</a></div>`;
    return;
  }
  registrarEvento('licao_aberta', { bloco_id: blocoId });
  container.innerHTML = `
    <article class="pilha">
      <div class="pilha-sm">
        <span class="rotulo">Bloco ${blocoId}</span>
        <h1>${esc(licao.titulo)}</h1>
      </div>
      <section class="card pilha-sm">
        ${licao.paragrafos.map((p) => `<p>${p}</p>`).join('')}
      </section>
      ${licao.exemplos.map(exemplo).join('')}
      <a class="botao" href="#/home">Ir para a missão</a>
      <a class="botao botao--fantasma" href="#/trilha">Voltar para a trilha</a>
    </article>`;
}
