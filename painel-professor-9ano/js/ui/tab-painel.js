// Aba Painel: 4 cards de resumo, busca, filtros e tabela de alunos com mini-mapa de blocos.
// Só desenha; os cálculos estão em js/analytics/.

import { lerBase } from '../db/teacher-repo.js';
import { lerConfig } from '../db/schema.js';
import { calcularTurma, TOTAL_BLOCOS } from '../analytics/metrics.js';
import { corDominio } from '../analytics/risk-detector.js';
import { formatarDiaBr, hoje } from '../util/datas.js';
import { esc, pilula, numeroBr } from './comum.js';
import { abrirModalAluno } from './modal-aluno.js';

const NIVEIS = { ok: ['Em dia', 'verde'], atencao: ['Atenção', 'amarelo'], risco: ['Em risco', 'vermelho'] };
const ORDENS = {
  risco: (a, b) => b.risco.motivos.length - a.risco.motivos.length || a.nome.localeCompare(b.nome, 'pt-BR'),
  nome: (a, b) => a.nome.localeCompare(b.nome, 'pt-BR'),
  uso: (a, b) => b.sessoesPorSemana - a.sessoesPorSemana,
  acerto: (a, b) => (a.acerto ?? 101) - (b.acerto ?? 101)
};

function cartao(titulo, valor, detalhe, cor = '') {
  return `<div class="cartao resumo ${cor ? `resumo--${cor}` : ''}"><span class="resumo__titulo">${titulo}</span>
    <strong class="resumo__valor">${valor}</strong><span class="suave resumo__detalhe">${detalhe}</span></div>`;
}

function htmlCards(r, config) {
  const uso = r.sessoesPorSemana === null ? '-' : numeroBr(r.sessoesPorSemana, 1);
  const corUso = r.sessoesPorSemana === null ? 'cinza' : r.sessoesPorSemana >= config.meta_sessoes_semana ? 'verde' : 'amarelo';
  return `<div class="grade-resumo">
    ${cartao('Alunos ativos', `${r.ativos} de ${r.total}`, 'com missão nos últimos 7 dias', r.ativos ? 'verde' : 'cinza')}
    ${cartao('Sessões por semana', uso, `por aluno ativo (meta ${config.meta_sessoes_semana})`, corUso)}
    ${cartao('Acerto médio', r.acertoMedio === null ? '-' : `${r.acertoMedio}%`, 'respostas do período', r.acertoMedio === null ? 'cinza' : r.acertoMedio >= 60 ? 'verde' : 'amarelo')}
    ${cartao('Alunos em risco', r.emRisco, 'pelo menos 1 sinal de alerta', r.emRisco ? 'vermelho' : 'verde')}
  </div>`;
}

function miniMapa(dominio) {
  const quadros = Array.from({ length: TOTAL_BLOCOS }, (_, i) => {
    const p = dominio[i + 1] ?? null;
    return `<i class="mapa__bloco mapa__bloco--${corDominio(p)}" title="Bloco ${i + 1}: ${p === null ? 'sem dados' : `${p}%`}"></i>`;
  }).join('');
  return `<span class="mapa" role="img" aria-label="Domínio por bloco, do 1 ao ${TOTAL_BLOCOS}">${quadros}</span>`;
}

function linha(a) {
  const [rotulo, cor] = NIVEIS[a.risco.nivel];
  return `<tr><td><button type="button" class="link-aluno" data-ra="${esc(a.ra)}">${esc(a.nome)}</button><br><span class="suave">RA ${esc(a.ra)}</span></td>
    <td>${pilula(rotulo, cor)}<div class="suave motivos">${esc(a.risco.motivos.join('; '))}</div></td>
    <td class="num">${numeroBr(a.sessoesPorSemana, 1)}</td>
    <td class="num">${a.acerto === null ? '-' : `${a.acerto}%`}</td>
    <td class="num">${a.streak}</td>
    <td>${formatarDiaBr(a.ultimaExportacao)}</td>
    <td>${miniMapa(a.dominio)}<div class="suave motivos">Bloco atual: ${a.blocoAtual}</div></td></tr>`;
}

