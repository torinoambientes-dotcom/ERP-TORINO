'use client';

import { useContext, useMemo, useState, useEffect } from 'react';
import { AppContext } from '@/context/app-context';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getInitials } from '@/lib/utils';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  parseISO, 
  isWithinInterval,
  addDays,
  isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TeamMember, Priority, CalendarTask } from '../calendar/page';
import { CalendarIcon, Flag, Clock, User, CheckCircle2 } from 'lucide-react';
import { STAGE_STATUSES } from '@/lib/types';

const priorityMap: Record<Priority, { label: string; className: string }> = {
    low: { label: 'Baixa', className: 'text-gray-400' },
    medium: { label: 'Média', className: 'text-yellow-500' },
    high: { label: 'Alta', className: 'text-red-500' },
};

export default function WeeklySchedulePage() {
  const { projects, teamMembers, appointments, tasks, isLoading } = useContext(AppContext);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const weekRange = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1, locale: ptBR });
    const end = endOfWeek(now, { weekStartsOn: 1, locale: ptBR });
    return { start, end };
  }, []);

  const daysOfWeek = useMemo(() => {
    return eachDayOfInterval({ start: weekRange.start, end: weekRange.end });
  }, [weekRange]);

  const memberMap = useMemo(() => {
    const map = new Map<string, TeamMember>();
    teamMembers.forEach(member => map.set(member.id, member));
    return map;
  }, [teamMembers]);

  const weeklyActivities = useMemo(() => {
    if (isLoading) return [];

    const activities: CalendarTask[] = [];

    // 1. Project Stages
    projects.forEach(project => {
      project.environments.forEach(env => {
        env.furniture.forEach(fur => {
          (['measurement', 'cutting', 'purchase', 'assembly'] as const).forEach(stageKey => {
            const stage = fur[stageKey];
            if (stage?.scheduledFor) {
              const date = parseISO(stage.scheduledFor);
              if (isWithinInterval(date, { start: weekRange.start, end: weekRange.end })) {
                const responsible = (stage.responsibleIds || [])
                  .map(id => memberMap.get(id))
                  .filter((m): m is TeamMember => !!m);

                activities.push({
                  id: `${fur.id}-${stageKey}`,
                  type: 'project',
                  title: `${fur.name} (${project.clientName})`,
                  subtitle: `Etapa: ${STAGE_STATUSES[stageKey]}`,
                  responsible,
                  date,
                  start: date,
                  end: date,
                  priority: stage.priority || 'medium',
                  rawData: { projectId: project.id, envId: env.id, furId: fur.id, stageKey },
                });
              }
            }
          });
        });
      });
    });

    // 2. Appointments
    appointments.forEach(apt => {
      if (apt.start) {
        const date = parseISO(apt.start);
        if (isWithinInterval(date, { start: weekRange.start, end: weekRange.end })) {
          const responsible = (apt.memberIds || [])
            .map(id => memberMap.get(id))
            .filter((m): m is TeamMember => !!m);

          activities.push({
            id: apt.id,
            type: 'appointment',
            title: apt.title,
            subtitle: apt.description,
            responsible,
            date,
            start: date,
            end: parseISO(apt.end),
            priority: 'medium',
            rawData: { appointmentId: apt.id },
          });
        }
      }
    });

    // 3. Generic Tasks
    (tasks || []).forEach(task => {
      if (task.dueDate) {
        const date = parseISO(task.dueDate);
        if (isWithinInterval(date, { start: weekRange.start, end: weekRange.end })) {
          const responsible = (task.assigneeIds || [])
            .map(id => memberMap.get(id))
            .filter((m): m is TeamMember => !!m);

          activities.push({
            id: task.id,
            type: 'task',
            title: task.title,
            subtitle: task.description,
            responsible,
            date,
            start: date,
            end: date,
            priority: task.priority || 'medium',
            rawData: { taskId: task.id },
          });
        }
      }
    });

    return activities.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [projects, appointments, tasks, isLoading, memberMap, weekRange]);

  if (!isClient || isLoading) {
    return <div className="flex h-full w-full items-center justify-center p-12">Carregando programação...</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Programação Semanal"
        description={`Atividades planeadas de ${format(weekRange.start, "dd 'de' MMMM", { locale: ptBR })} a ${format(weekRange.end, "dd 'de' MMMM", { locale: ptBR })}.`}
      />

      <div className="grid grid-cols-1 gap-6">
        {daysOfWeek.map(day => {
          const dayActivities = weeklyActivities.filter(a => isSameDay(a.date, day));
          const activeToday = isToday(day);

          return (
            <Card key={day.toISOString()} className={cn(activeToday && "border-primary shadow-md")}>
              <CardHeader className={cn("py-4", activeToday && "bg-primary/5")}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex flex-col items-center justify-center w-12 h-12 rounded-lg border",
                      activeToday ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground"
                    )}>
                      <span className="text-xs uppercase font-bold">{format(day, 'EEE', { locale: ptBR })}</span>
                      <span className="text-lg font-bold leading-none">{format(day, 'dd')}</span>
                    </div>
                    <div>
                      <CardTitle className="text-xl capitalize">
                        {format(day, 'eeee', { locale: ptBR })}
                        {activeToday && <span className="ml-2 text-sm font-normal text-primary">(Hoje)</span>}
                      </CardTitle>
                      <CardDescription>
                        {dayActivities.length} atividade(s) agendada(s)
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {dayActivities.length > 0 ? (
                  <div className="space-y-3 mt-2">
                    {dayActivities.map(activity => (
                      <div 
                        key={activity.id} 
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-md bg-muted/30 border gap-4"
                      >
                        <div className="flex items-start gap-3 flex-grow">
                          <div className={cn(
                            "w-1 h-10 rounded-full shrink-0",
                            activity.type === 'project' ? "bg-blue-500" : activity.type === 'appointment' ? "bg-purple-500" : "bg-orange-500"
                          )} />
                          <div className="overflow-hidden">
                            <p className="font-semibold text-base truncate">{activity.title}</p>
                            <p className="text-sm text-muted-foreground truncate">{activity.subtitle}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-end">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-background border px-2 py-1 rounded">
                            <Clock className="h-3.5 w-3.5" />
                            {activity.type === 'appointment' ? `${format(activity.start, 'HH:mm')} - ${format(activity.end, 'HH:mm')}` : 'Dia todo'}
                          </div>
                          
                          {activity.priority && (
                            <Flag className={cn("h-4 w-4", priorityMap[activity.priority].className)} />
                          )}

                          <div className="flex items-center -space-x-2">
                            {activity.responsible.map(member => (
                              <Avatar key={member.id} className="h-7 w-7 border-2 border-background">
                                {member.avatarUrl && <AvatarImage src={member.avatarUrl} />}
                                <AvatarFallback style={{ backgroundColor: member.color }} className="text-[10px]">
                                  {getInitials(member.name)}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {activity.responsible.length === 0 && <User className="h-5 w-5 text-muted-foreground/50" />}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic py-4 text-center">Nenhuma atividade para este dia.</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
