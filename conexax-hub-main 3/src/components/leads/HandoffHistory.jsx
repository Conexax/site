import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, User } from "lucide-react";

export default function HandoffHistory({ leadId }) {
  const { data: handoffs = [], isLoading } = useQuery({
    queryKey: ['handoff-history', leadId],
    queryFn: async () => {
      const records = await base44.entities.LeadHandoff.filter(
        { lead_id: leadId },
        '-handoff_date'
      );
      return records;
    },
    enabled: !!leadId
  });

  if (isLoading) {
    return <div className="text-sm text-gray-500">Carregando histórico...</div>;
  }

  if (handoffs.length === 0) {
    return <div className="text-sm text-gray-500">Nenhum handoff realizado</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Histórico de Handoffs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {handoffs.map((handoff, idx) => (
            <div key={handoff.id} className="flex gap-4 pb-4 border-b last:border-b-0 last:pb-0">
              <div className="flex-shrink-0 w-8 h-8 bg-[#62997f]/10 rounded-full flex items-center justify-center">
                <span className="text-xs font-semibold text-[#355340]">{idx + 1}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex items-center gap-1 text-sm">
                    <User className="h-4 w-4 text-[#62997f]" />
                    <span className="font-medium">{handoff.from_user_name}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <div className="flex items-center gap-1 text-sm">
                    <User className="h-4 w-4 text-[#62997f]" />
                    <span className="font-medium">{handoff.to_user_name}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-2">
                  {format(new Date(handoff.handoff_date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                </p>
                {handoff.qualification_data && (
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {handoff.qualification_data.fit && (
                      <Badge variant="outline" className="text-xs">
                        Fit: {handoff.qualification_data.fit}
                      </Badge>
                    )}
                    {handoff.qualification_data.segment && (
                      <Badge variant="outline" className="text-xs">
                        {handoff.qualification_data.segment}
                      </Badge>
                    )}
                  </div>
                )}
                {handoff.notes && (
                  <p className="text-xs text-gray-600 italic">
                    "{handoff.notes}"
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}