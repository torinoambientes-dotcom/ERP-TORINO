'use client';
import { useContext, useMemo } from 'react';
import { AppContext } from '@/context/app-context';
import type { TeamMember, ProductionStage } from '@/lib/types';
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
import { isWithinInterval, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { CheckCircle, Clock } from 'lucide-react';


interface CarpenterSlideProps {
  marceneiro: TeamMember;
  extraProjects: ExtraProject[];
}

interface TaskItem {
  id: string;
  projectName: string;
  furnitureName: string;
  status: 'in_progress' | 'done';
  link: string;
  isExtra: boolean;
}

export function CarpenterSlide({ marceneiro, extraProjects }: CarpenterSlideProps) {
  const { projects } = useContext(AppContext);

  const { allTasks, productivityData } = useMemo(() => {
    const tasks: TaskItem[] = [];
    let inProgressCount = 0;
    let doneCount = 0;

    const now = new Date();
    const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });
    const endOfThisWeek = endOfWeek(now, { weekStartsOn: 1 });

    (projects || []).forEach((p) => {
      if (p.completedAt) return; 

      p.environments.forEach((e) => {
        e.furniture.forEach((f) => {
          (['assembly'] as const).forEach((stageKey) => {
            const stage = f[stageKey] as ProductionStage;
            if (stage?.responsibleIds?.includes(marceneiro.id)) {
              if (stage.status === 'in_progress') {
                tasks.push({
                  id: `${p.id}-${f.id}-${stageKey}`,
                  projectName: p.clientName,
                  furnitureName: f.name,
                  status: 'in_progress',
                  link: `/projects/${p.id}`,
                  isExtra: false,
                });
                inProgressCount++;
              } else if (stage.status === 'done' && stage.completedAt) {
                const completionDate = parseISO(stage.completedAt);
                if (isWithinInterval(completionDate, { start: startOfThisWeek, end: endOfThisWeek })) {
                  tasks.push({
                    id: `${p.id}-${f.id}-${stageKey}`,
                    projectName: p.clientName,
                    furnitureName: f.name,
                    status: 'done',
                    link: `/projects/${p.id}`,
                    isExtra: false,
                  });
                  doneCount++;
                }
              }
            }
          });
        });
      });
    });
    
    tasks.sort((a, b) => {
      if (a.status === 'in_progress' && b.status === 'done') return -1;
      if (a.status === 'done' && b.status === 'in_progress') return 1;
      return a.projectName.localeCompare(b.projectName);
    });

    const productivity = [
      { name: 'Status', 'Em Andamento': inProgressCount, 'Concluído (Semana)': doneCount },
    ];

    return {
      allTasks: tasks,
      productivityData: productivity,
    };
  }, [projects, marceneiro.id]);

  const { activeExtra, completedExtra } = useMemo(() => {
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
    return { activeExtra: active, completedExtra: completed };
  }, [extraProjects, marceneiro.id]);
  
  const combinedTasks: TaskItem[] = [
    ...allTasks.filter(t => t.status === 'in_progress'),
    ...activeExtra.map(p => ({ id: p.id, status: 'in_progress' as const, furnitureName: p.name, projectName: p.description, link: '#', isExtra: true })),
    ...allTasks.filter(t => t.status === 'done'),
    ...completedExtra.map(p => ({ id: p.id, status: 'done' as const, furnitureName: p.name, projectName: p.description, link: '#', isExtra: true }))
  ];

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Top Section: Carpenter Info */}
      <div className="flex flex-col items-center justify-center pt-4 pb-2 flex-shrink-0">
        <h2 className="text-5xl font-bold text-center">{marceneiro.name}</h2>
      </div>
      
      {/* Middle Section: Task List */}
      <div className="flex-grow min-h-0">
        <Card className="bg-gray-800 border-gray-700/50 flex flex-col h-full">
          <CardHeader>
            <CardTitle className="text-white text-3xl">Tarefas Atribuídas</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden flex flex-col">
            <ScrollArea className="h-full">
              <div className="space-y-6 pr-4">
                {combinedTasks.length > 0 ? combinedTasks.map((task) => {
                  const Wrapper = task.isExtra ? 'div' : Link;
                  
                  return (
                    <Wrapper href={task.link} key={task.id} className="block">
                      <div className={`p-4 rounded-lg transition-colors ${
                        task.status === 'in_progress'
                          ? 'bg-gray-700/50 hover:bg-gray-700 border-l-4 border-blue-400'
                          : 'bg-gray-800/60 border-l-4 border-green-500 opacity-70'
                      }`}>
                          <div className='flex items-center gap-3'>
                            {task.status === 'in_progress' ? <Clock className="h-6 w-6 text-blue-300" /> : <CheckCircle className="h-6 w-6 text-green-400" />}
                            <p className={`font-semibold text-white text-3xl ${task.status === 'done' ? 'line-through' : ''}`}>
                               {task.furnitureName}
                            </p>
                          </div>
                          <p className={`text-2xl text-gray-400 pl-9 ${task.status === 'done' ? 'line-through' : ''}`}>
                            {task.projectName}
                          </p>
                      </div>
                    </Wrapper>
                  )
                }) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-center text-gray-400 py-10 text-xl">Nenhuma tarefa para exibir.</p>
                  </div>
                )}
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
