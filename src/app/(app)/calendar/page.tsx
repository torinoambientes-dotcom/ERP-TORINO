'use client';
import { useMemo, useState, useContext, useCallback } from 'react';
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
import { eachDayOfInterval, endOfMonth, format, isSameDay, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { STAGE_STATUSES } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, X } from 'lucide-react';
import { NewAppointmentModal } from '@/components/modals/new-appointment-modal';
import { AppointmentDetailsModal } from '@/components/modals/appointment-details-modal';


export interface CalendarTask {
  id: string; // Composite ID like `projectId-envId-furId-stageKey` or `appointmentId-memberId`
  type: 'project' | 'appointment';
  title: string;
  subtitle?: string;
  link?: string;
  responsible: TeamMember;
  date: Date;
  // Raw data for updates
  rawData: {
    projectId?: string;
    envId?: string;
    furId?: string;
    stageKey?: keyof typeof STAGE_STATUSES;
    appointmentId?: string;
  }
}

export default function CalendarPage() {
  const { projects, teamMembers, appointments, updateProject, updateAppointmentDate, deleteAppointment, isLoading } = useContext(AppContext);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<Date[] | undefined>();
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
    
    // Process project-related tasks
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
                  type: 'project',
                  title: project.clientName,
                  subtitle: fur.name,
                  link: `/projects/${project.id}`,
                  responsible,
                  date,
                  rawData: { projectId: project.id, envId: env.id, furId: fur.id, stageKey },
                });
              }
            }
          });
        });
      });
    });

    // Process general appointments
    appointments.forEach(appointment => {
      if (appointment.date && appointment.memberIds) {
        appointment.memberIds.forEach(memberId => {
            const responsible = memberMap.get(memberId);
            if (responsible && (selectedMemberId === 'all' || selectedMemberId === responsible.id)) {
                const date = new Date(appointment.date);
                const dayKey = format(date, 'yyyy-MM-dd');
                if (!tasks[dayKey]) {
                    tasks[dayKey] = [];
                }
                tasks[dayKey].push({
                    id: `${appointment.id}-${memberId}`, // Unique ID for each member in the appointment
                    type: 'appointment',
                    title: appointment.title,
                    subtitle: appointment.description,
                    responsible,
                    date,
                    rawData: { appointmentId: appointment.id },
                });
            }
        });
      }
    });

    return tasks;
  }, [projects, appointments, isLoading, memberMap, selectedMemberId]);

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
                if (!fur[task.rawData.stageKey]) {
                    fur[task.rawData.stageKey] = { status: 'todo' as StageStatus };
                }
                fur[task.rawData.stageKey].scheduledFor = newDate.toISOString();
            }
        }
        updateProject(newProject, project);
    } else if (task.type === 'appointment' && task.rawData.appointmentId) {
        updateAppointmentDate(task.rawData.appointmentId, newDate);
    }
  };

  const handleCancelTask = (task: CalendarTask) => {
    if (task.type === 'project' && task.rawData.projectId) {
        // "Cancel" for a project task means un-scheduling it
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
        // "Cancel" for a generic appointment means deleting it
        deleteAppointment(task.rawData.appointmentId);
    }
  };

  const DayWithTasks = ({ date, ...props }: { date: Date } & any) => {
    const dayKey = format(date, 'yyyy-MM-dd');
    const dailyTasks = tasksByDay[dayKey] || [];

    const isSelected = selectedDates?.some(d => isSameDay(d, date));

    return (
      <div className="p-2 h-full flex flex-col">
        <time dateTime={dayKey} className="text-right text-sm">
          {format(date, 'd')}
        </time>
        <ul className="mt-1 space-y-1 overflow-y-auto flex-grow">
          {dailyTasks.map(task => (
            <li key={task.id}>
              {task.link ? (
                 <Link href={task.link} className="group block">
                   <div className="flex items-center gap-2 p-1.5 rounded-md" style={{ backgroundColor: `${task.responsible.color}20` }}>
                      <Avatar className="h-5 w-5">
                          {task.responsible.avatarUrl && <AvatarImage src={task.responsible.avatarUrl} alt={task.responsible.name} />}
                          <AvatarFallback style={{ backgroundColor: task.responsible.color }} className='text-xs'>
                              {getInitials(task.responsible.name)}
                          </AvatarFallback>
                      </Avatar>
                      <div className="text-xs truncate">
                          <p className="font-medium truncate text-foreground">{task.title}</p>
                          {task.subtitle && <p className="text-muted-foreground truncate">{task.subtitle}</p>}
                      </div>
                  </div>
                 </Link>
              ) : (
                <div className="group block cursor-pointer" onClick={() => handleTaskClick(task)}>
                   <div className="flex items-center gap-2 p-1.5 rounded-md" style={{ backgroundColor: `${task.responsible.color}20` }}>
                      <Avatar className="h-5 w-5">
                          {task.responsible.avatarUrl && <AvatarImage src={task.responsible.avatarUrl} alt={task.responsible.name} />}
                          <AvatarFallback style={{ backgroundColor: task.responsible.color }} className='text-xs'>
                              {getInitials(task.responsible.name)}
                          </AvatarFallback>
                      </Avatar>
                      <div className="text-xs truncate">
                          <p className="font-medium truncate text-foreground">{task.title}</p>
                          {task.subtitle && <p className="text-muted-foreground truncate">{task.subtitle}</p>}
                      </div>
                  </div>
                </div>
              )}
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
    <>
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
            <Button onClick={() => setAppointmentModalOpen(true)} className="sm:flex-initial">
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Compromisso
            </Button>
          </div>
        </div>

        {selectedDates && selectedDates.length > 0 && (
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="p-3 flex items-center justify-between">
              <p className="text-sm font-medium">
                {selectedDates.length} dia(s) selecionado(s).
              </p>
              <Button variant="ghost" size="sm" onClick={() => setSelectedDates(undefined)}>
                <X className="mr-2 h-4 w-4" />
                Limpar Seleção
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-2">
            <Calendar
              mode="multiple"
              min={0}
              selected={selectedDates}
              onSelect={setSelectedDates}
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
                day_selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
                day_today: 'bg-accent text-accent-foreground',
                day_outside: 'text-muted-foreground opacity-50',
              }}
            />
          </CardContent>
        </Card>
      </div>
      <NewAppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={() => setAppointmentModalOpen(false)}
        selectedDates={selectedDates}
        onDatesConsumed={() => setSelectedDates(undefined)}
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
    </>
  );
}
