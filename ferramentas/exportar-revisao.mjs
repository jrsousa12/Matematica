// Gera materiais/revisao-conteudo.md: lições e questões em texto corrido, com caixas para o professor revisar.
// Uso: node ferramentas/exportar-revisao.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
const dir = 'app-matematica-9ano/js/data/';
const ler = (p) => JSON.parse(readFileSync(dir + p, 'utf8'));
const lote = (pre) => readdirSync(dir).filter((f) => f.startsWith(pre) && f.endsWith('.json')).sort().flatMap(ler);
const limpa = (t) => String(t)
  .replace(/<span class="frac"><span>(.*?)<\/span><span>(.*?)<\/span><\/span>/g, '($1/$2)')
  .replace(/<sup>(.*?)<\/sup>/g, '^$1').replace(/<sub>(.*?)<\/sub>/g, '_$1').replace(/<[^>]+>/g, '');
const blocos = ler('blocos.json'); const blocosLista = Array.isArray(blocos) ? blocos : blocos.blocos;
const licoes = lote('licoes-lote'); const questoes = lote('questoes-lote');
const dif = { facil: 'fácil', media: 'média', dificil: 'difícil' };
const L = ['# Revisão do conteúdo (professor-autor)', '',
  'Marque `[x]` quando revisar. Anote correções na linha "Obs.". Depois me passe as observações para eu aplicar no app.', ''];
for (const b of blocosLista.sort((x, y) => x.ordem - y.ordem)) {
  L.push(`## Bloco ${b.id} — ${b.titulo}`, '');
  const li = licoes.find((x) => x.bloco_id === b.id);
  if (li) {
    L.push(`### Lição`, '- [ ] Lição revisada', '', ...li.paragrafos.map((p) => limpa(p) + '\n'));
    for (const e of li.exemplos) L.push(`**${limpa(e.titulo)}**`, '', limpa(e.enunciado), '', ...e.passos.map((s) => `- ${limpa(s)}`), '', e.resposta ? `Resposta: ${limpa(e.resposta)}` : '', '');
    L.push('Obs.: ____________________', '');
  }
  L.push('### Questões', '');
  for (const q of questoes.filter((x) => x.bloco_id === b.id)) {
    L.push(`- [ ] **${q.id}** (${dif[q.dificuldade] || q.dificuldade}${q.contextualizada ? ', contextualizada' : ''}) ${limpa(q.enunciado)}`);
    q.alternativas.forEach((a, i) => L.push(`    - ${'ABCD'[i]}) ${limpa(a)}${'ABCD'[i] === q.correta ? '  **(correta)**' : ''}`));
    L.push(`    - Acerto: ${limpa(q.explicacao_acerto)}`, `    - Erro: ${limpa(q.explicacao_erro)}`, '    - Obs.: ____________________', '');
  }
}
writeFileSync('materiais/revisao-conteudo.md', L.join('\n'));
console.log(`OK materiais/revisao-conteudo.md: ${blocosLista.length} blocos, ${licoes.length} lições, ${questoes.length} questões`);
