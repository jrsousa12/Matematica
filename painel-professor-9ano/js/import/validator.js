// Validação de arquivos de exportação dos alunos, em 4 níveis (função pura, sem banco).
//   Nível 1: o arquivo é um JSON válido e um objeto.
//   Nível 2: estrutura do schema 1.0 (versão e blocos obrigatórios).
//   Nível 3: tipos e valores dos campos.
//   Nível 4: o arquivo pertence à turma configurada no painel.
// Se um nível falha, os seguintes não são avaliados. Se passa, ainda pode haver avisos leves.

import { gerarAvisos } from './avisos.js';

export const SCHEMA_ACEITO = '1.0';

const LISTAS = ['sessoes', 'respostas', 'dominio_bloco', 'badges'];
const NUMEROS_PROGRESSO = ['xp_total', 'nivel', 'moedas', 'streak_atual', 'streak_recorde', 'freezes_usados_semana'];

const ehObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const ehNumero = (v) => typeof v === 'number' && Number.isFinite(v);
const ehTexto = (v) => typeof v === 'string' && v.trim() !== '';

function nivel1(texto) {
  let dados;
  try {
    dados = JSON.parse(texto);
  } catch {
    return { erros: ['O arquivo não é um JSON válido (pode estar incompleto ou corrompido).'] };
  }
  if (!ehObjeto(dados)) return { erros: ['O arquivo é um JSON, mas não é um objeto de exportação.'] };
  return { dados, erros: [] };
}

function nivel2(s) {
  const erros = [];
  if (s.schema_version === undefined) erros.push('Não é um arquivo de exportação do app (falta "schema_version").');
  else if (s.schema_version !== SCHEMA_ACEITO) {
    erros.push(`Versão de schema não suportada: ${s.schema_version} (o painel lê a ${SCHEMA_ACEITO}).`);
  }
  if (erros.length) return erros;
  if (!ehObjeto(s.perfil)) erros.push('Falta o bloco "perfil".');
  else if (!ehTexto(s.perfil.ra)) erros.push('O RA do aluno está ausente ou vazio.');
  if (!ehObjeto(s.progresso)) erros.push('Falta o bloco "progresso".');
  if (!ehTexto(s.turma_codigo)) erros.push('Falta o código da turma.');
  if (!ehTexto(s.exported_at)) erros.push('Falta a data de exportação.');
  for (const lista of LISTAS) {
    if (!Array.isArray(s[lista])) erros.push(`Falta a lista "${lista}".`);
  }
  return erros;
}

function nivel3(s) {
  const erros = [];
  if (!ehTexto(s.perfil.nome)) erros.push('O nome do aluno está ausente ou vazio.');
  if (Number.isNaN(Date.parse(s.exported_at))) erros.push('A data de exportação não é válida.');
  for (const campo of NUMEROS_PROGRESSO) {
    const v = s.progresso[campo];
    if (!ehNumero(v)) erros.push(`progresso.${campo} deve ser um número (veio ${JSON.stringify(v)}).`);
    else if (v < 0) erros.push(`progresso.${campo} não pode ser negativo (veio ${v}).`);
  }
  const nivel = s.progresso.nivel;
  if (ehNumero(nivel) && (nivel < 1 || nivel > 10)) erros.push(`progresso.nivel deve estar entre 1 e 10 (veio ${nivel}).`);
  s.sessoes.forEach((x, i) => {
    if (!ehObjeto(x) || !ehTexto(x.id) || !ehTexto(x.data) || !ehNumero(x.acertos) || !ehNumero(x.total)) {
      erros.push(`Sessão ${i + 1} com campos inválidos (id, data, acertos e total).`);
    }
  });
  s.respostas.forEach((x, i) => {
    if (!ehObjeto(x) || !ehTexto(x.id) || !ehNumero(x.bloco_id) || typeof x.correta !== 'boolean' || !ehTexto(x.respondida_em)) {
      erros.push(`Resposta ${i + 1} com campos inválidos (id, bloco_id, correta e respondida_em).`);
    }
  });
  s.dominio_bloco.forEach((x, i) => {
    if (!ehObjeto(x) || !ehNumero(x.bloco_id) || !ehNumero(x.acertos) || !ehNumero(x.total) || x.acertos > x.total) {
      erros.push(`Domínio ${i + 1} com campos inválidos (bloco_id, acertos e total).`);
    }
  });
  s.badges.forEach((x, i) => {
    if (!ehObjeto(x) || !ehTexto(x.id)) erros.push(`Badge ${i + 1} sem identificador.`);
  });
  return erros.slice(0, 10);
}

function nivel4(s, turmaEsperada) {
  if (s.turma_codigo === turmaEsperada) return [];
  return [`O arquivo é da turma ${s.turma_codigo}, mas o painel está configurado para ${turmaEsperada}.`];
}

// Retorna { ok, nivel_falha, erros[], avisos[], snapshot, ra }. Nunca lança exceção.
export function validarSnapshot(texto, { turma_codigo, agora = new Date() } = {}) {
  const etapas = [
    () => nivel1(texto),
    (r) => ({ erros: nivel2(r.dados) }),
    (r) => ({ erros: nivel3(r.dados) }),
    (r) => ({ erros: nivel4(r.dados, turma_codigo) })
  ];
  const estado = {};
  for (let i = 0; i < etapas.length; i++) {
    const r = etapas[i](estado);
    if (r.dados) estado.dados = r.dados;
    if (r.erros.length) return { ok: false, nivel_falha: i + 1, erros: r.erros, avisos: [], snapshot: null, ra: estado.dados?.perfil?.ra ?? null };
  }
  const snapshot = estado.dados;
  return { ok: true, nivel_falha: 0, erros: [], avisos: gerarAvisos(snapshot, agora), snapshot, ra: snapshot.perfil.ra.trim() };
}
