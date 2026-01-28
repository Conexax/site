import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X } from "lucide-react";

export default function ReportFilters({ filters, onFiltersChange }) {
  const handleFilterChange = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  const hasFilters = Object.keys(filters).length > 0;

  return (
    <Card className="bg-slate-50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="h-4 w-4 text-slate-500" />
          <p className="font-semibold text-slate-900">Filtros</p>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">
                Período
              </label>
              <Select value={filters.period || 'month'} onValueChange={(value) => handleFilterChange('period', value)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Esta Semana</SelectItem>
                  <SelectItem value="month">Este Mês</SelectItem>
                  <SelectItem value="quarter">Este Trimestre</SelectItem>
                  <SelectItem value="year">Este Ano</SelectItem>
                  <SelectItem value="all">Todos os Períodos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">
                Status
              </label>
              <Select value={filters.status || ''} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Todos</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">
                Segmento
              </label>
              <Input
                placeholder="Filtrar..."
                value={filters.segment || ''}
                onChange={(e) => handleFilterChange('segment', e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            {hasFilters && (
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-8 text-xs gap-1"
                >
                  <X className="h-3 w-3" />
                  Limpar Filtros
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}