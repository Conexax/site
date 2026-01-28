import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { plan_id, client_id, client_data, preview_data } = await req.json();

  if (!plan_id || !client_id || !client_data) {
    return Response.json({ error: 'Parâmetros obrigatórios faltando' }, { status: 400 });
  }

  // Gerar número único do contrato
  const contractNumber = `CT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  // Criar PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Cabeçalho
  doc.setFontSize(16);
  doc.setTextColor(53, 83, 64);
  doc.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 12;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Contrato nº: ${contractNumber}`, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 15;
  doc.setDrawColor(98, 153, 127);
  doc.setLineWidth(0.5);
  doc.line(20, yPosition, pageWidth - 20, yPosition);

  // Dados do cliente
  yPosition += 10;
  doc.setFontSize(12);
  doc.setTextColor(53, 83, 64);
  doc.text('DADOS DO CONTRATANTE', 20, yPosition);

  yPosition += 8;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  
  const clientInfo = [
    `Razão Social: ${client_data.company_name}`,
    `CNPJ: ${client_data.cnpj}`,
    `Responsável: ${client_data.responsible_name}`,
    `E-mail: ${client_data.email}`,
    `Telefone: ${client_data.phone}`
  ];

  clientInfo.forEach(info => {
    doc.text(info, 25, yPosition);
    yPosition += 6;
  });

  // Dados do contrato
  yPosition += 5;
  doc.setFontSize(12);
  doc.setTextColor(53, 83, 64);
  doc.text('DADOS DO CONTRATO', 20, yPosition);

  yPosition += 8;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  const contractInfo = [
    `Data de Início: ${client_data.start_date}`,
    `Valor Mensal: R$ ${preview_data.monthly_value.toLocaleString('pt-BR')}`,
    `Taxa de Setup: R$ ${preview_data.setup_fee.toLocaleString('pt-BR')}`,
    preview_data.discount_percentage > 0 ? `Desconto: ${preview_data.discount_percentage}%` : null,
    `Valor Total: R$ ${preview_data.total_value.toLocaleString('pt-BR')}`
  ].filter(Boolean);

  contractInfo.forEach(info => {
    doc.text(info, 25, yPosition);
    yPosition += 6;
  });

  // Conteúdo do template
  yPosition += 10;
  doc.setFontSize(12);
  doc.setTextColor(53, 83, 64);
  doc.text('TERMOS E CONDIÇÕES', 20, yPosition);

  yPosition += 8;
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  const termosText = 'A prestação de serviços será realizada conforme as especificações acordadas, seguindo todos os termos e condições estabelecidos neste contrato.';
  const termosLines = doc.splitTextToSize(termosText, pageWidth - 40);
  
  termosLines.forEach(line => {
    if (yPosition > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
    }
    doc.text(line, 25, yPosition);
    yPosition += 5;
  });

  // Rodapé
  yPosition = pageHeight - 30;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Documento gerado automaticamente pelo sistema ConexaX', pageWidth / 2, yPosition, { align: 'center' });
  doc.text(`Data de geração: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, yPosition + 5, { align: 'center' });

  // Converter PDF para base64
  const pdfData = doc.output('arraybuffer');

  // Upload do PDF
  const pdfBlob = new Blob([pdfData], { type: 'application/pdf' });
  
  // Simular upload (em produção seria real)
  const fileName = `contrato_${contractNumber}.pdf`;
  
  // Criar registro do contrato
  const generatedContract = await base44.asServiceRole.entities.GeneratedContract.create({
    client_id,
    plan_id,
    contract_number: contractNumber,
    monthly_value: preview_data.monthly_value,
    setup_fee: preview_data.setup_fee,
    discount_percentage: preview_data.discount_percentage,
    validity_months: 12,
    start_date: client_data.start_date,
    status: 'draft',
    generated_by: user.id,
    generated_at: new Date().toISOString(),
    notes: `Contrato gerado automaticamente`
  });

  // Registrar em auditoria
  await base44.asServiceRole.functions.invoke('registerAuditLog', {
    action: 'CREATE_CONTRACT',
    entity_type: 'GeneratedContract',
    entity_id: generatedContract.id,
    entity_name: `Contrato ${contractNumber}`,
    after_snapshot: {
      contract_number: contractNumber,
      client_id,
      plan_id,
      status: 'draft'
    }
  });

  return Response.json({
    success: true,
    contract: generatedContract,
    contract_number: contractNumber,
    pdf_data: Buffer.from(pdfData).toString('base64'),
    message: 'Contrato gerado com sucesso'
  });
});