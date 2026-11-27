// Regras de cadastro do aluno (validacao de turma e nome) e criacao do perfil.
// RA desligado por enquanto (ideia futura, ver HANDOFF.md): o app cria sozinho um codigo aleatorio
// que fica em perfil.ra e identifica o aluno no painel. Para voltar a pedir o RA: EXIGIR_RA = true
// e reativar o campo em js/ui/onboarding.js.
// Codigo da turma tambem desligado: o aluno entra na turma padrao do conteudo (meta.turma_codigo).
// Para voltar a pedir: EXIGIR_CODIGO_TURMA = true e reativar o campo em js/ui/onboarding.js.

import * as repo from '../db/progress-repo.js';
import { obterMeta } from '../db/seed.js';
import { hoje, isoLocal } from '../util/datas.js';
import { progressoInicial } from '../db/schema.js';

export const EXIGIR_RA = false;
export const EXIGIR_CODIGO_TURMA = false;
const LETRAS_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sem I, L, O, 0 e 1, que se confundem

export function gerarCodigoAluno(sorteio = Math.random) {
  return Array.from({ length: 6 }, () => LETRAS_CODIGO[Math.floor(sorteio() * LETRAS_CODIGO.length)]).join('');
}

export function normalizarCodigo(codigo) {
  return String(codigo || '').trim().toUpperCase().replace(/\s+/g, '');
}

export function validarCadastro({ codigo, nome, ra, aceite }, codigoTurma) {
  const erros = {};
  if (EXIGIR_CODIGO_TURMA) {
    if (!normalizarCodigo(codigo)) erros.codigo = 'Informe o código da turma.';
    else if (normalizarCodigo(codigo) !== normalizarCodigo(codigoTurma)) {
      erros.codigo = 'Código de turma não encontrado. Confira com o professor.';
    }
  }
  const nomeLimpo = String(nome || '').trim().replace(/\s+/g, ' ');
  if (nomeLimpo.length < 3) erros.nome = 'Digite seu nome (pelo menos 3 letras).';
  let raLimpo = String(ra || '').trim().replace(/\s+/g, '');
  if (EXIGIR_RA) {
    if (!/^[0-9A-Za-z-]{4,20}$/.test(raLimpo)) erros.ra = 'O RA deve ter de 4 a 20 letras ou números.';
  } else raLimpo = gerarCodigoAluno();
  if (!aceite) erros.aceite = 'É preciso confirmar a leitura do aviso.';
  return { valido: Object.keys(erros).length === 0, erros, dados: { nome: nomeLimpo, ra: raLimpo } };
}

export async function turmaConfigurada() {
  const meta = await obterMeta();
  return { codigo: meta.turma_codigo, nome: meta.turma_nome };
}

export async function cadastrar(entrada) {
  const turma = await turmaConfigurada();
  const v = validarCadastro(entrada, turma.codigo);
  if (!v.valido) return v;
  await repo.salvarPerfil({
    nome: v.dados.nome, ra: v.dados.ra, turma_codigo: turma.codigo, criado_em: isoLocal()
  });
  const atual = await repo.obterProgresso();
  if (!atual.bloco_inicio) {
    await repo.salvarProgresso({ ...progressoInicial(), ...atual, bloco_inicio: hoje() });
  }
  await repo.registrarEvento('onboarding_concluido', { turma: turma.codigo });
  return v;
}
