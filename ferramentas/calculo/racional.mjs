// Calculadora exata (numeros racionais com BigInt): sem erro de arredondamento.
// Entende numeros em pt-BR (1.250 / 46,25), sinal de menos tipografico, x, ÷, : , % e fracoes (a/b).

const mdc = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a || 1n; };

export class Q {
  constructor(n, d = 1n) {
    if (d === 0n) throw new Error('divisao por zero');
    if (d < 0n) { n = -n; d = -d; }
    const g = mdc(n, d);
    this.n = n / g; this.d = d / g;
  }
  mais(o) { return new Q(this.n * o.d + o.n * this.d, this.d * o.d); }
  menos(o) { return new Q(this.n * o.d - o.n * this.d, this.d * o.d); }
  vezes(o) { return new Q(this.n * o.n, this.d * o.d); }
  div(o) { return new Q(this.n * o.d, this.d * o.n); }
  neg() { return new Q(-this.n, this.d); }
  igual(o) { return this.n === o.n && this.d === o.d; }
  toString() { return this.d === 1n ? String(this.n) : `${this.n}/${this.d}`; }
  paraNumero() { return Number(this.n) / Number(this.d); }
}

// "46,25" -> 4625/100 ; "1.250" -> 1250 (ponto so como separador de milhar).
export function numero(txt) {
  let t = txt.replace(/\s/g, '');
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, '');
  const [inteira, frac = ''] = t.split(',');
  if (!/^\d+$/.test(inteira) || (frac && !/^\d+$/.test(frac))) throw new Error(`numero invalido: ${txt}`);
  return new Q(BigInt(inteira + frac), 10n ** BigInt(frac.length));
}

// Expressao: + - × ÷ parenteses, menos unario, percentual (50% = 1/2).
export function avaliar(texto) {
  const t = texto.replace(/R\$/g, '').replace(/[−–—]/g, '-').replace(/[×x*]/g, '*').replace(/[÷:/]/g, '/')
    .replace(/\s+/g, '');
  const tokens = t.match(/\d[\d.,]*|[-+*/()%]/g) || [];
  if (tokens.join('') !== t) throw new Error(`simbolo nao reconhecido em: ${texto}`);
  let i = 0;
  const prox = () => tokens[i];
  function primario() {
    const k = tokens[i++];
    if (k === undefined) throw new Error('expressao incompleta');
    if (k === '-') return primario().neg();
    if (k === '+') return primario();
    if (k === '(') { const v = soma(); if (tokens[i++] !== ')') throw new Error('parenteses'); return v; }
    if (/^\d/.test(k)) return numero(k);
    throw new Error(`token inesperado: ${k}`);
  }
  function posfixo() {
    let v = primario();
    while (prox() === '%') { i++; v = v.div(new Q(100n)); }
    return v;
  }
  function produto() {
    let v = posfixo();
    while (prox() === '*' || prox() === '/') { const op = tokens[i++]; const r = posfixo(); v = op === '*' ? v.vezes(r) : v.div(r); }
    return v;
  }
  function soma() {
    let v = produto();
    while (prox() === '+' || prox() === '-') { const op = tokens[i++]; const r = produto(); v = op === '+' ? v.mais(r) : v.menos(r); }
    return v;
  }
  const r = soma();
  if (i !== tokens.length) throw new Error(`sobrou texto em: ${texto}`);
  return r;
}

// Valor de uma alternativa: "R$ 46,25", "−R$ 90", "(5/7)", "42,8", "120 copos", "35%".
export function valorAlternativa(txt) {
  const t = txt.replace(/R\$/g, '').replace(/\s+/g, ' ').trim().replace(/[−–—]/g, '-').replace(/^-\s+/, '-');
  const m = t.match(/^(-?)\(?(\d[\d.,]*)(?:\/(\d[\d.,]*))?\)?(%?)/);
  if (!m || /[\d=+×÷*/-]/.test(t.slice(m[0].length))) return null; // so valores puros (nao expressoes)
  try {
    let v = numero(m[2]);
    if (m[3]) v = v.div(numero(m[3]));
    if (m[4]) v = v.div(new Q(100n));
    return m[1] ? v.neg() : v;
  } catch { return null; } // ex.: fracao com denominador 0
}

// Ultimo numero do texto ("Equipe Azul, por 25 pontos" -> 25; "50 - 3 x 12 = R$ 14" -> 14).
export function ultimoNumero(txt) {
  const achados = String(txt).replace(/[−–—]/g, '-').match(/-?\d[\d.,]*\d|-?\d/g);
  if (!achados) return null;
  try { return numero(achados[achados.length - 1].replace(/^-/, '')).vezes(new Q(achados[achados.length - 1].startsWith('-') ? -1n : 1n)); } catch { return null; }
}
