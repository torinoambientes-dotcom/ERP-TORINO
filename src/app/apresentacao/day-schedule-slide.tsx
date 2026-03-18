'use client';
import { useMemo } from 'react';
import type { Project, Appointment, TeamMember } from '@/lib/types';
import { format, isSameDay, parseISO, isToday, startOfDay, endOfDay, isWithinInterval, isBefore } from 'date-fns';
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

  const checkIfDelayed = (status: string | undefined, deadlineDate: Date): boolean => {
    if (status === 'done') return false;
    const today = startOfDay(new Date());
    const target = startOfDay(deadlineDate);
    return isBefore(target, today);
  };

  const { producao, montagem } = useMemo(() => {
    const prodItems: ScheduleItem[] = [];
    const montItems: ScheduleItem[] = [];

    projects.forEach(project => {
      project.environments.forEach(env => {
        env.furniture.forEach(fur => {
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
                    isDelayed: checkIfDelayed(stage.status, parseISO(stage.scheduledFor)),
                    category: 'producao'
                });
            }
          }
        });
      });
    });

    appointments.forEach(apt => {
        if (apt.start && apt.end) {
            const start = startOfDay(parseISO(apt.start));
            const end = endOfDay(parseISO(apt.end));

            if (isWithinInterval(day, { start, end })) {
                const isRelevant = !selectedCarpenterIds || 
                                   (apt.memberIds || []).some(id => selectedCarpenterIds.includes(id));

                if (isRelevant) {
                    const item: ScheduleItem = {
                        id: apt.id,
                        title: apt.title,
                        description: apt.description,
                        location: apt.location,
                        responsible: (apt.memberIds || []).map(id => memberMap.get(id)?.name.split(' ')[0] || '').filter(Boolean),
                        isDone: apt.status === 'done',
                        isDelayed: checkIfDelayed(apt.status, parseISO(apt.end)),
                        category: apt.category as any
                    };

                    if (apt.category === 'producao') prodItems.push(item);
                    else if (apt.category === 'montagem') montItems.push(item);
                }
            }
        }
    });

    return { producao: prodItems, montagem: montItems };
  }, [day, projects, appointments, memberMap, selectedCarpenterIds]);

  const isActive = isToday(day);

  return (
    <div className="flex flex-col h-full w-full p-4 gap-4 overflow-hidden">
      {/* Indicador de Dia - Central e Compacto */}
      <div className="flex justify-center flex-shrink-0">
        <div className={cn(
            "px-8 py-2 rounded-xl border-4 flex flex-col items-center min-w-[250px] shadow-sm",
            isActive ? "bg-primary text-white border-primary" : "bg-white border-slate-200 text-slate-800"
        )}>
            <span className="text-sm font-black uppercase tracking-[0.2em] leading-tight">
                {format(day, 'eeee', { locale: ptBR })}
            </span>
            <span className="text-4xl font-black tracking-tighter">
                {format(day, 'dd/MM')}
            </span>
        </div>
      </div>

      {/* Colunas de Atividades - Flex-1 para ocupar o espaço restante */}
      <div className="flex flex-1 gap-4 min-h-0 overflow-hidden">
        {/* Coluna Produção */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
            <div className="flex items-center gap-3 text-blue-700 bg-blue-50 p-2 rounded-lg border border-blue-100 flex-shrink-0">
                <Hammer className="h-6 w-6" />
                <h2 className="text-xl font-black uppercase tracking-tight">Produção Fábrica</h2>
            </div>
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-3">
                {producao.length > 0 ? producao.map(item => (
                    <ScheduleCard key={`${item.id}-${format(day, 'yyyy-MM-dd')}`} item={item} type="producao" />
                )) : (
                    <EmptyState message="Sem produção agendada" />
                )}
            </div>
        </div>

        {/* Coluna Montagem */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
            <div className="flex items-center gap-3 text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-100 flex-shrink-0">
                <Truck className="h-6 w-6" />
                <h2 className="text-xl font-black uppercase tracking-tight">Montagem Externo</h2>
            </div>
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-3">
                {montagem.length > 0 ? montagem.map(item => (
                    <ScheduleCard key={`${item.id}-${format(day, 'yyyy-MM-dd')}`} item={item} type="montagem" />
                )) : (
                    <EmptyState message="Sem montagens externas" />
                )}
            </div>
        </div>
      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
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
            "p-3 rounded-xl border-2 bg-white shadow-sm relative transition-all",
            item.isDone ? "bg-emerald-50 border-emerald-300" : "border-slate-200",
            item.isDelayed && !item.isDone && "bg-red-50 border-red-300",
            isProducao ? "border-l-[10px] border-l-blue-600" : "border-l-[10px] border-l-emerald-600",
            item.isDone && "border-l-emerald-600",
            item.isDelayed && !item.isDone && "border-l-red-600"
        )}>
            <div className="flex justify-between items-start gap-2">
                <div className="flex-grow min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <h3 className={cn("text-xl font-black tracking-tight truncate leading-tight text-slate-900", item.isDone && "line-through opacity-60")}>
                            {item.title}
                        </h3>
                        {item.isDone ? (
                            <span className="bg-emerald-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> CONCLUÍDO
                            </span>
                        ) : item.isDelayed && !item.isDone ? (
                            <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 animate-pulse">
                                <AlertCircle className="h-3 w-3" /> EM ATRASO
                            </span>
                        ) : null}
                    </div>
                    <p className="text-base text-slate-600 font-bold tracking-tight truncate">
                        {item.description}
                    </p>
                    {item.location && (
                        <div className="text-xs text-primary font-bold italic mt-1 flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 w-fit">
                            <Truck className="h-3 w-3" /> {item.location}
                        </div>
                    )}
                </div>
                <div className="flex-shrink-0">
                    {item.isDone ? (
                        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    ) : (
                        <Clock className={cn("h-6 w-6", isProducao ? "text-blue-600" : "text-emerald-600")} />
                    )}
                </div>
            </div>

            <div className="mt-2 pt-1 border-t border-slate-100 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs font-black text-slate-800 uppercase tracking-tight truncate">
                    {item.responsible.length > 0 ? `Marceneiro: ${item.responsible.join('  •  ')}` : 'Equipa Torino'}
                </span>
            </div>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="h-20 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <p className="text-sm text-slate-400 font-black uppercase tracking-widest italic">{message}</p>
        </div>
    );
}
