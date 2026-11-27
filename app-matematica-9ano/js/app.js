// Boot: armazenamento persistente, service worker, carga de conteudo,
// rotina diaria (freeze, virada semanal, avanco de bloco) e roteador.

import { carregarConteudo } from './db/seed.js';
import { obterPerfil } from './db/progress-repo.js';
import { rotinaDiaria } from './motor/session-runner.js';
import { iniciarRouter, renderizar } from './router.js';
import { hoje } from './util/datas.js';

export const APP_VERSION = '1.0.0';

let diaDaRotina = null;

async function pedirPersistencia() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const ja = await navigator.storage.persisted();
      if (!ja) await navigator.storage.persist();
    }
  } catch (e) { /* navegador sem suporte */ }
}

function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline continua via cache */ });
  });
}

async function executarRotina() {
  if (!(await obterPerfil())) return;
  diaDaRotina = hoje();
  await rotinaDiaria();
}

// Se o app ficar aberto de um dia para o outro, refaz a rotina ao voltar.
function observarViradaDeDia() {
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') return;
    if (diaDaRotina && diaDaRotina !== hoje()) {
      await executarRotina();
      renderizar();
    }
  });
}

async function boot() {
  registrarServiceWorker();
  await pedirPersistencia();
  try {
    await carregarConteudo(APP_VERSION);
  } catch (erro) {
    document.getElementById('conteudo').innerHTML =
      '<div class="card card--alerta"><h2>Sem conexão</h2>' +
      '<p>Abra o aplicativo uma vez com internet para baixar o conteúdo.</p></div>';
    return;
  }
  await executarRotina();
  observarViradaDeDia();
  iniciarRouter();
}

boot();
