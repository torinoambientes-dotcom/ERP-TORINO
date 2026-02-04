'use client';
import { useMemo } from 'react';
import type { Project, Appointment, TeamMember, ProductionStage } from '@/lib/types';
import { format, isSameDay, parseISO, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Hammer, Truck, Clock, CheckCircle2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DayScheduleSlideProps {
  day: Date;
  projects: Project[];
  appointments: Appointment[];
  teamMembers: TeamMember[];
  selectedCarpenterIds: string[] | null;
}

interface ScheduleItem {
    id: string;
    title: string;
    description?: string;
    location?: string;
    responsible: string[];
    isDone: boolean;
}

export function DayScheduleSlide({ day, projects, appointments, teamMembers, selectedCarpenterIds }: DayScheduleSlideProps) {
  const memberMap = useMemo(() => new Map(teamMembers.map(m => [m.id, m])), [teamMembers]);

  const { producao, montagem } = useMemo(() => {
    const prodItems: ScheduleItem[] = [];
    const montItems: ScheduleItem[] = [];

    // 1. Processar Produção (Fábrica)
    projects.forEach(project => {
      project.environments.forEach(env => {
        env.furniture.forEach(fur => {
          const stage = fur.assembly; // Etapa de produção
          if (stage?.scheduledFor && isSameDay(parseISO(stage.scheduledFor), day)) {
            // Filtrar por marceneiros selecionados se houver filtro
            const isRelevant = !selectedCarpenterIds || 
                               (stage.responsibleIds || []).some(id => selectedCarpenterIds.includes(id));

            if (isRelevant) {
                prodItems.push({
                    id: fur.id,
                    title: fur.name,
                    description: project.clientName,
                    responsible: (stage.responsibleIds || []).map(id => memberMap.get(id)?.name.split(' ')[0] || '').filter(Boolean),
                    isDone: stage.status === 'done'
                });
            }
          }
        });
      });
    });

    // 2. Adicionar Compromissos Manuais de Produção
    appointments.forEach(apt => {
        if (apt.start && isSameDay(parseISO(apt.start), day) && apt.category === 'producao') {
            prodItems.push({
                id: apt.id,
                title: apt.title,
                description: apt.description,
                responsible: (apt.memberIds || []).map(id => memberMap.get(id)?.name.split(' ')[0] || '').filter(Boolean),
                isDone: apt.status === 'done'
            });
        }
    });

    // 3. Processar Montagem (Externo)
    appointments.forEach(apt => {
        if (apt.start && isSameDay(parseISO(apt.start), day) && apt.category === 'montagem') {
            montItems.push({
                id: apt.id,
                title: apt.title,
                description: apt.description,
                location: apt.location,
                responsible: (apt.memberIds || []).map(id => memberMap.get(id)?.name.split(' ')[0] || '').filter(Boolean),
                isDone: apt.status === 'done'
            });
        }
    });

    return { producao: prodItems, montagem: montItems };
  }, [day, projects, appointments, memberMap, selectedCarpenterIds]);

  const isActive = isToday(day);

  return (
    <div className="flex flex-col h-full gap-8">
      {/* Indicador de Dia */}
      <div className="flex items-center justify-center gap-6">
        <div className={cn(
            "px-12 py-4 rounded-2xl border-2 flex flex-col items-center",
            isActive ? "bg-primary text-primary-foreground border-primary" : "bg-gray-900 border-gray-800"
        )}>
            <span className="text-2xl font-black uppercase tracking-widest leading-none">
                {format(day, 'eeee', { locale: ptBR })}
            </span>
            <span className="text-6xl font-black">
                {format(day, 'dd/MM')}
            </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 flex-grow">
        {/* Coluna Produção */}
        <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3 text-blue-400 mb-2">
                <Hammer className="h-10 w-10" />
                <h2 className="text-4xl font-black uppercase tracking-tight">Produção Fábrica</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 overflow-y-auto pr-2">
                {producao.length > 0 ? producao.map(item => (
                    <ScheduleCard key={item.id} item={item} type="producao" />
                )) : (
                    <EmptyState message="Sem produção agendada" />
                )}
            </div>
        </section>

        {/* Coluna Montagem */}
        <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3 text-green-400 mb-2">
                <Truck className="h-10 w-10" />
                <h2 className="text-4xl font-black uppercase tracking-tight">Montagem Externo</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 overflow-y-auto pr-2">
                {montagem.length > 0 ? montagem.map(item => (
                    <ScheduleCard key={item.id} item={item} type="montagem" />
                )) : (
                    <EmptyState message="Sem montagens externas" />
                )}
            </div>
        </section>
      </div>
    </div>
  );
}

function ScheduleCard({ item, type }: { item: ScheduleItem, type: 'producao' | 'montagem' }) {
    const isProducao = type === 'producao';
    
    return (
        <div className={cn(
            "p-6 rounded-3xl border-l-[12px] bg-gray-900/80 border-gray-800 relative transition-all duration-300",
            item.isDone ? "opacity-40" : "opacity-100",
            isProducao ? "border-l-blue-600" : "border-l-green-600"
        )}>
            <div className="flex justify-between items-start gap-4">
                <div className="flex-grow min-w-0">
                    <h3 className={cn("text-4xl font-bold truncate leading-tight", item.isDone && "line-through")}>
                        {item.title}
                    </h3>
                    <p className="text-2xl text-gray-400 font-medium mt-1 truncate">
                        {item.description}
                    </p>
                    {item.location && (
                        <p className="text-xl text-primary/80 italic mt-2 flex items-center gap-2">
                            <Truck className="h-5 w-5" /> {item.location}
                        </p>
                    )}
                </div>
                {item.isDone ? (
                    <CheckCircle2 className="h-10 w-10 text-green-500 flex-shrink-0" />
                ) : (
                    <Clock className={cn("h-10 w-10 flex-shrink-0", isProducao ? "text-blue-500" : "text-green-500")} />
                )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3 items-center">
                <User className="h-6 w-6 text-gray-500" />
                <span className="text-2xl font-bold text-gray-300 uppercase">
                    {item.responsible.length > 0 ? item.responsible.join(' • ') : 'Equipe'}
                </span>
            </div>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="h-32 flex items-center justify-center border-4 border-dashed border-gray-800 rounded-3xl bg-gray-900/30">
            <p className="text-2xl text-gray-600 font-bold uppercase tracking-widest italic">{message}</p>
        </div>
    );
}
