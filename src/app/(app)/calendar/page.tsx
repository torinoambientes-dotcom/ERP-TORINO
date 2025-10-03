'use client';
import { useMemo, useState, useContext } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { AppContext } from '@/context/app-context';
import type { ProductionStage, TeamMember } from '@/lib/types';
import { PageHeader } from '@/components/layout/page-header';
import { eachDayOfInterval, endOfMonth, format, isSameDay, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { STAGE_STATUSES } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

interface CalendarTask {
  id: string;
  projectId: string;
  projectName: string;
  furnitureName: string;
  stageKey: keyof typeof STAGE_STATUSES;
  stageLabel: string;
  responsible: TeamMember;
  date: Date;
}

export default function CalendarPage() {
  const { projects, teamMembers, isLoading } = useContext(AppContext);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedMemberId, setSelectedMemberId] = useState('all');

  const memberMap = useMemo(() => {
    const map = new Map<string, TeamMember>();
    teamMembers.forEach(member => map.set(member.id, member));
    return map;
  }, [teamMembers]);

  const tasksByDay = useMemo(() => {
    const tasks: { [key: string]: CalendarTask[] } = {};
    if (isLoading) return tasks;

    projects.forEach(project => {
      project.environments.forEach(env => {
        env.furniture.forEach(fur => {
          const stages: (keyof typeof STAGE_STATUSES)[] = ['measurement', 'cutting', 'purchase', 'assembly'];
          stages.forEach(stageKey => {
            const stage = fur[stageKey as keyof typeof fur] as ProductionStage;
            if (stage && stage.scheduledFor && stage.responsibleId) {
              const responsible = memberMap.get(stage.responsibleId);
              if (responsible && (selectedMemberId === 'all' || selectedMemberId === responsible.id)) {
                const date = new Date(stage.scheduledFor);
                const dayKey = format(date, 'yyyy-MM-dd');
                if (!tasks[dayKey]) {
                  tasks[dayKey] = [];
                }
                tasks[dayKey].push({
                  id: `${fur.id}-${stageKey}`,
                  projectId: project.id,
                  projectName: project.clientName,
                  furnitureName: fur.name,
                  stageKey: stage.status,
                  stageLabel: STAGE_STATUSES[stage.status as keyof typeof STAGE_STATUSES],
                  responsible,
                  date,
                });
              }
            }
          });
        });
      });
    });
    return tasks;
  }, [projects, isLoading, memberMap, selectedMemberId]);

  const DayWithTasks = ({ date }: { date: Date }) => {
    const dayKey = format(date, 'yyyy-MM-dd');
    const dailyTasks = tasksByDay[dayKey] || [];

    return (
      <div className="p-2 h-full flex flex-col">
        <time dateTime={dayKey} className="text-right text-sm">
          {format(date, 'd')}
        </time>
        <ul className="mt-1 space-y-1 overflow-y-auto flex-grow">
          {dailyTasks.map(task => (
            <li key={task.id}>
              <Link href={`/projects/${task.projectId}`} className="group block">
                <div className="flex items-center gap-2 p-1.5 rounded-md" style={{ backgroundColor: `${task.responsible.color}20` }}>
                    <Avatar className="h-5 w-5">
                       {task.responsible.avatarUrl && <AvatarImage src={task.responsible.avatarUrl} alt={task.responsible.name} />}
                       <AvatarFallback style={{ backgroundColor: task.responsible.color }} className='text-xs'>
                           {getInitials(task.responsible.name)}
                       </AvatarFallback>
                    </Avatar>
                    <div className="text-xs truncate">
                        <p className="font-medium truncate text-foreground">{task.projectName}</p>
                        <p className="text-muted-foreground truncate">{task.furnitureName}</p>
                    </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  };
  
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p>Carregando calendário...</p>
      </div>
    );
  }


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader
          title="Calendário da Equipe"
          description="Visualize as tarefas agendadas para cada membro da equipe."
        />
        <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
          <SelectTrigger className="w-full sm:w-[280px]">
            <SelectValue placeholder="Filtrar por membro" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">Todos os Membros</div>
            </SelectItem>
            <Separator />
            {teamMembers.map(member => (
              <SelectItem key={member.id} value={member.id}>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt={member.name} />}
                    <AvatarFallback style={{ backgroundColor: member.color }} className='text-xs'>
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{member.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-2">
          <Calendar
            mode="single"
            selected={new Date()}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            locale={ptBR}
            components={{ Day: DayWithTasks }}
            className="w-full"
            classNames={{
              months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 p-4',
              month: 'w-full',
              table: 'w-full border-collapse',
              head_row: 'flex border-b',
              head_cell: 'text-muted-foreground font-normal text-sm w-full text-center py-2',
              row: 'flex w-full mt-2',
              cell: 'h-32 w-full text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md border-t border-l',
              day: 'h-full w-full p-1.5 focus-within:relative focus-within:z-20',
              day_selected: 'bg-accent text-accent-foreground',
              day_today: 'bg-accent text-accent-foreground',
              day_outside: 'text-muted-foreground opacity-50',
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
