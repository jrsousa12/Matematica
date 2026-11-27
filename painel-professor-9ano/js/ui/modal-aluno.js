// Modal com o detalhe de um aluno. Só desenha; os dados vêm de js/analytics/detalhe-aluno.js.

import { montarDetalhe } from '../analytics/detalhe-aluno.js';
import { corDominio } from '../analytics/risk-detector.js';
import { formatarDataHoraBr, formatarDiaBr } from '../util/datas.js';
import { esc, pilula, numeroBr } from './comum.js';

const NIVEIS = { ok: ['Em dia', 'verde'], atencao: ['Atenção', 'amarelo'], risco: ['Em risco', 'vermelho'] };
const FAIXAS = { alta: ['Alta adesão', 'verde'], media: ['Média adesão', 'amarelo'], baixa: ['Baixa adesão', 'vermelho'] };

const fato = (rotulo, valor) => `<div class="fato"><dt>${rotulo}</dt><dd>${valor}</dd></div>`;

function htmlBlocos(blocos) {
  return `<ul class="lista-blocos">${blocos.map((b) => {
    const cor = corDominio(b.percentual);
    const largura = b.percentual ?? 0;
    return `<li><span class="lista-blocos__nome">${b.id}. ${esc(b.titulo)}</span>
      <span class="barra" role="img" aria-label="${b.percentual === null ? 'sem dados' : `${b.percentual}%`}"><i class="barra__preenchida mapa__bloco--${cor}" style="width:${largura}%"></i></span>
      <span class="lista-blocos__valor">${b.percentual === null ? '-' : `${b.percentual}% (${b.acertos}/${b.total})`}</span></li>`;
  }).join('')}</ul>`;
}

function htmlSessoes(recentes) {
  if (!recentes.length) return '<p class="suave">Nenhuma sessão registrada.</p>';
  return `<div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Data</th><th>Tipo</th><th class="num">Bloco</th><th class="num">Acertos</th><th class="num">XP</th></tr></thead>
    <tbody>${recentes.map((s) => `<tr><td>${formatarDataHoraBr(s.data)}</td><td>${esc(s.tipo)}</td><td class="num">${s.bloco}</td>
      <td class="num">${s.acertos}/${s.total}</td><td class="num">${s.xp}</td></tr>`).join('')}</tbody></table></div>`;
}

function htmlDetalhe(d) {
  const [rotuloRisco, corRisco] = NIVEIS[d.risco.nivel];
  const [rotuloFaixa, corFaixa] = FAIXAS[d.faixa];
  const p = d.progresso;
  return `<header class="modal__topo"><div><h2 id="modal-titulo">${esc(d.nome)}</h2><span class="suave">Código ${esc(d.ra)} - Turma ${esc(d.turma)}</span></div>
    <button type="button" class="botao" data-fechar>Fechar</button></header>
    <p>${pilula(rotuloRisco, corRisco)} ${pilula(rotuloFaixa, corFaixa)}</p>
    ${d.risco.motivos.length ? `<ul class="motivos-lista">${d.risco.motivos.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
    <dl class="fatos">
      ${fato('Nível', p.nivel ?? '-')}${fato('XP total', numeroBr(p.xp_total ?? 0))}${fato('Moedas', numeroBr(p.moedas ?? 0))}
      ${fato('Streak atual', p.streak_atual ?? 0)}${fato('Recorde de streak', p.streak_recorde ?? 0)}${fato('Bloco atual', p.bloco_atual ?? 1)}
      ${fato('Sessões', d.totalSessoes)}${fato('Sessões por semana', numeroBr(d.sessoesPorSemana, 1))}${fato('Acerto no período', d.acerto === null ? '-' : `${d.acerto}%`)}
      ${fato('Respostas', d.totalRespostas)}${fato('Tempo médio por questão', d.tempoMedio === null ? '-' : `${d.tempoMedio} s`)}
      ${fato('Última exportação', `${formatarDiaBr(d.ultimaExportacao)} (${d.diasSemExportar} dias)`)}
      ${fato('Exportações feitas', d.exportacoes ?? '-')}
    </dl>
    <h3>Domínio por bloco</h3>${htmlBlocos(d.blocos)}
    <h3>Últimas sessões</h3>${htmlSessoes(d.recentes)}
    <h3>Badges (${d.badges.filter((b) => b.conquistada).length} de ${d.badges.length})</h3>
    <p class="badges">${d.badges.map((b) => pilula(b.nome, b.conquistada ? 'verde' : 'cinza')).join(' ')}</p>`;
}

export function abrirModalAluno(item, calc) {
  let dialogo = document.getElementById('modal-aluno');
  if (!dialogo) {
    dialogo = document.createElement('dialog');
    dialogo.id = 'modal-aluno';
    dialogo.className = 'modal';
    dialogo.setAttribute('aria-labelledby', 'modal-titulo');
    dialogo.addEventListener('click', (e) => { if (e.target === dialogo || e.target.closest('[data-fechar]')) dialogo.close(); });
    document.body.append(dialogo);
  }
  dialogo.innerHTML = htmlDetalhe(montarDetalhe(item, calc));
  dialogo.showModal();
}
