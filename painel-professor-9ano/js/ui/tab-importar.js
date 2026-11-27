// Aba Importar: arrastar e soltar arquivos dos alunos, relatório do lote e desfazer.
// Só desenha a tela; a importação em si está em js/import/.

import { processarLote, listarLotes } from '../import/batch-processor.js';
import { desfazerUltimoLote, loteDesfazivel } from '../import/undo-manager.js';
import { lerConfig } from '../db/schema.js';
import { formatarDataHoraBr } from '../util/datas.js';
import { esc, pilula } from './comum.js';

const STATUS = {
  importado: ['Importado', 'verde'],
  atualizado: ['Atualizado', 'verde'],
  ignorado: ['Ignorado', 'cinza'],
  erro: ['Erro', 'vermelho']
};

function linhaItem(i) {
  const [rotulo, cor] = STATUS[i.status];
  const avisos = i.avisos.map((a) => `<div>${pilula('Aviso', 'amarelo')} ${esc(a)}</div>`).join('');
  const aluno = i.aluno ? `${esc(i.aluno)} <span class="suave">(código ${esc(i.ra)})</span>` : '<span class="suave">-</span>';
  return `<tr><td>${esc(i.arquivo)}</td><td>${aluno}</td><td>${pilula(rotulo, cor)}</td>
    <td>${esc(i.mensagem)}${avisos}</td></tr>`;
}

function resumoLote(l) {
  return `${l.importados} novo(s), ${l.atualizados} atualizado(s), ${l.ignorados} ignorado(s), ${l.erros} com erro`;
}

function htmlRelatorio(l) {
  return `<section class="cartao" aria-live="polite"><h2>Relatório do lote</h2>
    <p>${l.total} arquivo(s) lido(s): ${resumoLote(l)}.</p>
    <div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Arquivo</th><th>Aluno</th><th>Situação</th><th>Detalhes</th></tr></thead>
    <tbody>${l.itens.map(linhaItem).join('')}</tbody></table></div></section>`;
}

function htmlHistorico(lotes) {
  if (!lotes.length) return '<p class="suave">Nenhum lote importado ainda.</p>';
  const linhas = lotes.map((l) => `<tr><td>${formatarDataHoraBr(l.importado_em)}</td><td>${l.total}</td>
    <td>${resumoLote(l)}</td><td>${l.desfeito ? pilula('Desfeito', 'cinza') : ''}</td></tr>`).join('');
  return `<div class="tabela-rolagem"><table class="tabela"><thead><tr><th>Data</th><th>Arquivos</th><th>Resultado</th><th></th></tr></thead>
    <tbody>${linhas}</tbody></table></div>`;
}

async function lerArquivos(lista) {
  return Promise.all([...lista].map(async (f) => ({ nome: f.name, texto: await f.text() })));
}

export async function renderizar(el) {
  el.innerHTML = `<h1>Importar</h1>
    <p class="suave">Solte aqui os arquivos .json exportados pelos alunos. Arquivos com defeito não impedem os demais.</p>
    <label class="dropzone" id="dropzone" tabindex="0">
      <input type="file" id="arquivos" accept=".json,application/json" multiple hidden>
      <strong>Arraste os arquivos ou toque para escolher</strong>
      <span class="suave">Formato: turma_RA_data.json</span>
    </label>
    <div id="aviso-desfazer"></div><div id="relatorio"></div>
    <h2>Lotes anteriores</h2><div id="historico"></div>`;

  const $ = (id) => el.querySelector(`#${id}`);

  async function atualizarRodape() {
    $('historico').innerHTML = htmlHistorico(await listarLotes());
    const pode = await loteDesfazivel();
    $('aviso-desfazer').innerHTML = pode
      ? `<p class="barra-acao">Último lote: ${esc(resumoLote(pode))}. <button type="button" class="botao botao--perigo" id="desfazer">Desfazer este lote</button></p>`
      : '';
    const botao = $('desfazer');
    if (botao) botao.onclick = async () => {
      if (!confirm('Desfazer o último lote? Os alunos voltarão ao estado anterior à importação.')) return;
      const r = await desfazerUltimoLote();
      $('relatorio').innerHTML = `<p role="status" class="cartao">${esc(r.mensagem)}</p>`;
      await atualizarRodape();
    };
  }

  async function importar(arquivos) {
    if (!arquivos.length) return;
    $('relatorio').innerHTML = '<p class="carregando">Importando...</p>';
    const relatorio = await processarLote(await lerArquivos(arquivos), await lerConfig());
    $('relatorio').innerHTML = htmlRelatorio(relatorio);
    await atualizarRodape();
  }

  const zona = $('dropzone');
  $('arquivos').onchange = (e) => { importar(e.target.files); e.target.value = ''; };
  zona.ondragover = (e) => { e.preventDefault(); zona.classList.add('dropzone--ativa'); };
  zona.ondragleave = () => zona.classList.remove('dropzone--ativa');
  zona.ondrop = (e) => { e.preventDefault(); zona.classList.remove('dropzone--ativa'); importar(e.dataTransfer.files); };
  zona.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('arquivos').click(); } };
  await atualizarRodape();
}
