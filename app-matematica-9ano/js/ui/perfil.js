// Perfil: badges, estatisticas e exportacao (download, compartilhar ou copiar JSON).

import { resumoPerfil } from '../motor/resumos.js';
import * as snap from '../export/snapshot.js';
import { esc, abrirModal, toast, formatarNumero } from './comum.js';
import { formatarDiaBr } from '../util/datas.js';

function badgesHtml(badges) {
  return `<div class="badges">${badges.map((b) => `
    <div class="badge ${b.conquistada ? 'badge--conquistada' : ''}">
      <strong>${esc(b.titulo)}</strong>${esc(b.descricao)}
      ${b.conquistada ? `<br><span class="suave">${formatarDiaBr(b.conquistada_em)}</span>` : ''}
    </div>`).join('')}</div>`;
}

async function abrirExportacao(aoConcluir) {
  const snapshot = await snap.gerarSnapshot();
  const nome = snap.nomeArquivo(snapshot);
  const compartilhavel = snap.podeCompartilhar(snapshot);
  let registrado = false;
  const registrar = async (meio) => {
    if (registrado) return;
    registrado = true;
    await snap.confirmarExportacao(snapshot, meio);
  };

  const { el, fechar } = abrirModal(`
    <h2>Exportar progresso</h2>
    <p class="pequeno">Arquivo: <strong>${esc(nome)}</strong></p>
    <p class="pequeno suave">Entregue este arquivo ao professor (por exemplo, pelo WhatsApp da turma
      ou pelo cabo USB na sexta-feira).</p>
    ${compartilhavel ? '<button class="botao" data-acao="compartilhar">Enviar arquivo</button>' : ''}
    <button class="botao ${compartilhavel ? 'botao--secundario' : ''}" data-acao="baixar">Baixar arquivo</button>
    <button class="botao botao--fantasma" data-acao="mostrar">Não baixou? Mostrar o texto do arquivo</button>
    <div class="campo oculto" id="area-json">
      <label for="json-exportado">Copie o texto abaixo e envie ao professor</label>
      <textarea id="json-exportado" readonly>${esc(snap.serializar(snapshot))}</textarea>
      <button class="botao" data-acao="copiar">Copiar JSON</button>
    </div>
    <button class="botao botao--fantasma" data-acao="fechar">Fechar</button>`, { aoFechar: aoConcluir });

  el.addEventListener('click', async (e) => {
    const acao = e.target.closest('[data-acao]')?.dataset.acao;
    if (!acao) return;
    if (acao === 'fechar') fechar();
    if (acao === 'baixar') {
      if (snap.baixar(snapshot)) {
        await registrar('download');
        toast('Download iniciado. Confira a pasta Downloads.');
      } else {
        el.querySelector('#area-json').classList.remove('oculto');
        toast('Não foi possível baixar. Use o botão Copiar JSON.');
      }
    }
    if (acao === 'compartilhar') {
      try {
        await snap.compartilhar(snapshot);
        await registrar('compartilhar');
        toast('Arquivo enviado.');
      } catch (erro) {
        if (erro && erro.name !== 'AbortError') el.querySelector('#area-json').classList.remove('oculto');
      }
    }
    if (acao === 'mostrar') el.querySelector('#area-json').classList.remove('oculto');
    if (acao === 'copiar') {
      const area = el.querySelector('#json-exportado');
      const ok = await snap.copiarTexto(area.value, area);
      if (ok) await registrar('copiar');
      toast(ok ? 'Texto copiado. Cole na conversa com o professor.' : 'Selecione o texto e copie manualmente.');
    }
  });
}

export async function render(container, params, ctx) {
  const r = await resumoPerfil();
  const ultima = r.exportacao.ultima_exportacao;
  container.innerHTML = `
    <div class="pilha">
      <section class="card pilha-sm">
        <h1>${esc(r.perfil.nome)}</h1>
        <p class="pequeno suave">RA ${esc(r.perfil.ra)} · Turma ${esc(r.perfil.turma_codigo)}</p>
        <p class="pequeno">Nível <strong>${r.nivel.nivel}</strong> · ${formatarNumero(r.progresso.xp_total)} XP ·
          ${formatarNumero(r.progresso.moedas)} moedas</p>
      </section>

      <section class="card pilha-sm">
        <h2>Enviar progresso ao professor</h2>
        <p class="pequeno suave">${ultima
    ? `Última exportação: ${formatarDiaBr(ultima)} (${r.exportacao.total_exportacoes} no total).`
    : 'Você ainda não exportou nenhuma vez.'}</p>
        <button class="botao" id="exportar">Exportar progresso</button>
      </section>

      <section class="card pilha-sm">
        <h2>Estatísticas</h2>
        <div class="indicadores">
          <div class="indicador"><strong>${r.estatisticas.questoes}</strong><span class="pequeno">questões</span></div>
          <div class="indicador"><strong>${r.estatisticas.percentual === null ? '-' : `${r.estatisticas.percentual}%`}</strong>
            <span class="pequeno">de acerto</span></div>
          <div class="indicador"><strong>${r.estatisticas.missoes}</strong><span class="pequeno">missões</span></div>
        </div>
        <p class="pequeno suave">Maior sequência: ${r.progresso.streak_recorde} dias ·
          Desafios feitos: ${r.estatisticas.desafios}</p>
      </section>

      <section class="pilha-sm">
        <h2>Conquistas (${r.badges.filter((b) => b.conquistada).length} de ${r.badges.length})</h2>
        ${badgesHtml(r.badges)}
      </section>
    </div>`;

  const recarregar = () => render(container, [], ctx);
  container.querySelector('#exportar').addEventListener('click', () => abrirExportacao(recarregar));
  if (params[0] === 'exportar') {
    history.replaceState(null, '', '#/perfil');
    abrirExportacao(recarregar);
  }
}
