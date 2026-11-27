// Carga inicial e atualizacao de conteudo SEM apagar progresso.
// O conteudo e recarregado apenas quando content_version muda.

import { db } from './schema.js';

const BASE = 'js/data/';

async function lerJson(arquivo) {
  const resp = await fetch(BASE + arquivo, { cache: 'no-cache' });
  if (!resp.ok) throw new Error(`Falha ao carregar ${arquivo}`);
  return resp.json();
}

async function metaValor(key) {
  const reg = await db.meta.get(key);
  return reg ? reg.value : null;
}

export async function obterMeta() {
  const regs = await db.meta.toArray();
  const meta = {};
  regs.forEach((r) => { meta[r.key] = r.value; });
  return meta;
}

export async function carregarConteudo(appVersion) {
  let indice;
  try {
    indice = await lerJson('blocos.json');
  } catch (erro) {
    // Sem rede e sem cache: segue com o que ja estiver no banco.
    const total = await db.questoes.count();
    if (total > 0) return { atualizado: false };
    throw erro;
  }

  const versaoAtual = await metaValor('content_version');
  const vazio = (await db.questoes.count()) === 0;
  if (!vazio && versaoAtual === indice.content_version) {
    await db.meta.put({ key: 'app_version', value: appVersion });
    return { atualizado: false };
  }

  const licoes = [];
  const questoes = [];
  for (const lote of indice.lotes) {
    const [l, q] = await Promise.all([
      lerJson(`licoes-${lote}.json`),
      lerJson(`questoes-${lote}.json`)
    ]);
    licoes.push(...l);
    questoes.push(...q);
  }

  await db.transaction('rw', db.meta, db.blocos, db.licoes, db.questoes, async () => {
    await db.blocos.bulkPut(indice.blocos);
    await db.licoes.bulkPut(licoes);
    await db.questoes.bulkPut(questoes);
    await db.meta.bulkPut([
      { key: 'app_version', value: appVersion },
      { key: 'content_version', value: indice.content_version },
      { key: 'turma_codigo', value: indice.turma.codigo },
      { key: 'turma_nome', value: indice.turma.nome }
    ]);
  });
  return { atualizado: true, versao: indice.content_version };
}
