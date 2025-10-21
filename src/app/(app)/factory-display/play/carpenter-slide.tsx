'use client';
import { useContext, useMemo } from 'react';
import { AppContext } from '@/context/app-context';
import type { TeamMember, ProductionStage } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import type { ExtraProject } from '../page';
import { Separator } from '@/components/ui/separator';
import { isWithinInterval, startOfWeek, endOfWeek, parseISO } from 'date-fns';


interface CarpenterSlideProps {
  marceneiro: TeamMember;
  extraProjects: ExtraProject[];
}

interface TaskItem {
  id: string;
  projectName: string;
  furnitureName: string;
  stageName: string;
  link: string;
}

export function CarpenterSlide({ marceneiro, extraProjects }: CarpenterSlideProps) {
  const { projects } = useContext(AppContext);

  const { tasksInProgress, tasksDone, productivityData } = useMemo(() => {
    const inProgress: TaskItem[] = [];
    const done: TaskItem[] = [];

    const now = new Date();
    const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });
    const endOfThisWeek = endOfWeek(now, { weekStartsOn: 1 });

    (projects || []).forEach((p) => {
      if (p.completedAt) return; // Ignore completed projects

      p.environments.forEach((e) => {
        e.furniture.forEach((f) => {
          (['assembly'] as const).forEach((stageKey) => {
            const stage = f[stageKey] as ProductionStage;
            if (stage?.responsibleIds?.includes(marceneiro.id)) {
              const task: TaskItem = {
                id: `${p.id}-${f.id}-${stageKey}`,
                projectName: p.clientName,
                furnitureName: f.name,
                stageName: 'Pré-Montagem',
                link: `/projects/${p.id}`,
              };
              
              // Tarefas "Em Andamento" são as que estão com esse status, independente da data
              if (stage.status === 'in_progress') {
                inProgress.push(task);
              } 
              // Tarefas "Concluídas" são as que foram finalizadas DENTRO da semana atual
              else if (stage.status === 'done' && stage.completedAt) {
                const completionDate = parseISO(stage.completedAt);
                if (isWithinInterval(completionDate, { start: startOfThisWeek, end: endOfThisWeek })) {
                  done.push(task);
                }
              }
            }
          });
        });
      });
    });

    const productivity = [
      { name: 'Status', 'Em Andamento': inProgress.length, 'Concluído (Semana)': done.length },
    ];

    return {
      tasksInProgress: inProgress,
      tasksDone: done,
      productivityData: productivity,
    };
  }, [projects, marceneiro.id]);

  const { activeExtraProjects, completedExtraProjects } = useMemo(() => {
    const active: ExtraProject[] = [];
    const completed: ExtraProject[] = [];
    (extraProjects || []).forEach(p => {
        if(p.assignedTo.includes(marceneiro.id)){
            if (p.isCompleted) {
                completed.push(p);
            } else {
                active.push(p);
            }
        }
    });
    return { activeExtraProjects: active, completedExtraProjects: completed };
  }, [extraProjects, marceneiro.id]);


  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start h-full">
      <div className="lg:col-span-1 flex flex-col items-center justify-center gap-6 py-8">
        <Avatar className="h-32 w-32 border-4 border-primary">
          {marceneiro.avatarUrl && <AvatarImage src={marceneiro.avatarUrl} alt={marceneiro.name} />}
          <AvatarFallback style={{ backgroundColor: marceneiro.color }} className="text-5xl">
            {getInitials(marceneiro.name)}
          </AvatarFallback>
        </Avatar>
        <h2 className="text-3xl font-bold text-center">{marceneiro.name}</h2>
        <div className="w-full">
            <ResponsiveContainer width="100%" height={150}>
                <BarChart data={productivityData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip
                    cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                    contentStyle={{ backgroundColor: '#333', border: 'none', borderRadius: '0.5rem' }}
                    labelStyle={{ color: '#fff' }}
                />
                <Legend
                    formatter={(value, entry, index) => <span className="text-white">{value}</span>}
                />
                <Bar dataKey="Em Andamento" stackId="a" fill="#3b82f6" name="Em Andamento" />
                <Bar dataKey="Concluído (Semana)" stackId="a" fill="#16a34a" name="Concluído (Semana)" />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>
      <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
        <Card className="bg-gray-800 border-blue-500/50 flex flex-col">
          <CardHeader>
            <CardTitle className="text-blue-400">Em Andamento ({tasksInProgress.length + activeExtraProjects.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow">
            <ScrollArea className="h-full max-h-[65vh]">
              <div className="space-y-4 pr-4">
                {tasksInProgress.map((task) => (
                  <Link href={task.link} key={task.id} className="block p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors">
                    <p className="font-semibold text-white">{task.furnitureName}</p>
                    <p className="text-sm text-gray-400">{task.projectName}</p>
                  </Link>
                ))}
                {activeExtraProjects.length > 0 && tasksInProgress.length > 0 && <hr className="border-gray-600"/>}
                 {activeExtraProjects.map((project) => (
                  <div key={project.id} className="p-3 bg-amber-800/30 rounded-lg border border-amber-600/50">
                    <p className="font-bold text-amber-200">{project.name}</p>
                    <p className="text-sm text-amber-300/80 whitespace-pre-wrap">{project.description}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-green-500/50 flex flex-col">
          <CardHeader>
            <CardTitle className="text-green-400">Concluído (Semana) ({tasksDone.length + completedExtraProjects.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow">
             <ScrollArea className="h-full max-h-[65vh]">
                <div className="space-y-3 pr-4">
                    {tasksDone.map((task) => (
                    <Link href={task.link} key={task.id} className="block p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors">
                        <p className="font-semibold text-white line-through">{task.furnitureName}</p>
                        <p className="text-sm text-gray-400">{task.projectName}</p>
                    </Link>
                    ))}
                    {completedExtraProjects.length > 0 && tasksDone.length > 0 && <Separator className="my-3 bg-gray-600" />}
                    {completedExtraProjects.map((project) => (
                        <div key={project.id} className="p-3 bg-gray-700/50 rounded-lg">
                           <p className="font-semibold text-white line-through">{project.name}</p>
                           <p className="text-sm text-gray-400 whitespace-pre-wrap line-through">{project.description}</p>
                        </div>
                    ))}
                </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
