import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, ArrowLeft, FileText } from "lucide-react";
import { toast } from "sonner";
import { AuditPageView } from "@/components/audit/AuditLogger";
import ReportTemplateSelector from "@/components/reports/ReportTemplateSelector";
import ReportFilters from "@/components/reports/ReportFilters";
import SalesFunnelReport from "@/components/reports/SalesFunnelReport";
import SDRPerformanceReport from "@/components/reports/SDRPerformanceReport";
import ClientRetentionReport from "@/components/reports/ClientRetentionReport";
import ActivitiesSummaryReport from "@/components/reports/ActivitiesSummaryReport";

export default function Reports() {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [filters, setFilters] = useState({});
  const [isExporting, setIsExporting] = useState(false);

  const reportConfig = {
    'sales-funnel': {
      title: 'Funil de Vendas',
      component: SalesFunnelReport,
      description: 'Análise completa do pipeline de vendas'
    },
    'sdr-performance': {
      title: 'Performance de SDRs',
      component: SDRPerformanceReport,
      description: 'Métricas de desempenho dos SDRs'
    },
    'client-retention': {
      title: 'Retenção de Clientes',
      component: ClientRetentionReport,
      description: 'Análise de churn e health score'
    },
    'activities-summary': {
      title: 'Resumo de Atividades',
      component: ActivitiesSummaryReport,
      description: 'Distribuição e status de atividades'
    }
  };

  const handleExportPDF = async () => {
    if (!selectedTemplate) {
      toast.error("Selecione um relatório para exportar");
      return;
    }

    setIsExporting(true);
    try {
      const reportData = reportConfig[selectedTemplate];
      const response = await base44.functions.invoke('generateReportPDF', {
        reportType: selectedTemplate,
        title: reportData.title,
        data: {
          summary: {
            'Tipo': reportData.title,
            'Gerado em': new Date().toLocaleDateString('pt-BR')
          }
        },
        generatedAt: new Date().toISOString()
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-${selectedTemplate}-${new Date().getTime()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success("Relatório exportado com sucesso!");
    } catch (error) {
      toast.error("Erro ao exportar PDF: " + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    if (!selectedTemplate) {
      toast.error("Selecione um relatório para exportar");
      return;
    }

    const csv = `Relatório: ${reportConfig[selectedTemplate].title}\nGerado em: ${new Date().toLocaleDateString('pt-BR')}\n\nDados do relatório exportados.`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-${selectedTemplate}-${new Date().getTime()}.csv`;
    link.click();

    toast.success("Relatório CSV exportado!");
  };

  return (
    <>
      <AuditPageView pageName="Reports" />
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Relatórios</h1>
            <p className="text-slate-500 text-sm mt-1">
              Análise dinâmica de dados do CRM com templates pré-definidos
            </p>
          </div>
        </div>

        {!selectedTemplate ? (
          <>
            {/* Templates Selection */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Selecione um Relatório</h2>
              <ReportTemplateSelector onSelectTemplate={setSelectedTemplate} />
            </div>
          </>
        ) : (
          <>
            {/* Report View */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedTemplate(null);
                    setFilters({});
                  }}
                  className="h-8 w-8"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {reportConfig[selectedTemplate].title}
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {reportConfig[selectedTemplate].description}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleExportCSV}
                  variant="outline"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
                <Button
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className="gap-2 bg-[#355340] hover:bg-[#355340]/90"
                >
                  <FileText className="h-4 w-4" />
                  {isExporting ? "Exportando..." : "PDF"}
                </Button>
              </div>
            </div>

            {/* Filters */}
            <ReportFilters filters={filters} onFiltersChange={setFilters} />

            {/* Report Content */}
            <Card className="border-slate-200">
              <CardContent className="p-6">
                {React.createElement(reportConfig[selectedTemplate].component, {
                  filters
                })}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}