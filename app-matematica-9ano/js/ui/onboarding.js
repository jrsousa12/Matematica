// Aviso LGPD + cadastro (nome e aceite; os campos de RA e codigo da turma estao desligados, ver cadastro.js).

import { cadastrar, turmaConfigurada } from '../motor/cadastro.js';
import { esc } from './comum.js';

export async function render(container, params, { navegar }) {
  const turma = await turmaConfigurada();
  container.innerHTML = `
    <div class="pilha">
      <div class="pilha-sm">
        <h1>Matemática 9º Ano</h1>
        <p class="suave">10 a 15 minutos por dia para fortalecer a sua base em Matemática.</p>
      </div>

      <section class="card pilha-sm" aria-labelledby="titulo-aviso">
        <h2 id="titulo-aviso">Aviso de privacidade</h2>
        <p class="pequeno">Este app foi feito pelo seu professor para a prática de exercícios.
          Ele <strong>não coleta e-mail, telefone, fotos ou localização</strong>.</p>
        <p class="pequeno">Seu nome e seus acertos ficam salvos <strong>apenas neste celular</strong>.
          Uma vez por semana você exporta um arquivo e entrega ao professor, só para acompanhamento
          pedagógico. Não há ranking nem exposição pública.</p>
        <p class="pequeno">Depois do primeiro acesso, o app funciona sem internet.</p>
      </section>

      <form class="card pilha" id="form-cadastro" novalidate>
        <h2>Cadastro</h2>
        <div class="campo">
          <label for="nome">Seu nome</label>
          <input id="nome" name="nome" autocomplete="name" required>
          <span class="erro-campo" data-erro="nome"></span>
        </div>
        <label class="caixa-check">
          <input type="checkbox" name="aceite">
          <span>Li o aviso de privacidade e meu responsável assinou o termo de autorização.</span>
        </label>
        <span class="erro-campo" data-erro="aceite"></span>
        <button class="botao" type="submit">Começar</button>
        ${turma.nome ? `<p class="pequeno suave centro">Turma: ${esc(turma.nome)}</p>` : ''}
      </form>
    </div>`;

  const form = container.querySelector('#form-cadastro');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const botao = form.querySelector('button[type="submit"]');
    botao.disabled = true;
    const dados = {
      nome: form.nome.value, aceite: form.aceite.checked
    };
    const r = await cadastrar(dados);
    form.querySelectorAll('[data-erro]').forEach((el) => { el.textContent = r.erros[el.dataset.erro] || ''; });
    botao.disabled = false;
    if (r.valido) navegar('home');
    else {
      const primeiro = Object.keys(r.erros)[0];
      const campo = form.querySelector(`[name="${primeiro}"]`);
      if (campo) campo.focus();
    }
  });
}
