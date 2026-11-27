// Aba Exportar: escolhe período e situação e baixa o relatório em CSV ou PDF. Só desenha; os dados vêm de js/reports/.

import { lerBase } from '../db/teacher-repo.js';
import { lerConfig } from '../db/schema.js';
import { calcularTurma } from '../analytics/metrics.js';
import { filtrarPorSituacao, montarLinhas, tituloRelatorio, nomeArquivo } from '../reports/dados-relatorio.js';
import { gerarCsv, baixarCsv } from '../reports/csv-exporter.js';
import { gerarPdf } from '../reports/pdf-exporter.js';
import { formatarDataHoraBr, formatarDiaBr, hoje, isoLocal } from '../util/datas.js';

export async function renderizar(el) {
  const [base, config] = await Promise.all([lerBase(), lerConfig()]);
  if (!base.length) {
    el.innerHTML = '<h1>Exportar</h1><section class="cartao"><p>Ainda não há alunos. Importe os arquivos na aba <a href="#/importar">Importar</a>.</p></section>';
    return;
  }
  el.innerHTML = `<h1>Exportar</h1><section class="cartao"><h2>Relatório da turma</h2>
    <form class="filtros" id="filtros">
      <label>Período<select name="tipo"><option value="inicio">Desde o início</option><option value="30d">Últimos 30 dias</option><option value="personalizado">Personalizado</option></select></label>
      <label class="so-personalizado">De<input type="date" name="de"></label>
      <label class="so-personalizado">Até<input type="date" name="ate"></label>
      <label>Situação<select name="situacao"><option value="todos">Todos os alunos</option><option value="risco">Atenção e em risco</option><option value="atencao">Só atenção</option><option value="ok">Só em dia</option></select></label>
    </form>
    <p class="suave" id="previa" aria-live="polite"></p>
    <p><button type="button" class="botao" id="csv">Baixar CSV</button> <button type="button" class="botao" id="pdf">Baixar PDF</button></p>
    <p class="suave" id="aviso" role="status"></p></section>`;
  const form = el.querySelector('#filtros');
  const aviso = el.querySelector('#aviso');

  function dados() {
    const filtro = { tipo: form.tipo.value, de: form.de.value, ate: form.ate.value };
    const turma = calcularTurma(base, filtro, hoje(), config);
    const alunos = filtrarPorSituacao(turma.alunos, form.situacao.value);
    return { turma, linhas: montarLinhas(alunos, base) };
  }
  function atualizar() {
    const { turma, linhas } = dados();
    el.classList.toggle('periodo-personalizado', form.tipo.value === 'personalizado');
    el.querySelector('#previa').textContent =
      `Período: ${formatarDiaBr(turma.periodo.inicio)} a ${formatarDiaBr(turma.periodo.fim)}. O relatório terá ${linhas.length} aluno(s).`;
    aviso.textContent = '';
  }
  el.querySelector('#csv').addEventListener('click', () => {
    const { linhas } = dados();
    baixarCsv(gerarCsv(linhas), nomeArquivo(config, hoje(), 'csv'));
    aviso.textContent = 'CSV gerado.';
  });
  el.querySelector('#pdf').addEventListener('click', async () => {
    const { turma, linhas } = dados();
    aviso.textContent = 'Gerando o PDF...';
    try {
      await gerarPdf({ titulo: tituloRelatorio(config, turma.periodo), geradoEm: formatarDataHoraBr(isoLocal()), linhas, nome: nomeArquivo(config, hoje(), 'pdf') });
      aviso.textContent = 'PDF gerado.';
    } catch (erro) {
      console.error(erro);
      aviso.textContent = 'Não foi possível gerar o PDF. Use o CSV ou veja o console do navegador.';
    }
  });
  form.addEventListener('input', atualizar);
  form.addEventListener('submit', (e) => e.preventDefault());
  atualizar();
}
