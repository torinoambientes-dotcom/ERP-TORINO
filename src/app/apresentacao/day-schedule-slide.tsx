'use client';
import { useMemo } from 'react';
import type { Project, Appointment, TeamMember } from '@/lib/types';
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
          // Ignorar Etapa de Corte conforme solicitação
          
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

    // 2. Adicionar Compromissos Manuais (Ignorar categoria 'corte')
    appointments.forEach(apt => {
        if (apt.start && isSameDay(parseISO(apt.start), day)) {
            if (apt.category === 'producao') {
                prodItems.push({
                    id: apt.id,
                    title: apt.title,
                    description: apt.description,
                    responsible: (apt.memberIds || []).map(id => memberMap.get(id)?.name.split(' ')[0] || '').filter(Boolean),
                    isDone: apt.status === 'done',
                    category: 'producao'
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
        producao: prodItems, 
        montagem: montItems 
    };
  }, [day, projects, appointments, memberMap, selectedCarpenterIds]);

  const isActive = isToday(day);

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Indicador de Dia - Ultra Legível */}
      <div className="flex items-center justify-center">
        <div className={cn(
            "px-12 py-4 rounded-3xl border-4 flex flex-col items-center min-w-[350px] shadow-sm",
            isActive ? "bg-primary text-white border-primary" : "bg-white border-slate-200 text-slate-800"
        )}>
            <span className="text-2xl font-bold uppercase tracking-[0.2em] leading-none mb-1">
                {format(day, 'eeee', { locale: ptBR })}
            </span>
            <span className="text-7xl font-black tracking-tighter">
                {format(day, 'dd/MM')}
            </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 flex-grow overflow-hidden pb-2">
        {/* Coluna Produção */}
        <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3 text-blue-700 bg-blue-50 p-3 rounded-2xl border border-blue-100">
                <Hammer className="h-10 w-10" />
                <h2 className="text-4xl font-black uppercase tracking-tight">Produção Fábrica</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 overflow-y-auto pr-2 custom-scrollbar">
                {producao.length > 0 ? producao.map(item => (
                    <ScheduleCard key={item.id} item={item} type="producao" />
                )) : (
                    <EmptyState message="Sem produção agendada" />
                )}
            </div>
        </section>

        {/* Coluna Montagem */}
        <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3 text-emerald-700 bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                <Truck className="h-10 w-10" />
                <h2 className="text-4xl font-black uppercase tracking-tight">Montagem Externo</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 overflow-y-auto pr-2 custom-scrollbar">
                {montagem.length > 0 ? montagem.map(item => (
                    <ScheduleCard key={item.id} item={item} type="montagem" />
                )) : (
                    <EmptyState message="Sem montagens externas" />
                )}
            </div>
        </section>
      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; border: 2px solid #f1f5f9; }
      `}</style>
    </div>
  );
}

function ScheduleCard({ item, type }: { item: ScheduleItem, type: 'producao' | 'montagem' }) {
    const isProducao = type === 'producao';
    
    return (
        <div className={cn(
            "p-5 rounded-3xl border-4 bg-white shadow-sm relative transition-all",
            item.isDone ? "opacity-40 grayscale" : "opacity-100",
            isProducao ? "border-l-[16px] border-blue-600 border-slate-100" : "border-l-[16px] border-emerald-600 border-slate-100"
        )}>
            <div className="flex justify-between items-start gap-4">
                <div className="flex-grow min-w-0">
                    <h3 className={cn("text-4xl font-black tracking-tight truncate leading-tight text-slate-900", item.isDone && "line-through")}>
                        {item.title}
                    </h3>
                    <p className="text-2xl text-slate-600 font-bold tracking-tight truncate">
                        {item.description}
                    </p>
                    {item.location && (
                        <div className="text-xl text-primary font-bold italic mt-2 flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-xl w-fit">
                            <Truck className="h-5 w-5" /> {item.location}
                        </div>
                    )}
                </div>
                <div className="flex-shrink-0 pt-1">
                    {item.isDone ? (
                        <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                    ) : (
                        <Clock className={cn("h-12 w-12", isProducao ? "text-blue-600" : "text-emerald-600")} />
                    )}
                </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-3 items-center">
                <User className="h-6 w-6 text-slate-400" />
                <span className="text-xl font-bold text-slate-700 uppercase tracking-tight">
                    {item.responsible.length > 0 ? item.responsible.join('  •  ') : 'Equipa Torino'}
                </span>
            </div>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="h-32 flex items-center justify-center border-4 border-dashed border-slate-200 rounded-3xl bg-slate-50">
            <p className="text-2xl text-slate-400 font-black uppercase tracking-widest italic">{message}</p>
        </div>
    );
}
