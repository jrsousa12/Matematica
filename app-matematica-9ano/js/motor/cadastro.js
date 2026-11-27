// Regras de cadastro do aluno (validacao de turma, nome e RA) e criacao do perfil.

import * as repo from '../db/progress-repo.js';
import { obterMeta } from '../db/seed.js';
import { hoje, isoLocal } from '../util/datas.js';
import { progressoInicial } from '../db/schema.js';

export function normalizarCodigo(codigo) {
  return String(codigo || '').trim().toUpperCase().replace(/\s+/g, '');
}

export function validarCadastro({ codigo, nome, ra, aceite }, codigoTurma) {
  const erros = {};
  if (!normalizarCodigo(codigo)) erros.codigo = 'Informe o código da turma.';
  else if (normalizarCodigo(codigo) !== normalizarCodigo(codigoTurma)) {
    erros.codigo = 'Código de turma não encontrado. Confira com o professor.';
  }
  const nomeLimpo = String(nome || '').trim().replace(/\s+/g, ' ');
  if (nomeLimpo.length < 3) erros.nome = 'Digite seu nome (pelo menos 3 letras).';
  const raLimpo = String(ra || '').trim().replace(/\s+/g, '');
  if (!/^[0-9A-Za-z-]{4,20}$/.test(raLimpo)) erros.ra = 'O RA deve ter de 4 a 20 letras ou números.';
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
