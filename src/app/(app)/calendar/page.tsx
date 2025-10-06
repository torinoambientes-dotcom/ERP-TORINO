'use client';
import { useState, useMemo, useContext } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { AppContext } from '@/context/app-context';
import type { ProductionStage, TeamMember, Appointment, StageStatus } from '@/lib/types';
import { PageHeader } from '@/components/layout/page-header';
import { eachDayOfInterval, endOfWeek, format, isSameDay, startOfWeek, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { STAGE_STATUSES } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, User, Users, X } from 'lucide-react';
import { NewAppointmentModal } from '@/components/modals/new-appointment-modal';
import { AppointmentDetailsModal } from '@/components/modals/appointment-details-modal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface CalendarTask {
  id: string;
  type: 'project' | 'appointment';
  title: string;
  subtitle?: string;
  link?: string;
  responsible: TeamMember[];
  date: Date;
  start: Date;
  end: Date;
  rawData: {
    projectId?: string;
    envId?: string;
    furId?: string;
    stageKey?: keyof typeof STAGE_STATUSES;
    appointmentId?: string;
  }
}

export default function CalendarPage() {
  const { projects, teamMembers, appointments, updateProject, updateAppointment, deleteAppointment, isLoading } = useContext(AppContext);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('all');
  const [isAppointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [isDetailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null);

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
                if (!tasks[dayKey]) tasks[dayKey] = [];
                tasks[dayKey].push({
                  id: `${fur.id}-${stageKey}`, type: 'project', title: `${fur.name} (${project.clientName})`,
                  subtitle: `Etapa: ${STAGE_STATUSES[stageKey]}`, link: `/projects/${project.id}`, responsible: [responsible], date,
                  start: date, end: date,
                  rawData: { projectId: project.id, envId: env.id, furId: fur.id, stageKey },
                });
              }
            }
          });
        });
      });
    });

    appointments.forEach(appointment => {
      if (appointment.start && appointment.memberIds) {
        const responsibleMembers = appointment.memberIds
          .map(id => memberMap.get(id))
          .filter((m): m is TeamMember => !!m);

        if (responsibleMembers.length > 0) {
           const matchesFilter = selectedMemberId === 'all' || appointment.memberIds.includes(selectedMemberId);
           if (matchesFilter) {
             const startDate = parseISO(appointment.start);
             const dayKey = format(startDate, 'yyyy-MM-dd');
             if (!tasks[dayKey]) tasks[dayKey] = [];
             
             // Check if this exact appointment is already added for this day
             if (!tasks[dayKey].some(t => t.rawData.appointmentId === appointment.id)) {
                tasks[dayKey].push({
                    id: appointment.id, type: 'appointment', title: appointment.title,
                    subtitle: appointment.description, responsible: responsibleMembers, date: startDate, start: startDate,
                    end: parseISO(appointment.end), rawData: { appointmentId: appointment.id },
                });
             }
           }
        }
      }
    });

    // Sort tasks within each day by start time
    Object.keys(tasks).forEach(dayKey => {
        tasks[dayKey].sort((a, b) => a.start.getTime() - b.start.getTime());
    });

    return tasks;
  }, [projects, appointments, isLoading, memberMap, selectedMemberId]);

  const defaultMonth = useMemo(() => {
    if (selectedDate) return selectedDate;
    
    const firstTaskDate = Object.keys(tasksByDay).sort()[0];
    if (firstTaskDate) {
      return parseISO(firstTaskDate);
    }
    
    return new Date();
  }, [selectedDate, tasksByDay]);

  const weekDays = useMemo(() => {
    const dateToUse = selectedDate || defaultMonth;
    const start = startOfWeek(dateToUse, { locale: ptBR });
    const end = endOfWeek(dateToUse, { locale: ptBR });
    return eachDayOfInterval({ start, end });
  }, [selectedDate, defaultMonth]);

  const handleTaskClick = (task: CalendarTask) => {
    setSelectedTask(task);
    setDetailsModalOpen(true);
  };
  
  const handleReschedule = (task: CalendarTask, newDate: Date) => {
    if (task.type === 'project' && task.rawData.projectId) {
        const project = projects.find(p => p.id === task.rawData.projectId);
        if (!project) return;
        const newProject = JSON.parse(JSON.stringify(project));
        const env = newProject.environments.find((e: any) => e.id === task.rawData.envId);
        if (env) {
            const fur = env.furniture.find((f: any) => f.id === task.rawData.furId);
            if (fur && task.rawData.stageKey) {
                if (!fur[task.rawData.stageKey]) fur[task.rawData.stageKey] = { status: 'todo' as StageStatus };
                fur[task.rawData.stageKey].scheduledFor = newDate.toISOString();
            }
        }
        updateProject(newProject, project);
    } else if (task.type === 'appointment' && task.rawData.appointmentId) {
        const duration = task.end.getTime() - task.start.getTime();
        const newEndDate = new Date(newDate.getTime() + duration);
        updateAppointment(task.rawData.appointmentId, { start: newDate.toISOString(), end: newEndDate.toISOString() });
    }
  };

  const handleCancelTask = (task: CalendarTask) => {
    if (task.type === 'project' && task.rawData.projectId) {
        const project = projects.find(p => p.id === task.rawData.projectId);
        if (!project) return;
        const newProject = JSON.parse(JSON.stringify(project));
        const env = newProject.environments.find((e: any) => e.id === task.rawData.envId);
        if (env) {
            const fur = env.furniture.find((f: any) => f.id === task.rawData.furId);
            if (fur && task.rawData.stageKey && fur[task.rawData.stageKey]) {
                delete fur[task.rawData.stageKey].scheduledFor;
            }
        }
        updateProject(newProject, project);
    } else if (task.type === 'appointment' && task.rawData.appointmentId) {
        deleteAppointment(task.rawData.appointmentId);
    }
  };

  const getTaskTime = (task: CalendarTask) => {
    const isAllDay = isSameDay(task.start, task.end) && task.start.getHours() === 0 && task.end.getHours() === 23;
    if (isAllDay || task.type === 'project') {
      return 'Dia inteiro';
    }
    return `${format(task.start, 'HH:mm')} - ${format(task.end, 'HH:mm')}`;
  };

  const handleMultiSelect = (dates: Date[] | undefined) => {
    if (dates) {
      setSelectedDates(dates);
      // If single date is selected in multi mode, also update single-date view
      if (dates.length === 1) {
        setSelectedDate(dates[0]);
      } else {
        setSelectedDate(undefined);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p>Carregando calendário...</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <PageHeader
            title="Calendário da Equipe"
            description="Visualize as tarefas agendadas para cada membro da equipe."
          />
          <div className='flex gap-2 w-full sm:w-auto'>
            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger className="w-full flex-1 sm:w-[280px]">
                <SelectValue placeholder="Filtrar por membro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2"><Users className="h-4 w-4" />Todos os Membros</div>
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
            <Button onClick={() => setAppointmentModalOpen(true)} className="sm:flex-initial">
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Compromisso
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 xl:col-span-3">
              <Card>
                  <CardContent className="p-2">
                    <Calendar
                        mode="multiple"
                        min={0}
                        selected={selectedDates}
                        onSelect={handleMultiSelect}
                        onDayClick={(day) => setSelectedDate(day)}
                        locale={ptBR}
                        className="w-full"
                        month={defaultMonth}
                        onMonthChange={(newMonth) => setSelectedDate(newMonth)}
                    />
                  </CardContent>
                  {selectedDates.length > 0 && (
                    <CardHeader className="p-3 border-t">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium">{selectedDates.length} dia(s) selecionado(s)</p>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedDates([]); setSelectedDate(new Date()); }}>
                          <X className="h-4 w-4" />
                          <span className="sr-only">Limpar seleção</span>
                        </Button>
                      </div>
                    </CardHeader>
                  )}
              </Card>
          </div>
          <div className="lg:col-span-8 xl:col-span-9">
              <div className="space-y-6">
                  {weekDays.map(day => {
                      const dayKey = format(day, 'yyyy-MM-dd');
                      const dailyTasks = tasksByDay[dayKey] || [];
                      return (
                        <div key={dayKey}>
                          <h2 className="font-semibold text-lg capitalize flex items-center gap-2">
                            {format(day, 'eeee, dd/MM', { locale: ptBR })}
                            {isSameDay(day, new Date()) && <span className="text-xs font-bold text-primary">(Hoje)</span>}
                          </h2>
                          <Separator className="my-2" />
                           {dailyTasks.length > 0 ? (
                                <ul className="space-y-3">
                                  {dailyTasks.map(task => (
                                      <li key={task.id} className="flex items-start gap-3 rounded-lg p-3 hover:bg-muted/50 cursor-pointer" onClick={() => handleTaskClick(task)}>
                                         <div className="w-24 text-sm font-medium text-right flex-shrink-0 pt-0.5">
                                             {getTaskTime(task)}
                                         </div>
                                         <div className="w-1.5 h-auto self-stretch rounded-full" style={{backgroundColor: task.responsible[0]?.color || '#ccc'}}></div>
                                         <div className="flex-grow overflow-hidden">
                                            <p className="font-semibold truncate">{task.title}</p>
                                            {task.subtitle && <p className="text-sm text-muted-foreground truncate">{task.subtitle}</p>}
                                         </div>
                                         <div className="flex items-center -space-x-2">
                                           {task.responsible.map(member => (
                                            <Tooltip key={member.id}>
                                              <TooltipTrigger asChild>
                                                <Avatar className="h-8 w-8 border-2 border-background">
                                                    {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt={member.name} />}
                                                    <AvatarFallback style={{ backgroundColor: member.color }}>
                                                        {getInitials(member.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>{member.name}</p>
                                              </TooltipContent>
                                            </Tooltip>
                                           ))}
                                         </div>
                                          {task.link && (
                                              <Button asChild variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                                                  <Link href={task.link}>Ver Projeto</Link>
                                              </Button>
                                          )}
                                      </li>
                                  ))}
                                </ul>
                           ) : (
                            <p className="text-sm text-muted-foreground italic px-3">Nenhum compromisso agendado.</p>
                           )}
                        </div>
                      )
                  })}
              </div>
          </div>
        </div>
      </div>
      <NewAppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={() => setAppointmentModalOpen(false)}
        selectedDates={selectedDates}
        onDatesConsumed={() => { setSelectedDates([]); setSelectedDate(new Date()); }}
      />
      {selectedTask && (
        <AppointmentDetailsModal
            isOpen={isDetailsModalOpen}
            onClose={() => setDetailsModalOpen(false)}
            task={selectedTask}
            onReschedule={handleReschedule}
            onCancel={handleCancelTask}
        />
      )}
    </TooltipProvider>
  );
}
