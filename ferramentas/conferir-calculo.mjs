// Motor de calculo: confere se a alternativa marcada como correta bate com a conta do enunciado.
// Uso: node ferramentas/conferir-calculo.mjs [--detalhe]   (imprime OK / AVISO / FALHA)
import { readFileSync, readdirSync } from 'node:fs';
import { avaliar, valorAlternativa, ultimoNumero } from './calculo/racional.mjs';
import { resolverDireto, limparEnunciado } from './calculo/auto.mjs';
import { SOLUCOES, LIDAS } from './calculo/solucoes.mjs';

const dir = 'app-matematica-9ano/js/data/';
const questoes = readdirSync(dir).filter((f) => /^questoes-lote.*\.json$/.test(f)).sort()
  .flatMap((f) => JSON.parse(readFileSync(dir + f, 'utf8')));
const detalhe = process.argv.includes('--detalhe');
// Alternativa do tipo "50 - 3 x 12 = R$ 14": a conta da esquerda tem de dar o valor da direita.
function consistente(texto) {
  const m = texto.match(/^(.*?)=\s*(?:R\$\s*)?(-?[−\d.,]+)\s*$/);
  if (!m) return true;
  try { return avaliar(m[1]).igual(avaliar(m[2])); } catch { return true; }
}
const mdc = (a, b) => (b ? mdc(b, a % b) : a);
function irredutivel(texto) {
  const m = texto.match(/(\d+)\/(\d+)/);
  return !m || mdc(Number(m[1]), Number(m[2])) === 1;
}
const cont = { auto: 0, manual: 0, lida: 0, pendente: [], repetidas: [], falhas: 0 };
const falha = (q, msg) => { cont.falhas++; console.log(`FALHA ${q.id}: ${msg}`); };

for (const q of questoes) {
  const valores = q.alternativas.map((a) => valorAlternativa(limparEnunciado(a)));
  const certa = 'ABCD'.indexOf(q.correta);
  // Estrutura: 4 alternativas, letra valida, sem alternativas repetidas.
  if (q.alternativas.length !== 4 || certa < 0) { falha(q, 'alternativas/letra invalidas'); continue; }
  const textos = q.alternativas.map((a) => limparEnunciado(a));
  if (new Set(textos).size < 4) falha(q, 'alternativas repetidas');
  const nums = valores.filter(Boolean).map(String);
  if (nums.length === 4 && new Set(nums).size < 4) { cont.repetidas.push(q.id); }

  let origem = 'auto', r = resolverDireto(q.enunciado);
  if (!r && SOLUCOES[q.id]) {
    origem = 'manual';
    const sol = typeof SOLUCOES[q.id] === 'string' ? { expr: SOLUCOES[q.id] } : SOLUCOES[q.id];
    try { r = { ...sol, valor: avaliar(sol.expr) }; }
    catch (e) { falha(q, `solucao escrita invalida (${e.message})`); continue; }
  }
  if (!r && LIDAS[q.id]) {
    cont.lida++;
    if (LIDAS[q.id] !== q.correta) falha(q, `[leitura] resolvi pelo enunciado e achei a letra ${LIDAS[q.id]}, mas o gabarito diz ${q.correta}`);
    continue;
  }
  if (!r) { cont.pendente.push(q.id); continue; }
  cont[origem]++;
  let vals = valores;
  if (r.texto !== undefined) vals = textos.map(ultimoNumero);          // resposta em frase: vale o ultimo numero
  if (r.avaliarAlt) vals = textos.map((t) => { try { return avaliar(t); } catch { return null; } }); // a propria alternativa e uma conta
  const achadas = vals.map((v, i) => (v && v.igual(r.valor) && (!r.texto || textos[i].includes(r.texto)) ? i : -1)).filter((i) => i >= 0);
  if (!achadas.length) falha(q, `[${origem}] ${r.expr} = ${r.valor} nao esta nas alternativas`);
  else if (!achadas.includes(certa)) falha(q, `[${origem}] ${r.expr} = ${r.valor} esta na letra ${'ABCD'[achadas[0]]}, mas o gabarito diz ${q.correta}`);
  else if (r.irredutivel && !irredutivel(textos[certa])) falha(q, `a resposta certa "${textos[certa]}" nao esta simplificada`)
  else if (achadas.length > 1 && !r.irredutivel) falha(q, `[${origem}] ${r.expr} = ${r.valor} vale para as letras ${achadas.map((i) => 'ABCD'[i]).join(' e ')} (duas respostas certas)`);
  else if (!consistente(textos[certa])) falha(q, `a alternativa certa "${textos[certa]}" tem conta e resultado diferentes`);
  else if (detalhe) console.log(`ok    ${q.id} [${origem}] ${r.expr} = ${r.valor}`);
}

if (cont.repetidas.length) console.log(`AVISO ${cont.repetidas.length} com duas alternativas de mesmo valor (ok so se a pergunta for sobre a forma): ${cont.repetidas.join(' ')}`);
const letras = { A: 0, B: 0, C: 0, D: 0 };
questoes.forEach((q) => { letras[q.correta]++; });
const n = questoes.length;
console.log(`${cont.falhas ? 'FALHA' : 'OK   '} ${cont.auto} conferidas pelo resolvedor automatico, ${cont.manual} por solucao escrita, ${cont.lida} por leitura (de ${n})`);
if (cont.pendente.length) console.log(`AVISO ${cont.pendente.length} sem conferencia por conta (conferir a mao): ${cont.pendente.join(' ')}`);
console.log(`OK    gabarito por letra: A ${letras.A}, B ${letras.B}, C ${letras.C}, D ${letras.D}`);
process.exit(cont.falhas ? 1 : 0);
