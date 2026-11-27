// Resolvedor automatico: so resolve enunciados que sao uma conta direta.
// O que nao casar volta como null (e vai para a lista de solucoes escritas a mao).
import { avaliar } from './racional.mjs';

const EXPR = /[-−–]?[\d(][\d.,()\s+−–\-×x÷*/:%]*[\d)%]/;

export function limparEnunciado(html) {
  return String(html)
    .replace(/<span class="frac"><span>(.*?)<\/span><span>(.*?)<\/span><\/span>/g, '($1/$2)')
    .replace(/<sup>(.*?)<\/sup>/g, '^$1').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// Retorna { expr, valor } ou null.
export function resolverDireto(enunciado) {
  const t = limparEnunciado(enunciado);
  const p = t.match(/^Quanto é (\d[\d.,]*)% de (R\$ ?)?(\d[\d.,]*)\??$/);
  if (p) return { expr: `${p[1]}% × ${p[3]}`, valor: avaliar(`${p[1]}% × ${p[3]}`) };
  const m = t.match(EXPR);
  if (!m) return null;
  const expr = m[0].trim();
  const resto = t.replace(expr, '§');
  if (!/^(Qual é|Calcule|Resolva|Quanto é|Determine|Efetue)[^\d§]*§[?.]?$/.test(resto) || resto.length > 70) return null;
  if (!/[+−–\-×x÷*/:]/.test(expr.replace(/^[-−]/, ''))) return null; // precisa ter conta
  try { return { expr, valor: avaliar(expr) }; } catch { return null; }
}
