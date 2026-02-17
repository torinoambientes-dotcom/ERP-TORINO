
'use client';
import { useMemo } from 'react';
import type { Project, Appointment, TeamMember } from '@/lib/types';
import { format, isSameDay, parseISO, isToday, isPast, endOfDay, startOfDay, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Hammer, Truck, Clock, CheckCircle2, User, AlertCircle } from 'lucide-react';
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
    isDelayed: boolean;
    category?: 'producao' | 'montagem';
}

export function DayScheduleSlide({ day, projects, appointments, teamMembers, selectedCarpenterIds }: DayScheduleSlideProps) {
  const memberMap = useMemo(() => new Map(teamMembers.map(m => [m.id, m])), [teamMembers]);

  const { producao, montagem } = useMemo(() => {
    const prodItems: ScheduleItem[] = [];
    const montItems: ScheduleItem[] = [];

    // 1. Processar Projetos (Apenas Produção/Pré-Montagem)
    projects.forEach(project => {
      project.environments.forEach(env => {
        env.furniture.forEach(fur => {
          const stage = fur.assembly;
          if (stage?.scheduledFor && isSameDay(parseISO(stage.scheduledFor), day)) {
            const isRelevant = !selectedCarpenterIds || 
                               (stage.responsibleIds || []).some(id => selectedCarpenterIds.includes(id));

            if (isRelevant) {
                const isDone = stage.status === 'done';
                const isDelayed = !isDone && isPast(endOfDay(day));

                prodItems.push({
                    id: fur.id,
                    title: fur.name,
                    description: project.clientName,
                    responsible: (stage.responsibleIds || []).map(id => memberMap.get(id)?.name.split(' ')[0] || '').filter(Boolean),
                    isDone,
                    isDelayed,
                    category: 'producao'
                });
            }
          }
        });
      });
    });

    // 2. Adicionar Compromissos Manuais (Suporta intervalo de datas)
    appointments.forEach(apt => {
        if (apt.start && apt.end) {
            const start = startOfDay(parseISO(apt.start));
            const end = endOfDay(parseISO(apt.end));

            if (isWithinInterval(day, { start, end })) {
                const isDone = apt.status === 'done';
                const isDelayed = apt.status === 'delayed' || (!isDone && isPast(endOfDay(day)));

                if (apt.category === 'producao') {
                    prodItems.push({
                        id: apt.id,
                        title: apt.title,
                        description: apt.description,
                        responsible: (apt.memberIds || []).map(id => memberMap.get(id)?.name.split(' ')[0] || '').filter(Boolean),
                        isDone,
                        isDelayed,
                        category: 'producao'
                    });
                } else if (apt.category === 'montagem') {
                    montItems.push({
                        id: apt.id,
                        title: apt.title,
                        description: apt.description,
                        location: apt.location,
                        responsible: (apt.memberIds || []).map(id => memberMap.get(id)?.name.split(' ')[0] || '').filter(Boolean),
                        isDone,
                        isDelayed,
                        category: 'montagem'
                    });
                }
            }
        }
    });

    return { 
        producao: prodItems, 
        montagem: montItems 
    };
  }, [day, projects, appointments, memberMap, selectedCarpenterIds]);

  const isActive = isToday(day);

  return (
    <div className="flex flex-col h-full gap-4 px-4 pb-4">
      {/* Indicador de Dia */}
      <div className="flex items-center justify-center">
        <div className={cn(
            "px-10 py-3 rounded-2xl border-4 flex flex-col items-center min-w-[300px] shadow-lg",
            isActive ? "bg-primary text-white border-primary" : "bg-white border-slate-200 text-slate-800"
        )}>
            <span className="text-xl font-bold uppercase tracking-[0.2em] leading-none mb-1">
                {format(day, 'eeee', { locale: ptBR })}
            </span>
            <span className="text-6xl font-black tracking-tighter">
                {format(day, 'dd/MM')}
            </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 flex-grow overflow-hidden">
        {/* Coluna Produção */}
        <section className="flex flex-col gap-3 min-h-0">
            <div className="flex items-center gap-3 text-blue-700 bg-blue-50 p-3 rounded-xl border border-blue-100 flex-shrink-0">
                <Hammer className="h-8 w-8" />
                <h2 className="text-3xl font-black uppercase tracking-tight">Produção Fábrica</h2>
            </div>
            <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-3 pb-4">
                {producao.length > 0 ? producao.map(item => (
                    <ScheduleCard key={`${item.id}-${format(day, 'yyyy-MM-dd')}`} item={item} type="producao" />
                )) : (
                    <EmptyState message="Sem produção agendada" />
                )}
            </div>
        </section>

        {/* Coluna Montagem */}
        <section className="flex flex-col gap-3 min-h-0">
            <div className="flex items-center gap-3 text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex-shrink-0">
                <Truck className="h-8 w-8" />
                <h2 className="text-3xl font-black uppercase tracking-tight">Montagem Externo</h2>
            </div>
            <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-3 pb-4">
                {montagem.length > 0 ? montagem.map(item => (
                    <ScheduleCard key={`${item.id}-${format(day, 'yyyy-MM-dd')}`} item={item} type="montagem" />
                )) : (
                    <EmptyState message="Sem montagens externas" />
                )}
            </div>
        </section>
      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}

function ScheduleCard({ item, type }: { item: ScheduleItem, type: 'producao' | 'montagem' }) {
    const isProducao = type === 'producao';
    
    return (
        <div className={cn(
            "p-4 rounded-2xl border-4 bg-white shadow-md relative transition-all",
            item.isDone ? "bg-emerald-50 border-emerald-300" : "border-slate-200",
            item.isDelayed && !item.isDone && "bg-red-50 border-red-300",
            isProducao ? "border-l-[12px] border-l-blue-600" : "border-l-[12px] border-l-emerald-600",
            item.isDone && "border-l-emerald-600",
            item.isDelayed && !item.isDone && "border-l-red-600"
        )}>
            <div className="flex justify-between items-start gap-3">
                <div className="flex-grow min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className={cn("text-3xl font-black tracking-tight truncate leading-tight text-slate-900", item.isDone && "line-through opacity-60")}>
                            {item.title}
                        </h3>
                        {item.isDone ? (
                            <span className="bg-emerald-600 text-white text-lg font-black px-2 py-0.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                                <CheckCircle2 className="h-4 w-4" /> CONCLUÍDO
                            </span>
                        ) : item.isDelayed && !item.isDone ? (
                            <span className="bg-red-600 text-white text-lg font-black px-2 py-0.5 rounded-lg flex items-center gap-1.5 shadow-sm animate-pulse">
                                <AlertCircle className="h-4 w-4" /> EM ATRASO
                            </span>
                        ) : null}
                    </div>
                    <p className="text-xl text-slate-600 font-bold tracking-tight truncate">
                        {item.description}
                    </p>
                    {item.location && (
                        <div className="text-lg text-primary font-bold italic mt-1 flex items-center gap-2 bg-slate-50 px-2 py-0.5 rounded-lg w-fit border border-slate-100">
                            <Truck className="h-4 w-4" /> {item.location}
                        </div>
                    )}
                </div>
                <div className="flex-shrink-0 pt-1">
                    {item.isDone ? (
                        <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                    ) : (
                        <Clock className={cn("h-10 w-10", isProducao ? "text-blue-600" : "text-emerald-600")} />
                    )}
                </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap gap-2 items-center">
                <User className="h-5 w-5 text-slate-400" />
                <span className="text-lg font-black text-slate-800 uppercase tracking-tight">
                    {item.responsible.length > 0 ? `Marceneiro: ${item.responsible.join('  •  ')}` : 'Equipa Torino'}
                </span>
            </div>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="h-24 flex items-center justify-center border-4 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <p className="text-xl text-slate-400 font-black uppercase tracking-widest italic">{message}</p>
        </div>
    );
}