function htmlTabela(alunos) {
  if (!alunos.length) return '<p class="suave">Nenhum aluno corresponde aos filtros.</p>';
  return `<div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Aluno</th><th>Situação</th>
    <th class="num">Sessões/sem.</th><th class="num">Acerto</th><th class="num">Streak</th><th>Última exportação</th><th>Blocos</th></tr></thead>
    <tbody>${alunos.map(linha).join('')}</tbody></table></div>`;
}

const filtros = { tipo: 'inicio', de: '', ate: '', busca: '', situacao: 'todos', ordem: 'risco' };

export async function renderizar(el) {
  const [base, config] = await Promise.all([lerBase(), lerConfig()]);
  if (!base.length) {
    el.innerHTML = '<h1>Painel</h1><section class="cartao"><p>Ainda não há alunos. Importe os arquivos exportados na aba <a href="#/importar">Importar</a>.</p></section>';
    return;
  }
  el.innerHTML = `<h1>Painel</h1><div id="cards"></div>
    <form class="filtros" id="filtros" aria-label="Filtros da tabela">
      <label>Buscar<input type="search" name="busca" placeholder="Nome ou RA" value="${esc(filtros.busca)}"></label>
      <label>Situação<select name="situacao"><option value="todos">Todos</option><option value="risco">Com sinal de alerta</option><option value="ok">Em dia</option></select></label>
      <label>Período<select name="tipo"><option value="inicio">Desde o início</option><option value="30d">Últimos 30 dias</option><option value="personalizado">Personalizado</option></select></label>
      <label class="so-personalizado">De<input type="date" name="de" value="${filtros.de}"></label>
      <label class="so-personalizado">Até<input type="date" name="ate" value="${filtros.ate}"></label>
      <label>Ordenar por<select name="ordem"><option value="risco">Risco</option><option value="nome">Nome</option><option value="uso">Uso</option><option value="acerto">Acerto</option></select></label>
    </form>
    <p class="suave" id="periodo" aria-live="polite"></p><div id="tabela"></div>`;
  const form = el.querySelector('#filtros');
  for (const [nome, valor] of Object.entries(filtros)) if (form.elements[nome]) form.elements[nome].value = valor;

  function desenhar() {
    for (const nome of Object.keys(filtros)) filtros[nome] = form.elements[nome].value;
    const turma = calcularTurma(base, filtros, hoje(), config);
    ultimaTurma = turma;
    const termo = filtros.busca.trim().toLowerCase();
    const lista = turma.alunos
      .filter((a) => !termo || a.nome.toLowerCase().includes(termo) || a.ra.includes(termo))
      .filter((a) => filtros.situacao === 'todos' || (filtros.situacao === 'ok') === (a.risco.nivel === 'ok'))
      .sort(ORDENS[filtros.ordem]);
    el.querySelector('#cards').innerHTML = htmlCards(turma.resumo, config);
    el.querySelector('#periodo').textContent =
      `Período: ${formatarDiaBr(turma.periodo.inicio)} a ${formatarDiaBr(turma.periodo.fim)}. Mostrando ${lista.length} de ${turma.alunos.length} alunos.`;
    el.querySelector('#tabela').innerHTML = htmlTabela(lista);
    el.classList.toggle('periodo-personalizado', filtros.tipo === 'personalizado');
  }
  let ultimaTurma = null;
  el.querySelector('#tabela').addEventListener('click', (e) => {
    const botao = e.target.closest('[data-ra]');
    if (!botao || !ultimaTurma) return;
    const calc = ultimaTurma.alunos.find((a) => a.ra === botao.dataset.ra);
    abrirModalAluno(base.find((i) => i.aluno.ra === botao.dataset.ra), calc);
  });
  form.addEventListener('input', desenhar);
  form.addEventListener('submit', (e) => e.preventDefault());
  desenhar();
}
