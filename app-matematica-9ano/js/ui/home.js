// Dashboard diario: streak, XP, missao do dia, desafio e lembrete de exportacao.

import { resumoHome } from '../motor/resumos.js';
import { iniciarMissao, iniciarDesafio } from '../motor/session-runner.js';
import { esc, toast, formatarNumero } from './comum.js';

function textoStreak(r) {
  if (r.streak === 'feito_hoje') return 'Missão de hoje concluída. Volte amanhã para manter a sequência.';
  if (r.streak === 'pendente_hoje') return 'Faça a missão de hoje para manter a sequência.';
  return 'Conclua uma missão para começar a sua sequência.';
}

function cardMissao(r) {
  if (r.sessaoEmAndamento) {
    const feitas = r.sessaoEmAndamento.itens.length;
    return `<section class="card card--destaque pilha-sm">
      <span class="rotulo">Missão em andamento</span>
      <h2>Continue de onde parou</h2>
      <p class="pequeno">${feitas} de ${r.sessaoEmAndamento.fontes.length} questões respondidas.</p>
      <button class="botao" data-acao="missao">Continuar missão</button>
    </section>`;
  }
  const titulo = r.sessoesHoje > 0 ? 'Quer praticar mais?' : 'Missão do dia';
  const texto = r.sessoesHoje > 0
    ? 'Você já concluiu a missão de hoje. Uma nova prática também vale XP.'
    : '5 questões rápidas. Leva cerca de 10 minutos.';
  return `<section class="card card--destaque pilha-sm">
    <span class="rotulo">${titulo}</span>
    <h2>${esc(r.bloco.titulo)}</h2>
    <p class="pequeno">${texto}</p>
    <button class="botao" data-acao="missao">${r.sessoesHoje > 0 ? 'Nova prática' : 'Começar missão'}</button>
    <a class="botao botao--fantasma" href="#/licao/${r.bloco.id}">Revisar a lição do bloco</a>
  </section>`;
}

function cardDesafio(r) {
  if (r.sessaoEmAndamento) {
    return `<section class="card pilha-sm"><span class="rotulo">Desafio diário</span>
      <p class="pequeno suave">Termine a missão em andamento para liberar o desafio.</p></section>`;
  }
  if (r.desafioEmAndamento) {
    return `<section class="card pilha-sm"><span class="rotulo">Desafio diário</span>
      <p class="pequeno">Você tem um desafio aberto.</p>
      <button class="botao botao--secundario" data-acao="desafio">Continuar desafio</button></section>`;
  }
  if (!r.desafioDisponivel) {
    return `<section class="card pilha-sm"><span class="rotulo">Desafio diário</span>
      <p class="pequeno suave">Desafio de hoje já feito. Amanhã tem outro.</p></section>`;
  }
  return `<section class="card pilha-sm"><span class="rotulo">Desafio diário</span>
    <p class="pequeno">Uma questão difícil, estilo SAEB e OBMEP. Acertou, ganha +15 XP extra.</p>
    <button class="botao botao--secundario" data-acao="desafio">Aceitar desafio</button></section>`;
}

function cardExportacao(r) {
  if (!r.lembrarExportacao) return '';
  const texto = r.nuncaExportou
    ? 'Você ainda não enviou seu progresso ao professor.'
    : `Faz ${r.diasSemExportar} dias que você não envia seu progresso.`;
  return `<section class="card card--alerta pilha-sm" role="status">
    <strong>Hora de exportar</strong>
    <p class="pequeno">${texto} Exporte e entregue o arquivo ao professor.</p>
    <a class="botao botao--compacto" href="#/perfil/exportar">Exportar agora</a>
  </section>`;
}

export async function render(container, params, { navegar }) {
  const r = await resumoHome();
  document.getElementById('topo-extra').textContent = `Nível ${r.nivel.nivel}`;
  const dominio = r.dominioBloco === null ? 'Ainda sem respostas' : `${r.dominioBloco}% de acerto`;
  container.innerHTML = `
    <div class="pilha">
      <div class="pilha-sm">
        <h1>Olá, ${esc(r.nome)}</h1>
        <p class="suave pequeno">${textoStreak(r)}</p>
      </div>
      <div class="indicadores" aria-label="Seus números">
        <div class="indicador indicador--streak"><strong>${r.progresso.streak_atual}</strong>
          <span class="pequeno">dias seguidos</span></div>
        <div class="indicador indicador--xp"><strong>${formatarNumero(r.progresso.xp_total)}</strong>
          <span class="pequeno">XP</span></div>
        <div class="indicador indicador--moeda"><strong>${formatarNumero(r.progresso.moedas)}</strong>
          <span class="pequeno">moedas</span></div>
      </div>
      <section class="card pilha-sm">
        <div class="linha linha--entre"><strong>Nível ${r.nivel.nivel}</strong>
          <span class="pequeno suave">${r.nivel.faltam ? `faltam ${r.nivel.faltam} XP` : 'nível máximo'}</span></div>
        <div class="barra-progresso" role="progressbar" aria-valuemin="0" aria-valuemax="100"
          aria-valuenow="${r.nivel.percentual}"><span style="width:${r.nivel.percentual}%"></span></div>
        <p class="pequeno suave">${r.freezeDisponivel
    ? 'Proteção da semana disponível: se faltar 1 dia, sua sequência fica protegida.'
    : 'Proteção da semana já usada. Não falte até domingo.'}</p>
      </section>
      ${cardExportacao(r)}
      ${cardMissao(r)}
      ${cardDesafio(r)}
      <section class="card pilha-sm">
        <span class="rotulo">Bloco ${r.bloco.ordem} de 10</span>
        <p><strong>${esc(r.bloco.titulo)}</strong></p>
        <p class="pequeno suave">${dominio}</p>
      </section>
    </div>`;

  container.querySelectorAll('[data-acao]').forEach((botao) => {
    botao.addEventListener('click', async () => {
      botao.disabled = true;
      const sessao = botao.dataset.acao === 'missao' ? await iniciarMissao() : await iniciarDesafio();
      if (!sessao) {
        toast('Não há questões disponíveis agora.');
        botao.disabled = false;
        return;
      }
      navegar('pratica');
    });
  });
}
