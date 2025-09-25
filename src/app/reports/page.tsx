'use client';
import { useContext, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/layout/page-header';
import { AppContext } from '@/context/app-context';
import type { StageStatus } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

export default function ReportsPage() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('ReportsPage must be used within an AppProvider');
  }
  const { projects, teamMembers } = context;

  const [selectedMemberId, setSelectedMemberId] = useState('all');

  const projectStats = useMemo(() => {
    let completedProjects = 0;
    let ongoingProjects = 0;

    projects.forEach((project) => {
      let totalTasks = 0;
      let doneTasks = 0;
      let hasStarted = false;

      project.environments.forEach((env) => {
        env.furniture.forEach((fur) => {
          const stages = ['measurement', 'cutting', 'purchase', 'assembly'] as const;
          stages.forEach((key) => {
            totalTasks++;
            const stage = fur[key];
            if (stage.status === 'done') doneTasks++;
            if (stage.status !== 'todo') hasStarted = true;
          });
        });
      });

      if (totalTasks > 0 && totalTasks === doneTasks) {
        completedProjects++;
      } else if (hasStarted) {
        ongoingProjects++;
      }
    });

    return {
      totalProjects: projects.length,
      completedProjects,
      ongoingProjects,
      pendingProjects: projects.length - completedProjects - ongoingProjects,
    };
  }, [projects]);

  const memberMap = useMemo(() => {
    return new Map(teamMembers.map((m) => [m.id, m]));
  }, [teamMembers]);

  const filteredTasks = useMemo(() => {
    const allTasks: {
      id: string;
      stage: string;
      fur: string;
      env: string;
      project: string;
      memberId?: string;
      status: StageStatus;
    }[] = [];

    projects.forEach((p) => {
      p.environments.forEach((e) => {
        e.furniture.forEach((f) => {
            const stages = {
                measurement: 'Medição',
                cutting: 'Plano de Corte',
                purchase: 'Compra Material',
                assembly: 'Pré Montagem',
            } as const;

            Object.entries(stages).forEach(([key, label]) => {
                const stageKey = key as keyof typeof stages;
                allTasks.push({
                    id: `${p.id}-${e.id}-${f.id}-${stageKey}`,
                    stage: label,
                    fur: f.name,
                    env: e.name,
                    project: p.clientName,
                    memberId: f[stageKey].responsibleId,
                    status: f[stageKey].status,
                });
            });
        });
      });
    });

    const filtered =
      selectedMemberId === 'all'
        ? allTasks
        : allTasks.filter((task) => task.memberId === selectedMemberId);

    return {
      todo: filtered.filter(t => t.status === 'todo'),
      in_progress: filtered.filter(t => t.status === 'in_progress'),
      done: filtered.filter(t => t.status === 'done')
    }
  }, [projects, selectedMemberId]);


  return (
    <div className="space-y-8">
      <PageHeader
        title="Relatórios"
        description="Acompanhe a produtividade e o andamento dos projetos."
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Projetos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectStats.totalProjects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Projetos em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectStats.ongoingProjects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Projetos Concluídos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectStats.completedProjects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Projetos Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectStats.pendingProjects}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Atividades por Membro</CardTitle>
          <CardDescription>Filtre as tarefas por membro da equipe para ver o que está pendente, em andamento ou concluído.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um membro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os membros</SelectItem>
                <Separator />
                {teamMembers.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full" style={{ backgroundColor: member.color }}></span>
                      <span>{member.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h3 className="font-headline text-lg font-semibold text-amber-600">A Fazer ({filteredTasks.todo.length})</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {filteredTasks.todo.length > 0 ? filteredTasks.todo.map((task) => (
                  <div key={task.id} className="p-3 rounded-md bg-muted/50 border-l-4 border-amber-500">
                    <p className="font-semibold">{task.stage}: {task.fur}</p>
                    <p className="text-sm text-muted-foreground">{task.project} / {task.env}</p>
                  </div>
                )) : <p className="text-sm text-muted-foreground">Nenhuma tarefa.</p>}
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-headline text-lg font-semibold text-blue-600">Em Andamento ({filteredTasks.in_progress.length})</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {filteredTasks.in_progress.length > 0 ? filteredTasks.in_progress.map((task) => (
                  <div key={task.id} className="p-3 rounded-md bg-muted/50 border-l-4 border-blue-500">
                    <p className="font-semibold">{task.stage}: {task.fur}</p>
                    <p className="text-sm text-muted-foreground">{task.project} / {task.env}</p>
                  </div>
                )) : <p className="text-sm text-muted-foreground">Nenhuma tarefa.</p>}
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-headline text-lg font-semibold text-green-600">Concluído ({filteredTasks.done.length})</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {filteredTasks.done.length > 0 ? filteredTasks.done.map((task) => (
                  <div key={task.id} className="p-3 rounded-md bg-muted/50 border-l-4 border-green-500">
                    <p className="font-semibold">{task.stage}: {task.fur}</p>
                    <p className="text-sm text-muted-foreground">{task.project} / {task.env}</p>
                  </div>
                )) : <p className="text-sm text-muted-foreground">Nenhuma tarefa.</p>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
