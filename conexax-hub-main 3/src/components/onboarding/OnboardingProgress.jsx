import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle, Play } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const phaseLabels = {
  kickoff: 'Kickoff',
  setup: 'Setup',
  training: 'Treinamento',
  golive: 'Go Live',
  completed: 'Concluído'
};

export default function OnboardingProgress({ clientId }) {
  const queryClient = useQueryClient();

  const { data: onboarding } = useQuery({
    queryKey: ['onboarding', clientId],
    queryFn: async () => {
      const results = await base44.entities.ClientOnboarding.filter({ client_id: clientId });
      return results[0] || null;
    }
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['onboarding-tasks', clientId],
    queryFn: () => base44.entities.OnboardingTask.filter({ client_id: clientId }),
    enabled: !!clientId
  });

  const startOnboardingMutation = useMutation({
    mutationFn: () => base44.functions.invoke('startClientOnboarding', { clientId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding', clientId] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-tasks', clientId] });
      toast.success('Onboarding iniciado com sucesso!');
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, status }) => base44.entities.OnboardingTask.update(taskId, { 
      status,
      completed_date: status === 'completed' ? new Date().toISOString() : null
    }),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-tasks', clientId] });
      
      // Recalcular progresso
      const updatedTasks = await base44.entities.OnboardingTask.filter({ client_id: clientId });
      const completed = updatedTasks.filter(t => t.status === 'completed').length;
      const total = updatedTasks.length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      if (onboarding) {
        await base44.entities.ClientOnboarding.update(onboarding.id, {
          tasks_completed: completed,
          progress_percentage: percentage,
          status: percentage === 100 ? 'completed' : 'in_progress',
          actual_completion_date: percentage === 100 ? new Date().toISOString().split('T')[0] : null
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['onboarding', clientId] });
      toast.success('Tarefa atualizada!');
    }
  });

  if (!onboarding) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Onboarding</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-slate-500 mb-4">Nenhum processo de onboarding iniciado</p>
            <Button 
              onClick={() => startOnboardingMutation.mutate()}
              disabled={startOnboardingMutation.isPending}
              className="bg-[#355340]"
            >
              <Play className="h-4 w-4 mr-2" />
              Iniciar Onboarding
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tasksByPhase = {
    kickoff: tasks.filter(t => t.phase === 'kickoff'),
    setup: tasks.filter(t => t.phase === 'setup'),
    training: tasks.filter(t => t.phase === 'training'),
    golive: tasks.filter(t => t.phase === 'golive')
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Onboarding</CardTitle>
          <Badge variant={
            onboarding.status === 'completed' ? 'default' :
            onboarding.status === 'delayed' ? 'destructive' : 'secondary'
          }>
            {onboarding.status === 'completed' ? 'Concluído' :
             onboarding.status === 'delayed' ? 'Atrasado' :
             onboarding.status === 'in_progress' ? 'Em Andamento' : 'Não Iniciado'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-600">Progresso Geral</span>
            <span className="font-semibold">{onboarding.progress_percentage || 0}%</span>
          </div>
          <Progress value={onboarding.progress_percentage || 0} className="h-2" />
          <div className="flex justify-between text-xs text-slate-500 mt-2">
            <span>Início: {onboarding.start_date ? format(new Date(onboarding.start_date), 'dd/MM/yyyy') : '-'}</span>
            <span>Previsão: {onboarding.expected_completion_date ? format(new Date(onboarding.expected_completion_date), 'dd/MM/yyyy') : '-'}</span>
          </div>
        </div>

        {/* Current Phase */}
        <div className="bg-slate-50 rounded-lg p-4">
          <p className="text-sm text-slate-600">Fase Atual</p>
          <p className="text-lg font-semibold text-slate-900">{phaseLabels[onboarding.current_phase]}</p>
        </div>

        {/* Tasks by Phase */}
        <div className="space-y-4">
          {Object.entries(tasksByPhase).map(([phase, phaseTasks]) => {
            const completedTasks = phaseTasks.filter(t => t.status === 'completed').length;
            
            return (
              <div key={phase} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-slate-700">{phaseLabels[phase]}</h4>
                  <span className="text-xs text-slate-500">{completedTasks}/{phaseTasks.length}</span>
                </div>
                <div className="space-y-1">
                  {phaseTasks.sort((a, b) => a.order - b.order).map(task => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div>
                          {task.status === 'completed' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : task.status === 'in_progress' ? (
                            <Clock className="h-4 w-4 text-blue-600" />
                          ) : task.status === 'blocked' ? (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-800">{task.title}</p>
                          {task.due_date && (
                            <p className="text-xs text-slate-500">
                              Prazo: {format(new Date(task.due_date), 'dd/MM/yyyy')}
                            </p>
                          )}
                        </div>
                      </div>
                      {task.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateTaskMutation.mutate({ taskId: task.id, status: 'completed' })}
                        >
                          Concluir
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}