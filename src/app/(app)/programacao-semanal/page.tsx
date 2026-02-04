
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
  isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TeamMember, Priority, Project, ProductionStage } from '@/lib/types';
import { Scissors, Hammer, Truck, Plus, MapPin, User, Clock } from 'lucide-react';
import { NewAppointmentModal } from '@/components/modals/new-appointment-modal';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface WeeklyItem {
  id: string;
  type: 'corte' | 'producao' | 'montagem';
  title: string;
  description?: string;
  location?: string;
  responsible: TeamMember[];
  priority?: Priority;
  projectId?: string;
}

export default function WeeklySchedulePage() {
  const { projects, teamMembers, appointments, isLoading } = useContext(AppContext);
  const [isClient, setIsClient] = useState(false);
  const [isAptModalOpen, setAptModalOpen] = useState(false);
  const [selectedDayForAdd, setSelectedDayForAdd] = useState<Date | undefined>(undefined);

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

      // 1. Cortes (Planos de Corte)
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
              });
            }
          });
        });
      });

      // 2. Produção (Pré-montagem na fábrica)
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
              });
            }
          });
        });
      });

      // 3. Montagem (Compromissos externos)
      appointments.forEach(apt => {
        if (apt.start && isSameDay(parseISO(apt.start), day) && apt.category === 'montagem') {
          data[dayKey].push({
            id: apt.id,
            type: 'montagem',
            title: apt.title,
            description: apt.description,
            location: apt.location,
            responsible: (apt.memberIds || []).map(id => memberMap.get(id)).filter((m): m is TeamMember => !!m),
          });
        }
      });
    });

    return data;
  }, [projects, appointments, isLoading, memberMap, daysOfWeek]);

  const handleQuickAdd = (day: Date) => {
    setSelectedDayForAdd(day);
    setAptModalOpen(true);
  };

  if (!isClient || isLoading) {
    return <div className="flex h-full w-full items-center justify-center p-12">Carregando programação...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader
          title="Programação Semanal"
          description={`Planeamento de ${format(weekRange.start, "dd 'de' MMMM", { locale: ptBR })} a ${format(weekRange.end, "dd 'de' MMMM", { locale: ptBR })}.`}
        />
        <Button onClick={() => handleQuickAdd(new Date())}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Agendamento
        </Button>
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
                <Button variant="ghost" size="sm" onClick={() => handleQuickAdd(day)}>
                  <Plus className="h-4 w-4 mr-1" /> Agendar
                </Button>
              </CardHeader>
              
              <CardContent className="p-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x border-t">
                  
                  {/* CORTES SECTION */}
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold flex items-center gap-2 text-orange-600">
                        <Scissors className="h-4 w-4" /> Cortes
                      </h3>
                      <Badge variant="outline">{cortes.length}</Badge>
                    </div>
                    <div className="space-y-3">
                      {cortes.length > 0 ? cortes.map(item => (
                        <div key={item.id} className="bg-muted/30 p-3 rounded-lg border text-sm">
                          <Link href={`/projects/${item.projectId}`} className="font-semibold hover:underline block">
                            {item.title}
                          </Link>
                          <ResponsibleList responsible={item.responsible} />
                        </div>
                      )) : <EmptySection message="Nenhum plano de corte." />}
                    </div>
                  </div>

                  {/* PRODUÇÃO SECTION */}
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold flex items-center gap-2 text-blue-600">
                        <Hammer className="h-4 w-4" /> Produção Fábrica
                      </h3>
                      <Badge variant="outline">{producao.length}</Badge>
                    </div>
                    <div className="space-y-3">
                      {producao.length > 0 ? producao.map(item => (
                        <div key={item.id} className="bg-muted/30 p-3 rounded-lg border text-sm">
                          <Link href={`/projects/${item.projectId}`} className="font-semibold hover:underline block">
                            {item.title}
                          </Link>
                          <ResponsibleList responsible={item.responsible} />
                        </div>
                      )) : <EmptySection message="Nada em produção hoje." />}
                    </div>
                  </div>

                  {/* MONTAGEM SECTION */}
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold flex items-center gap-2 text-green-600">
                        <Truck className="h-4 w-4" /> Montagem Externo
                      </h3>
                      <Badge variant="outline">{montagem.length}</Badge>
                    </div>
                    <div className="space-y-3">
                      {montagem.length > 0 ? montagem.map(item => (
                        <div key={item.id} className="bg-muted/30 p-3 rounded-lg border text-sm space-y-2">
                          <p className="font-bold text-base">{item.title}</p>
                          {item.location && (
                            <p className="flex items-center gap-1 text-muted-foreground italic">
                              <MapPin className="h-3 w-3" /> {item.location}
                            </p>
                          )}
                          {item.description && (
                            <p className="text-muted-foreground border-l-2 pl-2 text-xs line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          <ResponsibleList responsible={item.responsible} />
                        </div>
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
        defaultCategory="montagem"
      />
    </div>
  );
}

function ResponsibleList({ responsible }: { responsible: TeamMember[] }) {
  if (responsible.length === 0) return null;
  return (
    <div className="flex items-center -space-x-2 mt-2">
      {responsible.map(member => (
        <Avatar key={member.id} className="h-6 w-6 border-2 border-background">
          <AvatarImage src={member.avatarUrl} />
          <AvatarFallback style={{ backgroundColor: member.color }} className="text-[8px]">
            {getInitials(member.name)}
          </AvatarFallback>
        </Avatar>
      ))}
      <span className="ml-4 text-[10px] text-muted-foreground">
        {responsible.map(m => m.name.split(' ')[0]).join(', ')}
      </span>
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
