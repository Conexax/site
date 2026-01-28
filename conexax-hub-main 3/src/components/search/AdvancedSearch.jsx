import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, X, Filter, Save, Bookmark } from "lucide-react";
import { Label } from "@/components/ui/label";

export default function AdvancedSearch({ 
  fields, 
  onSearch, 
  savedFilters = [],
  onSaveFilter,
  onLoadFilter,
  onDeleteFilter 
}) {
  const [searchFields, setSearchFields] = useState({});
  const [filterName, setFilterName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const handleFieldChange = (fieldKey, value) => {
    const newFields = { ...searchFields, [fieldKey]: value };
    setSearchFields(newFields);
    onSearch(newFields);
  };

  const handleClearField = (fieldKey) => {
    const newFields = { ...searchFields };
    delete newFields[fieldKey];
    setSearchFields(newFields);
    onSearch(newFields);
  };

  const handleClearAll = () => {
    setSearchFields({});
    onSearch({});
  };

  const handleSaveFilter = () => {
    if (filterName.trim()) {
      onSaveFilter({ name: filterName, filters: searchFields });
      setFilterName("");
      setShowSaveDialog(false);
    }
  };

  const handleLoadFilter = (filter) => {
    setSearchFields(filter.filters);
    onSearch(filter.filters);
  };

  const activeFiltersCount = Object.keys(searchFields).filter(k => searchFields[k]).length;

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Busca Avançada
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-4" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Filtros Avançados</h4>
                {activeFiltersCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleClearAll}
                    className="h-7 text-xs"
                  >
                    Limpar tudo
                  </Button>
                )}
              </div>

              {fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label className="text-xs font-medium">{field.label}</Label>
                  {field.type === "text" && (
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        value={searchFields[field.key] || ""}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="pl-8 h-9 text-sm"
                      />
                      {searchFields[field.key] && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                          onClick={() => handleClearField(field.key)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                  {field.type === "select" && (
                    <Select
                      value={searchFields[field.key] || "all"}
                      onValueChange={(v) => handleFieldChange(field.key, v === "all" ? "" : v)}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {field.options.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {field.type === "date" && (
                    <Input
                      type="date"
                      value={searchFields[field.key] || ""}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      className="h-9 text-sm"
                    />
                  )}
                </div>
              ))}

              {onSaveFilter && activeFiltersCount > 0 && (
                <div className="pt-3 border-t">
                  {!showSaveDialog ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSaveDialog(true)}
                      className="w-full"
                    >
                      <Save className="h-3.5 w-3.5 mr-2" />
                      Salvar Filtro
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        placeholder="Nome do filtro..."
                        value={filterName}
                        onChange={(e) => setFilterName(e.target.value)}
                        className="h-8 text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleSaveFilter}
                          disabled={!filterName.trim()}
                          className="flex-1 h-7 text-xs"
                        >
                          Salvar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowSaveDialog(false);
                            setFilterName("");
                          }}
                          className="h-7 text-xs"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {savedFilters && savedFilters.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Bookmark className="h-4 w-4" />
                Filtros Salvos ({savedFilters.length})
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <div className="space-y-1">
                {savedFilters.map((filter, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 hover:bg-slate-50 rounded group"
                  >
                    <button
                      onClick={() => handleLoadFilter(filter)}
                      className="flex-1 text-left text-sm font-medium"
                    >
                      {filter.name}
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      onClick={() => onDeleteFilter(idx)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(searchFields).map(([key, value]) => {
              if (!value) return null;
              const field = fields.find(f => f.key === key);
              return (
                <Badge key={key} variant="secondary" className="gap-1 pr-1">
                  <span className="text-xs">
                    {field?.label}: {field?.type === "select" 
                      ? field.options.find(o => o.value === value)?.label 
                      : value}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => handleClearField(key)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}