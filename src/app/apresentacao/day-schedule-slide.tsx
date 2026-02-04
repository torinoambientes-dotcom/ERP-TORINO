'use client';
import { useMemo } from 'react';
import type { Project, Appointment, TeamMember } from '@/lib/types';
import { format, isSameDay, parseISO, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Hammer, Truck, Clock, CheckCircle2, User, Scissors } from 'lucide-react';
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
    category?: 'corte' | 'producao' | 'montagem';
}

export function DayScheduleSlide({ day, projects, appointments, teamMembers, selectedCarpenterIds }: DayScheduleSlideProps) {
  const memberMap = useMemo(() => new Map(teamMembers.map(m => [m.id, m])), [teamMembers]);

  const { producao, montagem } = useMemo(() => {
    const prodItems: ScheduleItem[] = [];
    const montItems: ScheduleItem[] = [];

    // 1. Processar Projetos (Cortes e Produção)
    projects.forEach(project => {
      project.environments.forEach(env => {
        env.furniture.forEach(fur => {
          // Etapa de Corte
          if (fur.cutting?.scheduledFor && isSameDay(parseISO(fur.cutting.scheduledFor), day)) {
             prodItems.push({
                id: `cut-${fur.id}`,
                title: fur.name,
                description: project.clientName,
                responsible: (fur.cutting.responsibleIds || []).map(id => memberMap.get(id)?.name.split(' ')[0] || '').filter(Boolean),
                isDone: fur.cutting.status === 'done',
                category: 'corte'
            });
          }

          // Etapa de Pré-Montagem
          const stage = fur.assembly;
          if (stage?.scheduledFor && isSameDay(parseISO(stage.scheduledFor), day)) {
            const isRelevant = !selectedCarpenterIds || 
                               (stage.responsibleIds || []).some(id => selectedCarpenterIds.includes(id));

            if (isRelevant) {
                prodItems.push({
                    id: fur.id,
                    title: fur.name,
                    description: project.clientName,
                    responsible: (stage.responsibleIds || []).map(id => memberMap.get(id)?.name.split(' ')[0] || '').filter(Boolean),
                    isDone: stage.status === 'done',
                    category: 'producao'
                });
            }
          }
        });
      });
    });

    // 2. Adicionar Compromissos Manuais
    appointments.forEach(apt => {
        if (apt.start && isSameDay(parseISO(apt.start), day)) {
            if (apt.category === 'producao' || apt.category === 'corte') {
                prodItems.push({
                    id: apt.id,
                    title: apt.title,
                    description: apt.description,
                    responsible: (apt.memberIds || []).map(id => memberMap.get(id)?.name.split(' ')[0] || '').filter(Boolean),
                    isDone: apt.status === 'done',
                    category: apt.category as any
                });
            } else if (apt.category === 'montagem') {
                montItems.push({
                    id: apt.id,
                    title: apt.title,
                    description: apt.description,
                    location: apt.location,
                    responsible: (apt.memberIds || []).map(id => memberMap.get(id)?.name.split(' ')[0] || '').filter(Boolean),
                    isDone: apt.status === 'done',
                    category: 'montagem'
                });
            }
        }
    });

    return { 
        producao: prodItems.sort((a, b) => (a.category === 'corte' ? -1 : 1)), 
        montagem: montItems 
    };
  }, [day, projects, appointments, memberMap, selectedCarpenterIds]);

  const isActive = isToday(day);

  return (
    <div className="flex flex-col h-full gap-10">
      {/* Indicador de Dia - Super Visível */}
      <div className="flex items-center justify-center">
        <div className={cn(
            "px-16 py-6 rounded-[40px] border-4 flex flex-col items-center min-w-[400px] shadow-2xl",
            isActive ? "bg-primary text-primary-foreground border-primary" : "bg-zinc-900 border-gray-800"
        )}>
            <span className="text-3xl font-black uppercase tracking-[0.3em] leading-none mb-2">
                {format(day, 'eeee', { locale: ptBR })}
            </span>
            <span className="text-8xl font-black tracking-tighter">
                {format(day, 'dd/MM')}
            </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 flex-grow overflow-hidden pb-4">
        {/* Coluna Produção */}
        <section className="flex flex-col gap-6">
            <div className="flex items-center gap-4 text-blue-400 pl-4">
                <Hammer className="h-14 w-14" />
                <h2 className="text-5xl font-black uppercase tracking-tighter">Produção Fábrica</h2>
            </div>
            <div className="grid grid-cols-1 gap-6 overflow-y-auto pr-4 custom-scrollbar">
                {producao.length > 0 ? producao.map(item => (
                    <ScheduleCard key={item.id} item={item} type="producao" />
                )) : (
                    <EmptyState message="Sem produção agendada" />
                )}
            </div>
        </section>

        {/* Coluna Montagem */}
        <section className="flex flex-col gap-6">
            <div className="flex items-center gap-4 text-emerald-400 pl-4">
                <Truck className="h-14 w-14" />
                <h2 className="text-5xl font-black uppercase tracking-tighter">Montagem Externo</h2>
            </div>
            <div className="grid grid-cols-1 gap-6 overflow-y-auto pr-4 custom-scrollbar">
                {montagem.length > 0 ? montagem.map(item => (
                    <ScheduleCard key={item.id} item={item} type="montagem" />
                )) : (
                    <EmptyState message="Sem montagens externas" />
                )}
            </div>
        </section>
      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
}

function ScheduleCard({ item, type }: { item: ScheduleItem, type: 'producao' | 'montagem' }) {
    const isProducao = type === 'producao';
    const isCorte = item.category === 'corte';
    
    return (
        <div className={cn(
            "p-8 rounded-[3rem] border-l-[20px] bg-zinc-900/90 shadow-xl relative transition-all duration-500",
            item.isDone ? "opacity-30 grayscale" : "opacity-100",
            isCorte ? "border-l-orange-500 border-zinc-800" : 
            (isProducao ? "border-l-blue-500 border-zinc-800" : "border-l-emerald-500 border-zinc-800")
        )}>
            <div className="flex justify-between items-start gap-6">
                <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                        {isCorte && (
                            <span className="px-3 py-1 bg-orange-500 text-black text-xl font-black rounded-lg uppercase tracking-tighter">Corte</span>
                        )}
                        <h3 className={cn("text-5xl font-black tracking-tight truncate leading-tight", item.isDone && "line-through")}>
                            {item.title}
                        </h3>
                    </div>
                    <p className="text-3xl text-zinc-400 font-bold tracking-tight truncate">
                        {item.description}
                    </p>
                    {item.location && (
                        <div className="text-2xl text-primary font-bold italic mt-4 flex items-center gap-3 bg-primary/10 px-4 py-2 rounded-2xl w-fit">
                            <Truck className="h-6 w-6" /> {item.location}
                        </div>
                    )}
                </div>
                {item.isDone ? (
                    <CheckCircle2 className="h-16 w-16 text-emerald-500 flex-shrink-0" />
                ) : (
                    isCorte ? <Scissors className="h-16 w-16 text-orange-500 flex-shrink-0 animate-pulse" /> :
                    <Clock className={cn("h-16 w-16 flex-shrink-0", isProducao ? "text-blue-500" : "text-emerald-500")} />
                )}
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-800 flex flex-wrap gap-4 items-center">
                <User className="h-8 w-8 text-zinc-600" />
                <span className="text-2xl font-black text-zinc-300 uppercase tracking-wider">
                    {item.responsible.length > 0 ? item.responsible.join('  •  ') : 'Equipa Torino'}
                </span>
            </div>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="h-48 flex items-center justify-center border-4 border-dashed border-zinc-800 rounded-[3rem] bg-zinc-900/20">
            <p className="text-3xl text-zinc-700 font-black uppercase tracking-[0.2em] italic">{message}</p>
        </div>
    );
}
