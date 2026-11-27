// Aba Configurações: código da turma, metas e limites de risco, backup, restauração e reset.
// Só desenha e valida os campos; o banco fica em js/db/.

import { db, lerConfig } from '../db/schema.js';
import { gerarBackup, validarBackup, restaurarBackup, resetarDados, baixarBackup, nomeBackup } from '../db/backup.js';
import { hoje } from '../util/datas.js';
import { esc } from './comum.js';

const NUMEROS = [
  ['meta_sessoes_semana', 'Meta de sessões por semana', 1, 14],
  ['meta_streak', 'Meta de streak (dias seguidos)', 1, 60],
  ['risco_acerto_minimo', 'Acerto mínimo antes de risco (%)', 1, 100],
  ['risco_dias_sem_exportar', 'Dias sem exportar antes de risco', 1, 60]
];

// Confere o formulário e devolve { valores } ou { erro }.
export function lerFormulario(form) {
  const turma_codigo = form.turma_codigo.value.trim();
  const turma_nome = form.turma_nome.value.trim();
  if (!turma_codigo) return { erro: 'Informe o código da turma.' };
  if (!turma_nome) return { erro: 'Informe o nome da turma.' };
  const valores = { turma_codigo, turma_nome };
  for (const [chave, rotulo, min, max] of NUMEROS) {
    const n = Number(form[chave].value);
    if (!Number.isInteger(n) || n < min || n > max) return { erro: `${rotulo}: use um número inteiro de ${min} a ${max}.` };
    valores[chave] = n;
  }
  return { valores };
}

const campo = (nome, rotulo, valor, extra = '') =>
  `<label>${rotulo}<input name="${nome}" value="${esc(valor)}" ${extra}></label>`;

export async function renderizar(el) {
  const config = await lerConfig();
  const numeros = NUMEROS.map(([k, r, min, max]) => campo(k, r, config[k], `type="number" min="${min}" max="${max}" step="1"`)).join('');
  el.innerHTML = `<h1>Configurações</h1>
    <section class="cartao"><h2>Turma e metas</h2>
      <form class="filtros" id="form-config" novalidate>
        ${campo('turma_codigo', 'Código da turma', config.turma_codigo)}
        ${campo('turma_nome', 'Nome da turma', config.turma_nome)}
        ${numeros}
        <button type="submit" class="botao">Salvar</button>
      </form>
      <p class="suave">Arquivos de alunos com código de turma diferente deste são recusados na importação.</p>
      <p class="suave" id="aviso-config" role="status"></p></section>
    <section class="cartao"><h2>Backup</h2>
      <p>O backup guarda tudo o que está no painel (alunos, histórico, configurações) em um arquivo. Guarde-o fora deste navegador.</p>
      <p><button type="button" class="botao" id="baixar-backup">Baixar backup</button>
      <label class="botao">Restaurar backup<input type="file" id="arquivo-backup" accept=".json,application/json" hidden></label></p>
      <p class="suave" id="aviso-backup" role="status"></p></section>
    <section class="cartao"><h2>Apagar dados dos alunos</h2>
      <p>Remove todos os alunos importados e o histórico de importação. As configurações acima ficam. Faça um backup antes.</p>
      <p><button type="button" class="botao botao--perigo" id="resetar">Apagar dados dos alunos</button></p>
      <p class="suave" id="aviso-reset" role="status"></p></section>`;

  const avisoConfig = el.querySelector('#aviso-config');
  const avisoBackup = el.querySelector('#aviso-backup');
  const avisoReset = el.querySelector('#aviso-reset');

  el.querySelector('#form-config').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { valores, erro } = lerFormulario(e.target);
    if (erro) { avisoConfig.textContent = erro; return; }
    await db.config.bulkPut(Object.entries(valores).map(([key, value]) => ({ key, value })));
    document.getElementById('topo-turma').textContent = `${valores.turma_nome} · ${valores.turma_codigo}`;
    avisoConfig.textContent = 'Configurações salvas.';
  });

  el.querySelector('#baixar-backup').addEventListener('click', async () => {
    const atual = await lerConfig();
    baixarBackup(await gerarBackup(), nomeBackup(atual.turma_codigo, hoje()));
    avisoBackup.textContent = 'Backup gerado. Guarde o arquivo em local seguro.';
  });

  el.querySelector('#arquivo-backup').addEventListener('change', async (e) => {
    const arquivo = e.target.files[0];
    e.target.value = '';
    if (!arquivo) return;
    try {
      const backup = JSON.parse(await arquivo.text());
      const erros = validarBackup(backup);
      if (erros.length) { avisoBackup.textContent = erros[0]; return; }
      if (!confirm('Restaurar este backup vai SUBSTITUIR tudo o que está no painel agora. Continuar?')) return;
      await restaurarBackup(backup);
      location.reload();
    } catch (erro) {
      console.error(erro);
      avisoBackup.textContent = 'Não foi possível ler este arquivo como backup.';
    }
  });

  el.querySelector('#resetar').addEventListener('click', async () => {
    if (!confirm('Apagar TODOS os alunos e o histórico de importação? Isso não pode ser desfeito.')) return;
    await resetarDados();
    avisoReset.textContent = 'Dados dos alunos apagados.';
  });
}
