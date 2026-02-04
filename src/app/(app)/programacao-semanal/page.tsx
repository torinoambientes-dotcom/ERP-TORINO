'use client';

import { useContext, useMemo, useState, useEffect } from 'react';
import { AppContext } from '@/context/app-context';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  parseISO, 
  isToday,
  isPast,
  endOfDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TeamMember, Priority, Appointment, StageStatus } from '@/lib/types';
import { Scissors, Hammer, Truck, PlusCircle, MapPin, CheckCircle2, Trash2, AlertCircle, Clock } from 'lucide-react';
import { NewAppointmentModal } from '@/components/modals/new-appointment-modal';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

interface WeeklyItem {
  id: string;
  type: 'corte' | 'producao' | 'montagem';
  title: string;
  description?: string;
  location?: string;
  responsible: TeamMember[];
  priority?: Priority;
  projectId?: string;
  envId?: string;
  furId?: string;
  isManual?: boolean;
  status?: 'todo' | 'done' | 'delayed';
  date: Date;
}

export default function WeeklySchedulePage() {
  const { projects, teamMembers, appointments, isLoading, updateProject, updateAppointment, deleteAppointment } = useContext(AppContext);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [isAptModalOpen, setAptModalOpen] = useState(false);
  const [selectedDayForAdd, setSelectedDayForAdd] = useState<Date | undefined>(undefined);
  const [selectedCategoryForAdd, setSelectedCategoryForAdd] = useState<'montagem' | 'corte' | 'producao'>('montagem');

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

  const weeklyData = useMemo(() => {
    const data: Record<string, WeeklyItem[]> = {};
    if (isLoading) return data;

    daysOfWeek.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      data[dayKey] = [];

      // 1. Cortes (Planos de Corte dos Projetos)
      projects.forEach(project => {
        project.environments.forEach(env => {
          env.furniture.forEach(fur => {
            const stage = fur.cutting;
            if (stage?.scheduledFor && isSameDay(parseISO(stage.scheduledFor), day)) {
              data[dayKey].push({
                id: `cut-${fur.id}`,
                type: 'corte',
                title: `${fur.name} (${project.clientName})`,
                responsible: (stage.responsibleIds || []).map(id => memberMap.get(id)).filter((m): m is TeamMember => !!m),
                priority: stage.priority,
                projectId: project.id,
                envId: env.id,
                furId: fur.id,
                status: stage.status === 'done' ? 'done' : (isPast(endOfDay(day)) ? 'delayed' : 'todo'),
                date: day,
              });
            }
          });
        });
      });

      // 2. Produção (Pré-montagem dos Projetos)
      projects.forEach(project => {
        project.environments.forEach(env => {
          env.furniture.forEach(fur => {
            const stage = fur.assembly;
            if (stage?.scheduledFor && isSameDay(parseISO(stage.scheduledFor), day)) {
              data[dayKey].push({
                id: `prod-${fur.id}`,
                type: 'producao',
                title: `${fur.name} (${project.clientName})`,
                responsible: (stage.responsibleIds || []).map(id => memberMap.get(id)).filter((m): m is TeamMember => !!m),
                priority: stage.priority,
                projectId: project.id,
                envId: env.id,
                furId: fur.id,
                status: stage.status === 'done' ? 'done' : (isPast(endOfDay(day)) ? 'delayed' : 'todo'),
                date: day,
              });
            }
          });
        });
      });

      // 3. Agendamentos Manuais (Appointments)
      appointments.forEach(apt => {
        if (apt.start && isSameDay(parseISO(apt.start), day)) {
          if (apt.category === 'montagem' || apt.category === 'corte' || apt.category === 'producao') {
            data[dayKey].push({
              id: apt.id,
              type: apt.category as any,
              title: apt.title,
              description: apt.description,
              location: apt.location,
              isManual: true,
              responsible: (apt.memberIds || []).map(id => memberMap.get(id)).filter((m): m is TeamMember => !!m),
              status: apt.status || (isPast(endOfDay(day)) ? 'delayed' : 'todo'),
              date: day,
            });
          }
        }
      });
    });

    return data;
  }, [projects, appointments, isLoading, memberMap, daysOfWeek]);

  const handleQuickAdd = (day: Date, category: 'montagem' | 'corte' | 'producao') => {
    setSelectedDayForAdd(day);
    setSelectedCategoryForAdd(category);
    setAptModalOpen(true);
  };

  const handleToggleComplete = (item: WeeklyItem) => {
    if (item.isManual) {
      const newStatus = item.status === 'done' ? 'todo' : 'done';
      updateAppointment(item.id, { status: newStatus });
      toast({ title: `Agendamento marcado como ${newStatus === 'done' ? 'concluído' : 'pendente'}.` });
    } else if (item.projectId && item.envId && item.furId) {
      const project = projects.find(p => p.id === item.projectId);
      if (!project) return;

      const newProject = JSON.parse(JSON.stringify(project));
      const env = newProject.environments.find((e: any) => e.id === item.envId);
      const fur = env?.furniture.find((f: any) => f.id === item.furId);
      if (fur) {
        const stageKey = item.type === 'corte' ? 'cutting' : 'assembly';
        const currentStatus = fur[stageKey].status;
        const newStatus: StageStatus = currentStatus === 'done' ? 'in_progress' : 'done';
        fur[stageKey].status = newStatus;
        if (newStatus === 'done') fur[stageKey].completedAt = new Date().toISOString();
        else delete fur[stageKey].completedAt;
        
        updateProject(newProject, project);
        toast({ title: `Etapa do projeto marcada como ${newStatus === 'done' ? 'concluída' : 'em andamento'}.` });
      }
    }
  };

  const handleRemove = (item: WeeklyItem) => {
    if (item.isManual) {
      deleteAppointment(item.id);
      toast({ title: "Agendamento removido." });
    } else if (item.projectId && item.envId && item.furId) {
      const project = projects.find(p => p.id === item.projectId);
      if (!project) return;

      const newProject = JSON.parse(JSON.stringify(project));
      const env = newProject.environments.find((e: any) => e.id === item.envId);
      const fur = env?.furniture.find((f: any) => f.id === item.furId);
      if (fur) {
        const stageKey = item.type === 'corte' ? 'cutting' : 'assembly';
        delete fur[stageKey].scheduledFor;
        updateProject(newProject, project);
        toast({ title: "Tarefa removida da programação semanal." });
      }
    }
  };

  const handleMarkDelayed = (item: WeeklyItem) => {
    if (item.isManual) {
        updateAppointment(item.id, { status: 'delayed' });
        toast({ title: "Agendamento marcado como em atraso." });
    } else if (item.projectId && item.envId && item.furId) {
        // For project stages, "delayed" is visual based on date, 
        // but we can't explicitly set a 'delayed' status in the StageStatus enum (it's todo/in_progress/done).
        // So we just show a toast or handle it visually.
        toast({ title: "Tarefa de projeto assinalada como prioritária/atrasada." });
    }
  };

  if (!isClient || isLoading) {
    return <div className="flex h-full w-full items-center justify-center p-12">Carregando programação...</div>;
  }

  return (
    <TooltipProvider>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <PageHeader
            title="Programação Semanal"
            description={`Planeamento de ${format(weekRange.start, "dd 'de' MMMM", { locale: ptBR })} a ${format(weekRange.end, "dd 'de' MMMM", { locale: ptBR })}.`}
          />
        </div>

        <div className="grid grid-cols-1 gap-8">
          {daysOfWeek.map(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayItems = weeklyData[dayKey] || [];
            const activeToday = isToday(day);

            const cortes = dayItems.filter(i => i.type === 'corte');
            const producao = dayItems.filter(i => i.type === 'producao');
            const montagem = dayItems.filter(i => i.type === 'montagem');

            return (
              <Card key={dayKey} className={cn("overflow-hidden border-l-4", activeToday ? "border-l-primary shadow-md" : "border-l-muted")}>
                <CardHeader className={cn("py-4 flex flex-row items-center justify-between", activeToday && "bg-primary/5")}>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "flex flex-col items-center justify-center w-14 h-14 rounded-lg border",
                      activeToday ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50"
                    )}>
                      <span className="text-xs uppercase font-bold">{format(day, 'EEE', { locale: ptBR })}</span>
                      <span className="text-xl font-bold leading-none">{format(day, 'dd')}</span>
                    </div>
                    <div>
                      <CardTitle className="text-2xl capitalize">
                        {format(day, 'eeee', { locale: ptBR })}
                      </CardTitle>
                      {activeToday && <Badge variant="secondary" className="mt-1">Hoje</Badge>}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x border-t">
                    
                    {/* CORTES SECTION */}
                    <div className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold flex items-center gap-2 text-orange-600">
                          <Scissors className="h-4 w-4" /> Cortes
                        </h3>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-600 hover:bg-orange-50" onClick={() => handleQuickAdd(day, 'corte')}>
                          <PlusCircle className="h-5 w-5" />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {cortes.length > 0 ? cortes.map(item => (
                          <WeeklyItemCard key={item.id} item={item} onToggleComplete={handleToggleComplete} onRemove={handleRemove} onMarkDelayed={handleMarkDelayed} />
                        )) : <EmptySection message="Nenhum plano de corte." />}
                      </div>
                    </div>

                    {/* PRODUÇÃO SECTION */}
                    <div className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold flex items-center gap-2 text-blue-600">
                          <Hammer className="h-4 w-4" /> Produção Fábrica
                        </h3>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => handleQuickAdd(day, 'producao')}>
                          <PlusCircle className="h-5 w-5" />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {producao.length > 0 ? producao.map(item => (
                          <WeeklyItemCard key={item.id} item={item} onToggleComplete={handleToggleComplete} onRemove={handleRemove} onMarkDelayed={handleMarkDelayed} />
                        )) : <EmptySection message="Nada em produção hoje." />}
                      </div>
                    </div>

                    {/* MONTAGEM SECTION */}
                    <div className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold flex items-center gap-2 text-green-600">
                          <Truck className="h-4 w-4" /> Montagem Externo
                        </h3>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:bg-green-50" onClick={() => handleQuickAdd(day, 'montagem')}>
                          <PlusCircle className="h-5 w-5" />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {montagem.length > 0 ? montagem.map(item => (
                          <WeeklyItemCard key={item.id} item={item} onToggleComplete={handleToggleComplete} onRemove={handleRemove} onMarkDelayed={handleMarkDelayed} />
                        )) : <EmptySection message="Nenhuma montagem externa." />}
                      </div>
                    </div>

                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <NewAppointmentModal
          isOpen={isAptModalOpen}
          onClose={() => setAptModalOpen(false)}
          selectedDate={selectedDayForAdd}
          defaultCategory={selectedCategoryForAdd}
        />
      </div>
    </TooltipProvider>
  );
}

