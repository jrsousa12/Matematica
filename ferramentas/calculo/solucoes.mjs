// Solucoes escritas a mao para as questoes que o resolvedor automatico nao entende
// (problemas em texto). Cada uma e uma CONTA (nao o resultado digitado): id -> expressao.
// Foram escritas lendo so o enunciado, sem olhar o gabarito. O motor calcula com fracoes exatas
// e compara com a letra do app. Forma longa: { expr, texto } exige que a alternativa contenha esse
// texto (para respostas como "Equipe Azul, por 25 pontos" ou "2º andar").
export const SOLUCOES = {
  // Bloco 1
  b01_q03: '85 + 47', b01_q04: '180 - 125', b01_q05: '700 - 430', b01_q07: '200 - 28 - 115',
  b01_q08: '348 + 79', b01_q09: '385 + 419', b01_q10: '32 + 14 - 9 + 7 - 11', b01_q12: '1984 + 40',
  b01_q13: '1250 - 380 - 415 + 300', b01_q14: '950 + 120 - 75',
  b01_q15: { expr: '1480 + 90 - (1195 + 350)', texto: 'Azul' },
  // Bloco 2
  b02_q03: '24 × 6', b02_q04: '96 ÷ 8', b02_q05: '47 - 6 × 7', b02_q08: '12 × 85', b02_q09: '28 × 16',
  b02_q10: '14 × 23', b02_q11: '1260 ÷ 18', b02_q12: '12 + 1', b02_q13: '9 × 15 + 8',
  b02_q14: '(15 × 20 - 18) × 3', b02_q15: '34 × 25 + 34',
  // Bloco 3
  b03_q03: '-40 + 100', b03_q05: '4 - 9', b03_q08: '-120 + 45', b03_q09: '7 - (-4)',
  b03_q11: { expr: '-2 + 7 - 3', texto: 'andar' }, b03_q12: '9 - (-6)', b03_q13: '-14 - (-6)',
  b03_q14: '150 - 210 + 95 - 60', b03_q15: '-12 - (-7) + (-5)',
  // Bloco 4
  b04_q04: '6 × (-5)', b04_q07: '-360 ÷ 4', b04_q08: '42 ÷ (-6)', b04_q09: '0 - 3 × 8', b04_q11: '5 × (-25)',
  b04_q12: '2 × (-4) × (-3)', b04_q13: '14 × 5 + 6 × (-2)', b04_q15: '(-14 - 6) ÷ 5',
  // Bloco 5 (as que trazem a conta na alternativa: confere a conta e o valor escritos)
  b05_q04: { expr: '50 - 3 × 12', texto: '50 − 3 × 12 =' }, b05_q08: '8 + 3 × 4', b05_q09: '10 - (6 - (4 - 9))',
  b05_q10: '2 × 15 + 3 × 10 - 12', b05_q11: { expr: '(900 - 120) ÷ 6', texto: ' ÷ 6 =' }, b05_q13: '180 ÷ 4 + 5',
  b05_q14: { expr: '8', avaliarAlt: true }, b05_q15: { expr: '6 × 10 + 5 × (-4) + 3 × 2', texto: '6 × 10' },
  // Bloco 6 (irredutivel: a alternativa certa tem de estar na forma simplificada)
  b06_q01: '1 - 3 ÷ 8', b06_q02: '2 ÷ 5', b06_q03: { expr: '12 ÷ 16', irredutivel: true }, b06_q04: '1 ÷ 2',
  b06_q05: '2 ÷ 7', b06_q07: '4 × 35 ÷ 7', b06_q08: { expr: '(20 - 8 - 7) ÷ 20', irredutivel: true },
  b06_q09: '3 ÷ 4', b06_q14: { expr: '(1000 - 600) ÷ 1000', irredutivel: true },
  // Bloco 7
  b07_q02: { expr: '7 ÷ 9 - 4 ÷ 9', irredutivel: true }, b07_q03: '2 ÷ 5 + 1 ÷ 5', b07_q04: '1 - 5 ÷ 8',
  b07_q05: '5 ÷ 6 - 2 ÷ 6', b07_q08: '2 ÷ 5 + 3 ÷ 10', b07_q10: '3 ÷ 4 - 1 ÷ 3', b07_q11: '1 - 1 ÷ 4 - 2 ÷ 3',
  b07_q12: '1 - 1 ÷ 3 - 1 ÷ 4 - 1 ÷ 6', b07_q14: '3 ÷ 4 - 2 ÷ 5', b07_q15: '5 ÷ 4 - 2 ÷ 3',
  // Bloco 8
  b08_q02: '1 ÷ 4 × 20', b08_q04: '2 ÷ 5 × 30', b08_q06: { expr: '3 ÷ 4 × 8 ÷ 9', irredutivel: true },
  b08_q08: '3 ÷ 4 × 1 ÷ 2', b08_q09: '6 ÷ (3 ÷ 4)', b08_q10: '180 × (1 - 5 ÷ 6)', b08_q12: '2 ÷ 3 × 3 ÷ 4',
  b08_q13: '40 ÷ (2 ÷ 5)', b08_q15: '(3 ÷ 2) ÷ (3 ÷ 10)',
  // Bloco 9
  b09_q03: '4,50 + 3,25', b09_q05: '20,00 - 13,40', b09_q08: '14,50 × 3', b09_q09: '54 ÷ 4',
  b09_q11: '12,45 + 11,8 + 12,05', b09_q12: '150 - 25 × 5,80', b09_q13: '1,8 ÷ 0,15', b09_q15: '(6,45 - 0,45) ÷ 12',
  // Bloco 10
  b10_q02: '10% × 230', b10_q03: '25% × 60', b10_q04: '10% × 40', b10_q05: '3 ÷ 4', b10_q06: '200 × (1 - 15%)',
  b10_q07: '800 × (1 + 5%)', b10_q08: '40 × 30%', b10_q09: '35% × 120', b10_q10: '15 ÷ 50',
  b10_q11: '80 × (1 - 75%)', b10_q12: '600 × (1 + 12%) ÷ 4', b10_q13: '120 ÷ (1 - 20%)',
  b10_q14: '20% × 50% × 300', b10_q15: '8 ÷ 32'
};

// Respostas em texto ou contagem, sem conta direta: a LETRA que eu obtive resolvendo so pelo enunciado
// (sem olhar o gabarito). Conferencia por leitura, menos forte que a conta acima.
export const LIDAS = {
  b06_q06: 'B', b06_q10: 'C', b06_q11: 'B', b06_q12: 'B', b06_q13: 'A', b06_q15: 'D'
};
