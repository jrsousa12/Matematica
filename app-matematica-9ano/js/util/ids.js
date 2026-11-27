// Geracao de identificadores unicos (funciona tambem fora de contexto seguro).

export function novoId(prefixo = '') {
  let base;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    base = crypto.randomUUID();
  } else {
    base = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10) +
      Math.random().toString(36).slice(2, 10);
  }
  return prefixo ? `${prefixo}_${base}` : base;
}

export function embaralhar(lista) {
  const copia = lista.slice();
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}
