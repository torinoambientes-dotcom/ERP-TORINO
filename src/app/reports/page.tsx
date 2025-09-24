'use client';
import { useContext, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { PageHeader } from '@/components/layout/page-header';
import { AppContext } from '@/context/app-context';
import type { StageStatus } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


export default function ReportsPage() {
  const { projects, teamMembers } = useContext(AppContext);

  const stats = useMemo(() => {
    let completedProjects = 0;
    let ongoingProjects = 0;
    const tasksByMember: { [key: string]: { todo: number; in_progress: number; done: number; } } = {};
  
    teamMembers.forEach(member => {
      tasksByMember[member.id] = { todo: 0, in_progress: 0, done: 0 };
    });

    projects.forEach((project) => {
      let isCompleted = true;
      let hasStarted = false;

      project.environments.forEach((env) => {
        env.furniture.forEach((fur) => {
          (Object.keys(fur) as (keyof typeof fur)[]).forEach((key) => {
            if (['measurement', 'cutting', 'purchase', 'assembly'].includes(key)) {
              const stage = fur[key as 'measurement'];
              if (stage.status !== 'done') isCompleted = false;
              if (stage.status !== 'todo') hasStarted = true;
              if (stage.responsibleId && tasksByMember[stage.responsibleId]) {
                 tasksByMember[stage.responsibleId][stage.status]++;
              }
            }
          });
        });
      });

      if (isCompleted) {
        completedProjects++;
      } else if (hasStarted) {
        ongoingProjects++;
      }
    });

    const chartData = teamMembers.map(member => ({
        name: member.name,
        'A Fazer': tasksByMember[member.id]?.todo || 0,
        'Em Andamento': tasksByMember[member.id]?.in_progress || 0,
        'Concluído': tasksByMember[member.id]?.done || 0,
    }));


    return {
      totalProjects: projects.length,
      completedProjects,
      ongoingProjects,
      pendingProjects: projects.length - completedProjects - ongoingProjects,
      chartData,
    };
  }, [projects, teamMembers]);
  
  const memberMap = useMemo(() => {
    return new Map(teamMembers.map(m => [m.id, m]));
  }, [teamMembers]);
  
  const allTasks: { stage: string, fur: string, env: string, project: string, memberId?: string, status: StageStatus }[] = [];
  projects.forEach(p => {
    p.environments.forEach(e => {
        e.furniture.forEach(f => {
            allTasks.push({stage: 'Medição', fur: f.name, env: e.name, project: p.clientName, memberId: f.measurement.responsibleId, status: f.measurement.status });
            allTasks.push({stage: 'Plano de Corte', fur: f.name, env: e.name, project: p.clientName, memberId: f.cutting.responsibleId, status: f.cutting.status });
            allTasks.push({stage: 'Compra Material', fur: f.name, env: e.name, project: p.clientName, memberId: f.purchase.responsibleId, status: f.purchase.status });
            allTasks.push({stage: 'Pré Montagem', fur: f.name, env: e.name, project: p.clientName, memberId: f.assembly.responsibleId, status: f.assembly.status });
        });
    });
  });

  const pendingTasks = allTasks.filter(t => t.status === 'in_progress' || t.status === 'todo');

  return (
    <div className="space-y-8">
      <PageHeader
        title="Relatórios"
        description="Acompanhe a produtividade e o andamento dos projetos."
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Projetos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos em Andamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ongoingProjects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos Concluídos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedProjects}</div>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingProjects}</div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="font-headline">Produtividade da Equipe</CardTitle>
            <CardDescription>Distribuição de tarefas por membro da equipe.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={stats.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="A Fazer" fill="hsl(var(--secondary))" stackId="a" />
                <Bar dataKey="Em Andamento" fill="hsl(var(--accent))" stackId="a" />
                <Bar dataKey="Concluído" fill="hsl(var(--primary))" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="font-headline">Pendências Gerais</CardTitle>
            <CardDescription>Lista de todas as tarefas com status 'A Fazer' ou 'Em Andamento'.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="space-y-4 max-h-96 overflow-y-auto">
              {pendingTasks.map((task, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                  <div>
                    <p className="font-semibold">{task.stage}: {task.fur}</p>
                    <p className="text-sm text-muted-foreground">{task.project} / {task.env}</p>
                  </div>
                   {task.memberId && memberMap.has(task.memberId) && (
                    <div className="flex items-center gap-2">
                       <span className={`text-xs font-semibold px-2 py-1 rounded-full ${task.status === 'todo' ? 'bg-yellow-200 text-yellow-800' : 'bg-blue-200 text-blue-800'}`}>
                        {task.status === 'todo' ? 'A Fazer' : 'Em Andamento'}
                       </span>
                      <Avatar className="h-8 w-8">
                         <AvatarImage src={memberMap.get(task.memberId)?.avatarUrl} />
                         <AvatarFallback>{memberMap.get(task.memberId)?.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{memberMap.get(task.memberId)?.name}</span>
                    </div>
                  )}
                </div>
              ))}
              {pendingTasks.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Nenhuma pendência encontrada!</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