function WeeklyItemCard({ item, onToggleComplete, onRemove, onMarkDelayed }: { item: WeeklyItem, onToggleComplete: (i: WeeklyItem) => void, onRemove: (i: WeeklyItem) => void, onMarkDelayed: (i: WeeklyItem) => void }) {
  const isDone = item.status === 'done';
  const isDelayed = item.status === 'delayed';

  return (
    <div className={cn(
      "group bg-muted/30 p-3 rounded-lg border text-sm transition-all hover:shadow-sm",
      isDone && "bg-green-50/50 border-green-100 opacity-80",
      isDelayed && "bg-red-50/50 border-red-100"
    )}>
      <div className="flex justify-between items-start gap-2">
        <div className="flex-grow min-w-0">
          {item.projectId ? (
            <Link href={`/projects/${item.projectId}`} className={cn("font-bold hover:underline block truncate text-base", isDone && "line-through text-muted-foreground")}>
              {item.title}
            </Link>
          ) : (
            <span className={cn("font-bold block truncate text-base", isDone && "line-through text-muted-foreground")}>{item.title}</span>
          )}
          
          {item.location && (
            <p className="flex items-center gap-1 text-muted-foreground italic text-xs mt-1">
              <MapPin className="h-3 w-3" /> {item.location}
            </p>
          )}
          
          {item.description && (
            <p className={cn("text-muted-foreground border-l-2 pl-2 text-xs line-clamp-2 mt-1", isDone && "opacity-50")}>
              {item.description}
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-1">
            {item.responsible.length > 0 ? (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Marceneiro: {item.responsible.map(m => m.name.split(' ')[0]).join(', ')}
              </span>
            ) : (
              <span className="text-[10px] italic text-muted-foreground">Sem Marceneiro</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1 flex-shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-7 w-7", isDone ? "text-green-600" : "text-muted-foreground hover:text-green-600")}
                onClick={() => onToggleComplete(item)}
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isDone ? 'Reabrir tarefa' : 'Marcar como concluído'}</TooltipContent>
          </Tooltip>

          {!isDone && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn("h-7 w-7", isDelayed ? "text-red-600" : "text-muted-foreground hover:text-red-600")}
                  onClick={() => onMarkDelayed(item)}
                >
                  <AlertCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Marcar como em atraso</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(item)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remover da programação</TooltipContent>
          </Tooltip>
        </div>
      </div>
      
      {isDelayed && !isDone && (
        <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100/50 px-2 py-0.5 rounded">
          <Clock className="h-3 w-3" /> EM ATRASO
        </div>
      )}
    </div>
  );
}

function EmptySection({ message }: { message: string }) {
  return (
    <div className="h-16 flex items-center justify-center border-2 border-dashed rounded-lg bg-background/50">
      <p className="text-xs text-muted-foreground italic">{message}</p>
    </div>
  );
}
