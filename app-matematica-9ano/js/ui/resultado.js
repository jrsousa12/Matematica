// Resumo pos-sessao: acertos, XP, moedas, streak, badges e avanco de bloco.

import { ultimoResultado } from '../motor/session-runner.js';
import { infoBadge } from '../motor/gamification.js';
import { esc } from './comum.js';

function mensagem(r) {
  const pct = r.total ? r.acertos / r.total : 0;
  if (pct === 1) return 'Prática perfeita!';
  if (pct >= 0.6) return 'Bom trabalho!';
  return 'Cada erro é uma pista. A revisão vai trazer essas questões de volta.';
}

export async function render(container) {
  const r = await ultimoResultado();
  if (!r) {
    location.hash = '#/home';
    return;
  }
  const badges = (r.badges || []).map(infoBadge).filter(Boolean);
  const itens = r.itens.map((i) => `<span class="${i.correta ? 'certo' : 'errado'}"></span>`).join('');
  container.innerHTML = `
    <div class="pilha">
      <div class="pilha-sm centro">
        <span class="rotulo">${r.tipo === 'desafio' ? 'Desafio diário' : 'Missão concluída'}</span>
        <h1>${r.acertos} de ${r.total} acertos</h1>
        <p class="suave">${mensagem(r)}</p>
        <div class="pontos" aria-hidden="true">${itens}</div>
      </div>
      <div class="indicadores">
        <div class="indicador indicador--xp"><strong>+${r.xp}</strong><span class="pequeno">XP</span></div>
        <div class="indicador indicador--moeda"><strong>+${r.moedas}</strong><span class="pequeno">moedas</span></div>
        <div class="indicador indicador--streak"><strong>${r.streak}</strong>
          <span class="pequeno">dias seguidos</span></div>
      </div>
      ${r.subiuNivel ? `<section class="card card--destaque centro"><h2>Você chegou ao nível ${r.nivel}!</h2></section>` : ''}
      ${r.blocosConcluidos.length ? `<section class="card card--destaque centro pilha-sm">
        <h2>Bloco concluído</h2><p class="pequeno">Um novo bloco foi liberado na sua trilha.</p></section>` : ''}
      ${badges.length ? `<section class="card pilha-sm"><h2>Nova conquista</h2>
        <div class="badges">${badges.map((b) => `<div class="badge badge--conquistada">
          <strong>${esc(b.titulo)}</strong>${esc(b.descricao)}</div>`).join('')}</div></section>` : ''}
      ${r.tipo === 'missao' && r.primeiraDoDia
    ? '<p class="pequeno suave centro">Missão de hoje registrada na sua sequência.</p>' : ''}
      <a class="botao" href="#/home">Voltar ao início</a>
      <a class="botao botao--fantasma" href="#/trilha">Ver trilha</a>
    </div>`;
}
