import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';
import 'npm:html2canvas@1.4.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportType, data, title, generatedAt } = await req.json();

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(53, 83, 64);
    doc.text(title || 'Relatório', 20, yPos);
    yPos += 15;

    // Generated date and user
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`Gerado em: ${new Date(generatedAt).toLocaleDateString('pt-BR')}`, 20, yPos);
    doc.text(`Por: ${user.full_name}`, 20, yPos + 5);
    yPos += 15;

    // Summary cards as text
    if (data.summary) {
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('Resumo', 20, yPos);
      yPos += 8;

      doc.setFontSize(10);
      Object.entries(data.summary).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`, 25, yPos);
        yPos += 6;
      });

      yPos += 5;
    }

    // Details/Table Data
    if (data.details) {
      // Check if we need a new page
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('Detalhes', 20, yPos);
      yPos += 8;

      if (Array.isArray(data.details)) {
        doc.setFontSize(9);
        data.details.slice(0, 20).forEach((item, idx) => {
          if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
          }

          const itemText = typeof item === 'string' ? item : Object.values(item).join(' | ');
          const textLines = doc.splitTextToSize(itemText, pageWidth - 40);
          textLines.forEach(line => {
            doc.text(line, 25, yPos);
            yPos += 5;
          });
        });
      }
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`ConexaX CRM - Página ${doc.getNumberOfPages()}`, pageWidth - 30, pageHeight - 10);

    const pdfBuffer = doc.output('arraybuffer');

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="relatorio-${reportType}-${new Date().getTime()}.pdf"`
      }
    });
  } catch (error) {
    console.error('Erro em generateReportPDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});