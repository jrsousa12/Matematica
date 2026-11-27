// Navegacao por hash: Onboarding, Home, Trilha, Licao, Pratica, Resultado, Perfil.

import * as onboarding from './ui/onboarding.js';
import * as home from './ui/home.js';
import * as trilha from './ui/trilha.js';
import * as licao from './ui/licao.js';
import * as pratica from './ui/pratica.js';
import * as resultado from './ui/resultado.js';
import * as perfil from './ui/perfil.js';
import { obterPerfil } from './db/progress-repo.js';

const ROTAS = {
  onboarding: { modulo: onboarding, titulo: 'Bem-vindo', barra: false },
  home: { modulo: home, titulo: 'Início', barra: true, aba: 'home' },
  trilha: { modulo: trilha, titulo: 'Trilha', barra: true, aba: 'trilha' },
  licao: { modulo: licao, titulo: 'Lição', barra: false },
  pratica: { modulo: pratica, titulo: 'Prática', barra: false },
  resultado: { modulo: resultado, titulo: 'Resultado', barra: false },
  perfil: { modulo: perfil, titulo: 'Perfil', barra: true, aba: 'perfil' }
};

let renderizando = 0;

function lerHash() {
  const partes = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return { nome: partes[0] || 'home', params: partes.slice(1) };
}

export function navegar(caminho) {
  const alvo = `#/${caminho}`;
  if (location.hash === alvo) renderizar();
  else location.hash = alvo;
}

function marcarAba(aba) {
  document.querySelectorAll('.barra-inferior a').forEach((a) => {
    if (a.dataset.aba === aba) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

export async function renderizar() {
  const execucao = ++renderizando;
  let { nome, params } = lerHash();
  const temPerfil = Boolean(await obterPerfil());
  if (!temPerfil && nome !== 'onboarding') nome = 'onboarding';
  if (temPerfil && nome === 'onboarding') nome = 'home';
  const rota = ROTAS[nome] || ROTAS.home;

  const container = document.getElementById('conteudo');
  document.body.classList.toggle('sem-barra', !rota.barra);
  document.getElementById('titulo-pagina').textContent = rota.titulo;
  document.getElementById('topo-extra').textContent = '';
  marcarAba(rota.aba);
  container.innerHTML = '<p class="carregando">Carregando...</p>';
  try {
    if (execucao !== renderizando) return;
    await rota.modulo.render(container, params, { navegar });
    window.scrollTo(0, 0);
    container.focus({ preventScroll: true });
  } catch (erro) {
    console.error(erro);
    container.innerHTML = `<div class="card card--alerta pilha-sm">
      <h2>Algo deu errado</h2>
      <p>Seu progresso está salvo. Tente voltar ao início.</p>
      <a class="botao" href="#/home">Voltar ao início</a></div>`;
  }
}

export function iniciarRouter() {
  window.addEventListener('hashchange', renderizar);
  renderizar();
}
