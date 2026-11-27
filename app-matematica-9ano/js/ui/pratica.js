// Fluxo da sessao: exibe a questao, feedback imediato e persiste a cada resposta.
// Se o navegador fechar, a sessao e retomada a partir de sessao_atual.

import * as runner from '../motor/session-runner.js';
import { NOME_DIFICULDADE } from './comum.js';

const LETRAS = ['A', 'B', 'C', 'D'];

function pontos(sessao) {
  const total = sessao.fontes.length;
  let html = '';
  for (let i = 0; i < total; i++) {
    const item = sessao.itens[i];
    let classe = '';
    if (item) classe = item.correta ? 'certo' : 'errado';
    else if (i === sessao.itens.length) classe = 'atual';
    html += `<span class="${classe}"></span>`;
  }
  return `<div class="pontos" aria-hidden="true">${html}</div>`;
}

function rotuloFonte(sessao) {
  if (sessao.tipo === 'desafio') return 'Desafio diário';
  const fonte = sessao.corrente ? sessao.corrente.fonte : 'atual';
  return fonte === 'revisao' ? 'Revisão' : 'Bloco da semana';
}

function telaQuestao(sessao, questao) {
  const n = sessao.itens.length + 1;
  return `
    <div class="pilha">
      ${pontos(sessao)}
      <div class="linha linha--entre pequeno suave">
        <span>${rotuloFonte(sessao)} · ${NOME_DIFICULDADE[questao.dificuldade] || ''}</span>
        <span>Questão ${n} de ${sessao.fontes.length}</span>
      </div>
      <section class="card pilha">
        <div class="enunciado">${questao.enunciado}</div>
        <ul class="alternativas" role="list">
          ${questao.alternativas.map((alt, i) => `
            <li><button class="alternativa" data-indice="${i}">
              <span class="alternativa__letra" aria-hidden="true">${LETRAS[i]}</span>
              <span><span class="sr">Alternativa ${LETRAS[i]}: </span>${alt}</span>
            </button></li>`).join('')}
        </ul>
      </section>
      <div id="area-feedback" aria-live="polite"></div>
      <a class="botao botao--fantasma" href="#/home" id="sair">Sair e continuar depois</a>
    </div>`;
}

function feedback(resultado, terminou) {
  const q = resultado.questao;
  const titulo = resultado.correta ? 'Muito bem!' : `Quase. A resposta certa é ${resultado.letraCorreta}.`;
  const texto = resultado.correta ? q.explicacao_acerto : q.explicacao_erro;
  return `<div class="pilha">
    <div class="feedback ${resultado.correta ? 'feedback--acerto' : 'feedback--erro'}">
      <p class="feedback__titulo">${titulo} <span class="pequeno">+${resultado.xp} XP</span></p>
      <p class="pequeno">${texto}</p>
    </div>
    <button class="botao" id="proxima">${terminou ? 'Ver resultado' : 'Próxima questão'}</button>
  </div>`;
}

async function finalizar(sessao, navegar) {
  await runner.concluirSessao(sessao);
  navegar('resultado');
}

export async function render(container, params, { navegar }) {
  const sessao = await runner.sessaoEmAndamento();
  if (!sessao) {
    navegar('home');
    return;
  }
  if (runner.sessaoTerminada(sessao)) {
    await finalizar(sessao, navegar);
    return;
  }
  const questao = await runner.questaoCorrente(sessao);
  if (!questao) {
    await finalizar(sessao, navegar);
    return;
  }
  document.getElementById('titulo-pagina').textContent =
    sessao.tipo === 'desafio' ? 'Desafio diário' : 'Missão do dia';
  container.innerHTML = telaQuestao(sessao, questao);

  let respondida = false;
  container.querySelectorAll('.alternativa').forEach((botao) => {
    botao.addEventListener('click', async () => {
      if (respondida) return;
      respondida = true;
      const indice = Number(botao.dataset.indice);
      container.querySelectorAll('.alternativa').forEach((b) => { b.disabled = true; });
      const r = await runner.responder(sessao, indice);
      const indiceCorreto = LETRAS.indexOf(r.letraCorreta);
      container.querySelectorAll('.alternativa')[indiceCorreto].classList.add('alternativa--correta');
      if (!r.correta) botao.classList.add('alternativa--errada');
      const terminou = runner.sessaoTerminada(r.sessao);
      const area = container.querySelector('#area-feedback');
      area.innerHTML = feedback(r, terminou);
      container.querySelector('#sair').classList.add('oculto');
      const proxima = area.querySelector('#proxima');
      proxima.focus();
      proxima.scrollIntoView({ behavior: 'smooth', block: 'center' });
      proxima.addEventListener('click', async () => {
        proxima.disabled = true;
        if (terminou) await finalizar(r.sessao, navegar);
        else render(container, params, { navegar });
      });
    });
  });
}

