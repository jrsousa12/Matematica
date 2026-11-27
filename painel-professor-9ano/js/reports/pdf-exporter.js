// PDF em paisagem com jsPDF + autoTable (sem gráficos). As bibliotecas só são carregadas ao gerar o PDF.

import { COLUNAS } from './dados-relatorio.js';

function carregar(src) {
  return new Promise((ok, falha) => {
    const s = Object.assign(document.createElement('script'), { src });
    s.onload = ok;
    s.onerror = () => falha(new Error(`Não foi possível carregar ${src}`));
    document.head.append(s);
  });
}

async function garantirBibliotecas() {
  if (!window.jspdf) await carregar('vendor/jspdf.umd.min.js');
  if (!window.jspdf.jsPDF.API.autoTable) await carregar('vendor/jspdf.plugin.autotable.min.js');
  return window.jspdf.jsPDF;
}

const COR_SITUACAO = { 'Em dia': [220, 242, 225], 'Atenção': [255, 243, 205], 'Em risco': [248, 215, 218] };

export async function gerarPdf({ titulo, geradoEm, linhas, nome }) {
  const JsPDF = await garantirBibliotecas();
  const doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFontSize(14);
  doc.text('Relatório da turma - Matemática 9º ano', 14, 14);
  doc.setFontSize(9);
  doc.text(titulo, 14, 20);
  doc.text(`Gerado em ${geradoEm}. ${linhas.length} aluno(s).`, 14, 25);
  doc.autoTable({
    head: [COLUNAS], body: linhas, startY: 29,
    styles: { fontSize: 7, cellPadding: 1.2 },
    headStyles: { fillColor: [60, 70, 90] },
    didParseCell: (d) => {
      if (d.section === 'body' && d.column.index === 2) d.cell.styles.fillColor = COR_SITUACAO[d.cell.raw] ?? [255, 255, 255];
    }
  });
  doc.save(nome);
}
