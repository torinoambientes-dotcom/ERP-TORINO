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
              
              if (stage.status === 'in_progress') {
                inProgress.push(task);
              } 
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
    <div className="flex flex-col h-full gap-6">
      {/* Top Section: Carpenter Info */}
      <div className="flex flex-col items-center justify-center gap-4 pt-4 flex-shrink-0">
        <Avatar className="h-28 w-28 border-4 border-primary">
          {marceneiro.avatarUrl && <AvatarImage src={marceneiro.avatarUrl} alt={marceneiro.name} />}
          <AvatarFallback style={{ backgroundColor: marceneiro.color }} className="text-4xl">
            {getInitials(marceneiro.name)}
          </AvatarFallback>
        </Avatar>
        <h2 className="text-4xl font-bold text-center">{marceneiro.name}</h2>
      </div>
      
      {/* Middle Section: Task Lists */}
      <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-8 min-h-0">
        <Card className="bg-gray-800 border-blue-500/50 flex flex-col">
          <CardHeader>
            <CardTitle className="text-blue-400 text-3xl">Em Andamento ({tasksInProgress.length + activeExtraProjects.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-4 pr-4">
                {tasksInProgress.map((task) => (
                  <Link href={task.link} key={task.id} className="block p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors">
                    <p className="font-semibold text-white text-xl">{task.furnitureName}</p>
                    <p className="text-lg text-gray-400">{task.projectName}</p>
                  </Link>
                ))}
                {activeExtraProjects.length > 0 && tasksInProgress.length > 0 && <hr className="border-gray-600"/>}
                 {activeExtraProjects.map((project) => (
                  <div key={project.id} className="p-4 bg-amber-800/30 rounded-lg border border-amber-600/50">
                    <p className="font-bold text-amber-200 text-xl">{project.name}</p>
                    <p className="text-lg text-amber-300/80 whitespace-pre-wrap">{project.description}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-green-500/50 flex flex-col">
          <CardHeader>
            <CardTitle className="text-green-400 text-3xl">Concluído (Semana) ({tasksDone.length + completedExtraProjects.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden">
             <ScrollArea className="h-full">
                <div className="space-y-3 pr-4">
                    {tasksDone.map((task) => (
                    <Link href={task.link} key={task.id} className="block p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors">
                        <p className="font-semibold text-white line-through text-xl">{task.furnitureName}</p>
                        <p className="text-lg text-gray-400">{task.projectName}</p>
                    </Link>
                    ))}
                    {completedExtraProjects.length > 0 && tasksDone.length > 0 && <Separator className="my-3 bg-gray-600" />}
                    {completedExtraProjects.map((project) => (
                        <div key={project.id} className="p-4 bg-gray-700/50 rounded-lg">
                           <p className="font-semibold text-white line-through text-xl">{project.name}</p>
                           <p className="text-lg text-gray-400 whitespace-pre-wrap line-through">{project.description}</p>
                        </div>
                    ))}
                </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Chart */}
      <div className="flex-shrink-0 w-full max-w-lg mx-auto pb-4">
        <ResponsiveContainer width="100%" height={80}>
            <BarChart data={productivityData} layout="vertical" margin={{ left: 20 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip
                cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                contentStyle={{ backgroundColor: '#333', border: 'none', borderRadius: '0.5rem' }}
                labelStyle={{ color: '#fff' }}
            />
            <Legend
                wrapperStyle={{ bottom: -10 }}
                formatter={(value) => <span className="text-white text-sm">{value}</span>}
            />
            <Bar dataKey="Em Andamento" stackId="a" fill="#3b82f6" name="Em Andamento" />
            <Bar dataKey="Concluído (Semana)" stackId="a" fill="#16a34a" name="Concluído (Semana)" />
            </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
