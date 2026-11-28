// Motor de teoria: confere se lições e questões seguem o padrão da especificação (seção 2.2).
// Uso: node ferramentas/conferir-teoria.mjs   (imprime OK / AVISO / FALHA; FALHA = fora do padrão)
import { readFileSync, readdirSync } from 'node:fs';

const dir = 'app-matematica-9ano/js/data/';
const ler = (f) => JSON.parse(readFileSync(dir + f, 'utf8'));
const lote = (pre) => readdirSync(dir).filter((f) => f.startsWith(pre) && f.endsWith('.json')).sort().flatMap(ler);
const meta = ler('blocos.json');
const blocos = (Array.isArray(meta) ? meta : meta.blocos).sort((a, b) => a.ordem - b.ordem);
const licoes = lote('licoes-lote'), questoes = lote('questoes-lote');

let falhas = 0, avisos = 0;
const falha = (m) => { falhas++; console.log(`FALHA ${m}`); };
const aviso = (m) => { avisos++; console.log(`AVISO ${m}`); };
const palavras = (t) => String(t).replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
const EMOJI = /\p{Extended_Pictographic}/u;
const TAGS_OK = new Set(['sup', 'sub', 'span', 'b', 'strong', 'em', 'i']);
const tagsRuins = (t) => [...String(t).matchAll(/<\/?\s*([a-z0-9]+)/gi)].map((m) => m[1].toLowerCase()).filter((x) => !TAGS_OK.has(x));
const verTexto = (onde, texto) => {
  if (EMOJI.test(texto)) falha(`${onde}: tem emoji`);
  const ruins = tagsRuins(texto);
  if (ruins.length) falha(`${onde}: HTML fora do padrão (${[...new Set(ruins)].join(', ')})`);
  if (/<img|src=|http/i.test(texto)) falha(`${onde}: imagem ou link externo`);
};

for (const b of blocos) {
  const nome = `bloco ${b.id}`;
  // ---- Lição
  const li = licoes.filter((x) => x.bloco_id === b.id);
  if (li.length !== 1) { falha(`${nome}: ${li.length} lições (esperado 1)`); }
  else {
    const l = li[0];
    if (l.paragrafos.length < 3 || l.paragrafos.length > 4) falha(`${nome}: lição com ${l.paragrafos.length} parágrafos (esperado 3 a 4)`);
    l.paragrafos.forEach((p, i) => {
      const n = palavras(p);
      if (n > 40) falha(`${nome}: parágrafo ${i + 1} da lição com ${n} palavras (máximo 40)`);
      verTexto(`${nome}, parágrafo ${i + 1}`, p);
    });
    if (l.exemplos.length !== 3) falha(`${nome}: ${l.exemplos.length} exemplos (esperado 3)`);
    l.exemplos.forEach((e, i) => {
      const id = `${nome}, exemplo ${i + 1}`;
      if (!e.enunciado) falha(`${id}: sem enunciado`);
      if (!e.passos || e.passos.length < 2) falha(`${id}: menos de 2 passos`);
      if (!e.passos?.some((p) => /Resposta/i.test(p)) && !e.resposta) falha(`${id}: sem resposta final`);
      verTexto(id, [e.titulo, e.enunciado, ...(e.passos || [])].join(' '));
    });
    // O terceiro exemplo deve ser contextualizado: um problema em texto, nao so uma conta (sinal fraco: poucas palavras).
    const ult = l.exemplos[2];
    if (ult && (palavras(ult.enunciado || '') < 10 || /^(Calcule|Resolva|Efetue)/i.test(ult.enunciado || ''))) aviso(`${nome}: exemplo 3 parece uma conta pura, não um problema contextualizado (conferir)`);
  }
  // ---- Questões
  const qs = questoes.filter((q) => q.bloco_id === b.id);
  if (qs.length !== 15) falha(`${nome}: ${qs.length} questões (esperado 15)`);
  const cont = (f) => qs.filter(f).length;
  const [fa, me, di] = [cont((q) => q.dificuldade === 'facil'), cont((q) => q.dificuldade === 'media'), cont((q) => q.dificuldade === 'dificil')];
  if (fa !== 5 || me !== 6 || di !== 4) falha(`${nome}: dificuldades ${fa} fáceis, ${me} médias, ${di} difíceis (esperado 5, 6 e 4)`);
  const ctx = cont((q) => q.contextualizada);
  const [min, max] = b.id <= 5 ? [7, 8] : [9, 9];
  if (ctx < min || ctx > max) falha(`${nome}: ${ctx} contextualizadas (esperado ${min === max ? min : `${min} a ${max}`})`);
  const letras = ['A', 'B', 'C', 'D'].map((x) => cont((q) => q.correta === x));
  if (Math.max(...letras) > 6) aviso(`${nome}: gabarito concentrado (A ${letras[0]}, B ${letras[1]}, C ${letras[2]}, D ${letras[3]})`);
  qs.forEach((q, i) => {
    const esperado = `b${String(b.id).padStart(2, '0')}_q${String(i + 1).padStart(2, '0')}`;
    if (q.id !== esperado) falha(`${q.id}: id fora da sequência (esperado ${esperado})`);
    if (q.ativa === false) aviso(`${q.id}: questão inativa`);
    if (!q.habilidade_saeb) falha(`${q.id}: sem habilidade do SAEB`);
    if (!q.explicacao_acerto || !q.explicacao_erro) falha(`${q.id}: falta explicação de acerto ou de erro`);
    verTexto(q.id, [q.enunciado, ...q.alternativas, q.explicacao_acerto, q.explicacao_erro].join(' '));
  });
  // dificuldade difícil serve de Desafio Diário: precisa existir no bloco
  if (!di) falha(`${nome}: sem questão difícil para o desafio diário`);
}
const idsLicao = new Set(licoes.map((l) => l.bloco_id));
licoes.forEach((l) => { if (!blocos.some((b) => b.id === l.bloco_id)) falha(`lição de bloco inexistente (${l.bloco_id})`); });
console.log(`${falhas ? 'FALHA' : 'OK   '} padrão da especificação: ${blocos.length} blocos, ${idsLicao.size} lições, ${questoes.length} questões (${falhas} fora do padrão, ${avisos} avisos)`);
process.exit(falhas ? 1 : 0);
