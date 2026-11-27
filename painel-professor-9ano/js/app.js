// Boot do painel: abre o banco, grava a configuração padrão e inicia a navegação.

import { garantirConfigPadrao, lerConfig } from './db/schema.js';
import { iniciarRouter } from './router.js';

async function iniciar() {
  try {
    await garantirConfigPadrao();
    const config = await lerConfig();
    document.getElementById('topo-turma').textContent = `${config.turma_nome} · ${config.turma_codigo}`;
    iniciarRouter();
  } catch (erro) {
    console.error(erro);
    document.getElementById('conteudo').innerHTML =
      '<p role="alert">Não foi possível abrir o banco de dados local. Verifique se o navegador permite armazenamento.</p>';
  }
}

iniciar();
