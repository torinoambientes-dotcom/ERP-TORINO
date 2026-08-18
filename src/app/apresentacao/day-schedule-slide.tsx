'use client';
import { useMemo } from 'react';
import type { Project, Appointment, TeamMember } from '@/lib/types';
import { format, isSameDay, parseISO, isToday, startOfDay, endOfDay, isWithinInterval, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Hammer, Truck, Clock, CheckCircle2, User, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

function getInitials(name: string): string {
  if (!name) return 'M';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const CARPENTER_COLOR_PALETTES = [
  { hex: '#2563EB', bg: 'bg-blue-600', border: 'border-blue-600', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-900 border-blue-300' },
  { hex: '#059669', bg: 'bg-emerald-600', border: 'border-emerald-600', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  { hex: '#D97706', bg: 'bg-amber-600', border: 'border-amber-600', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-900 border-amber-300' },
  { hex: '#7C3AED', bg: 'bg-purple-600', border: 'border-purple-600', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-900 border-purple-300' },
  { hex: '#DB2777', bg: 'bg-pink-600', border: 'border-pink-600', text: 'text-pink-700', badge: 'bg-pink-100 text-pink-900 border-pink-300' },
  { hex: '#0891B2', bg: 'bg-cyan-600', border: 'border-cyan-600', text: 'text-cyan-700', badge: 'bg-cyan-100 text-cyan-900 border-cyan-300' },
  { hex: '#EA580C', bg: 'bg-orange-600', border: 'border-orange-600', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-900 border-orange-300' },
  { hex: '#0D9488', bg: 'bg-teal-600', border: 'border-teal-600', text: 'text-teal-700', badge: 'bg-teal-100 text-teal-900 border-teal-300' },
  { hex: '#4F46E5', bg: 'bg-indigo-600', border: 'border-indigo-600', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-900 border-indigo-300' },
  { hex: '#E11D48', bg: 'bg-rose-600', border: 'border-rose-600', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-900 border-rose-300' },
];

export function getCarpenterPalette(member?: TeamMember | null, index: number = 0) {
  const paletteIndex = index % CARPENTER_COLOR_PALETTES.length;
  const fallback = CARPENTER_COLOR_PALETTES[paletteIndex];
  if (!member) return fallback;
  if (member.color) {
    return {
      ...fallback,
      hex: member.color,
    };
  }
  return fallback;
}

export interface CarpenterDetail {
  id: string;
  name: string;
  shortName: string;
  color: string;
  avatarUrl?: string;
  palette: typeof CARPENTER_COLOR_PALETTES[number];
}

export interface ScheduleItem {
  id: string;
  title: string;
  description?: string;
  location?: string;
  responsibleDetails: CarpenterDetail[];
  isDone: boolean;
  isDelayed: boolean;
  category?: 'producao' | 'montagem';
}

interface DayScheduleSlideProps {
  day: Date;
  projects: Project[];
  appointments: Appointment[];
  teamMembers: TeamMember[];
  selectedCarpenterIds: string[] | null;
  viewMode: 'marceneiro' | 'tipo';
}

export function DayScheduleSlide({
  day,
  projects,
  appointments,
  teamMembers,
  selectedCarpenterIds,
  viewMode
}: DayScheduleSlideProps) {

  // Mapeamento e cores para cada membro da equipe
  const memberMap = useMemo(() => {
    const map = new Map<string, CarpenterDetail>();
    let idx = 0;
    (teamMembers || []).forEach(member => {
      const palette = getCarpenterPalette(member, idx);
      idx++;
      map.set(member.id, {
        id: member.id,
        name: member.name,
        shortName: member.name.split(' ')[0],
        color: member.color || palette.hex,
        avatarUrl: member.avatarUrl,
        palette
      });
    });
    return map;
  }, [teamMembers]);

  const checkIfDelayed = (status: string | undefined, deadlineDate: Date): boolean => {
    if (status === 'done') return false;
    const today = startOfDay(new Date());
    const target = startOfDay(deadlineDate);
    return isBefore(target, today);
  };

  // Coleta de itens do dia
  const { allItems, producao, montagem, carpenterGroups } = useMemo(() => {
    const items: ScheduleItem[] = [];

    projects.forEach(project => {
      project.environments.forEach(env => {
        env.furniture.forEach(fur => {
          const stage = fur.assembly;
          if (stage?.scheduledFor && isSameDay(parseISO(stage.scheduledFor), day)) {
            const isRelevant = !selectedCarpenterIds || 
                               (stage.responsibleIds || []).some(id => selectedCarpenterIds.includes(id));

            if (isRelevant) {
              const respDetails = (stage.responsibleIds || [])
                .map(id => memberMap.get(id))
                .filter(Boolean) as CarpenterDetail[];

              items.push({
                id: fur.id,
                title: fur.name,
                description: project.clientName,
                responsibleDetails: respDetails,
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
            const respDetails = (apt.memberIds || [])
              .map(id => memberMap.get(id))
              .filter(Boolean) as CarpenterDetail[];

            items.push({
              id: apt.id,
              title: apt.title,
              description: apt.description,
              location: apt.location,
              responsibleDetails: respDetails,
              isDone: apt.status === 'done',
              isDelayed: checkIfDelayed(apt.status, parseISO(apt.end)),
              category: (apt.category as any) || 'producao'
            });
          }
        }
      }
    });

    const prod = items.filter(i => i.category === 'producao');
    const mont = items.filter(i => i.category === 'montagem');

    // Agrupamento por Marceneiro
    const groups = new Map<string, { carpenter: CarpenterDetail; items: ScheduleItem[] }>();

    items.forEach(item => {
      if (item.responsibleDetails.length === 0) {
        const unassignedId = 'unassigned';
        if (!groups.has(unassignedId)) {
          groups.set(unassignedId, {
            carpenter: {
              id: 'unassigned',
              name: 'Equipa Torino',
              shortName: 'Geral',
              color: '#475569',
              palette: CARPENTER_COLOR_PALETTES[0]
            },
            items: []
          });
        }
        groups.get(unassignedId)!.items.push(item);
      } else {
        item.responsibleDetails.forEach(carpenter => {
          if (!groups.has(carpenter.id)) {
            groups.set(carpenter.id, { carpenter, items: [] });
          }
          groups.get(carpenter.id)!.items.push(item);
        });
      }
    });

    return {
      allItems: items,
      producao: prod,
      montagem: mont,
      carpenterGroups: Array.from(groups.values())
    };
  }, [day, projects, appointments, memberMap, selectedCarpenterIds]);

  const isActive = isToday(day);

  return (
    <div className="flex flex-col h-full w-full p-6 gap-6 overflow-hidden select-none bg-slate-100">
      
      {/* Banner de Informação do Dia */}
      <div className="flex items-center justify-between bg-white px-6 py-3.5 rounded-2xl border-2 border-slate-200 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className={cn(
            "px-5 py-2 rounded-xl font-black text-center min-w-[150px] shadow-sm",
            isActive ? "bg-primary text-white" : "bg-slate-900 text-white"
          )}>
            <span className="text-xs uppercase tracking-widest block leading-none opacity-80">
              {format(day, 'eeee', { locale: ptBR })}
            </span>
            <span className="text-2xl tracking-tighter block leading-tight mt-0.5">
              {format(day, 'dd/MM')}
            </span>
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              Programação do Dia
            </h2>
            <p className="text-sm font-bold text-slate-500">
              {allItems.length} {allItems.length === 1 ? 'tarefa agendada' : 'tarefas agendadas'} • {allItems.filter(i => i.isDone).length} concluídas
            </p>
          </div>
        </div>

        {/* Resumo visual rápido */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span className="text-sm font-black text-emerald-900">
              {allItems.filter(i => i.isDone).length} Concluídas
            </span>
          </div>

          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl">
            <Clock className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-black text-blue-900">
              {allItems.filter(i => !i.isDone).length} Pendentes
            </span>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal do Slide */}
      {viewMode === 'marceneiro' ? (
        /* VISÃO POR MARCENEIRO (CARDS ORGANIZADOS POR COLUNAS) */
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
          {carpenterGroups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
              {carpenterGroups.map(({ carpenter, items }) => (
                <CarpenterColumnCard key={carpenter.id} carpenter={carpenter} items={items} day={day} />
              ))}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-300 p-8">
              <Hammer className="h-12 w-12 text-slate-300 mb-2" />
              <p className="text-xl font-black uppercase text-slate-400">Nenhum marceneiro com produção agendada para este dia</p>
            </div>
          )}
        </div>
      ) : (
        /* VISÃO POR TIPO (PRODUÇÃO FÁBRICA VS MONTAGEM EXTERNO) */
        <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
          {/* Coluna Produção Fábrica */}
          <div className="flex-1 flex flex-col gap-4 bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-sm min-w-0">
            <div className="flex items-center justify-between text-blue-900 bg-blue-50/80 p-3 rounded-xl border border-blue-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                <Hammer className="h-6 w-6 text-blue-600" />
                <h3 className="text-xl font-black uppercase tracking-tight">Produção Fábrica</h3>
              </div>
              <Badge className="bg-blue-600 text-white font-black px-2.5 py-1 text-sm">
                {producao.length} tarefas
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-4">
              {producao.length > 0 ? (
                producao.map(item => (
                  <ScheduleTaskCard key={`${item.id}-${format(day, 'yyyy-MM-dd')}`} item={item} type="producao" />
                ))
              ) : (
                <EmptyState message="Sem produção agendada para hoje" />
              )}
            </div>
          </div>

          {/* Coluna Montagem Externa */}
          <div className="flex-1 flex flex-col gap-4 bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-sm min-w-0">
            <div className="flex items-center justify-between text-emerald-900 bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                <Truck className="h-6 w-6 text-emerald-600" />
                <h3 className="text-xl font-black uppercase tracking-tight">Montagem Externo</h3>
              </div>
              <Badge className="bg-emerald-600 text-white font-black px-2.5 py-1 text-sm">
                {montagem.length} tarefas
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-4">
              {montagem.length > 0 ? (
                montagem.map(item => (
                  <ScheduleTaskCard key={`${item.id}-${format(day, 'yyyy-MM-dd')}`} item={item} type="montagem" />
                ))
              ) : (
                <EmptyState message="Sem montagens externas agendadas" />
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}

// Card de Coluna de Marceneiro (Organizado e Legível)
function CarpenterColumnCard({ carpenter, items, day }: { carpenter: CarpenterDetail; items: ScheduleItem[]; day: Date }) {
  const doneCount = items.filter(i => i.isDone).length;
  const progressPercent = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Cabeçalho do Marceneiro */}
      <div 
        className="p-4 border-b-2 flex items-center justify-between gap-3 text-white"
        style={{ backgroundColor: carpenter.color }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-11 w-11 border-2 border-white/80 shadow-xs shrink-0">
            {carpenter.avatarUrl && <AvatarImage src={carpenter.avatarUrl} />}
            <AvatarFallback className="font-black text-slate-900 bg-white text-base">
              {getInitials(carpenter.name)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <h3 className="text-xl font-black tracking-tight uppercase truncate leading-tight">
              {carpenter.name}
            </h3>
            <p className="text-xs font-bold opacity-90">
              {items.length} {items.length === 1 ? 'tarefa' : 'tarefas'}
            </p>
          </div>
        </div>

        {/* Badge Progresso */}
        <div className="bg-black/20 border border-white/30 px-3 py-1.5 rounded-xl flex flex-col items-center shrink-0">
          <span className="text-sm font-black leading-none">{progressPercent}%</span>
          <span className="text-[10px] font-bold opacity-80 leading-none mt-0.5">{doneCount}/{items.length}</span>
        </div>
      </div>

      {/* Barra de Progresso */}
      <div className="w-full bg-slate-100 h-2 border-b border-slate-200">
        <div 
          className="h-full transition-all duration-500"
          style={{ width: `${progressPercent}%`, backgroundColor: carpenter.color }}
        />
      </div>

      {/* Lista de Tarefas do Marceneiro */}
      <div className="p-4 space-y-4 max-h-[650px] overflow-y-auto custom-scrollbar">
        {items.map(item => (
          <ScheduleTaskCard 
            key={`${item.id}-${carpenter.id}-${format(day, 'yyyy-MM-dd')}`} 
            item={item} 
            type={item.category || 'producao'}
            accentColor={carpenter.color}
          />
        ))}
      </div>
    </div>
  );
}

// Card de Tarefa de Altíssima Legibilidade para TVs
function ScheduleTaskCard({ 
  item, 
  type,
  accentColor
}: { 
  item: ScheduleItem; 
  type: 'producao' | 'montagem';
  accentColor?: string;
}) {
  const isProducao = type === 'producao';
  const primaryCarpenter = item.responsibleDetails[0];
  const borderAccent = accentColor || primaryCarpenter?.color || (isProducao ? '#2563EB' : '#059669');

  return (
    <div 
      className={cn(
        "p-4 rounded-xl border-2 bg-white shadow-xs flex flex-col gap-3 transition-all",
        item.isDone ? "bg-emerald-50/60 border-emerald-300" : "border-slate-200 hover:border-slate-300",
        item.isDelayed && !item.isDone && "bg-red-50/60 border-red-300"
      )}
      style={{ borderLeftWidth: '10px', borderLeftColor: borderAccent }}
    >
      {/* Topo do Card: Nome do Móvel/Projeto + Status */}
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0 flex-1">
          <h4 className={cn(
            "text-2xl font-black text-slate-900 tracking-tight leading-tight uppercase",
            item.isDone && "text-slate-600"
          )}>
            {item.title}
          </h4>
          <p className="text-lg font-bold text-slate-700 mt-0.5">
            {item.description}
          </p>
        </div>

        {/* Status Pill em Destaque */}
        <div className="shrink-0">
          {item.isDone ? (
            <span className="bg-emerald-600 text-white text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs uppercase tracking-wider">
              <CheckCircle2 className="h-4 w-4" /> Concluído
            </span>
          ) : item.isDelayed && !item.isDone ? (
            <span className="bg-red-600 text-white text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-pulse shadow-xs uppercase tracking-wider">
              <AlertCircle className="h-4 w-4" /> Em Atraso
            </span>
          ) : (
            <span className="bg-blue-600 text-white text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs uppercase tracking-wider">
              <Clock className="h-4 w-4" /> Em Andamento
            </span>
          )}
        </div>
      </div>

      {/* Local de Montagem se Houver */}
      {item.location && (
        <div className="flex items-center gap-2 bg-slate-100 text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold w-fit">
          <Truck className="h-4 w-4 text-primary shrink-0" />
          <span>Local: {item.location}</span>
        </div>
      )}

      {/* Rodapé: Marceneiros Responsáveis com Cores */}
      <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <User className="h-4 w-4 text-slate-400 shrink-0" />
          <span className="text-xs font-black uppercase text-slate-500 mr-1">Responsável:</span>
          
          {item.responsibleDetails.length > 0 ? (
            item.responsibleDetails.map(carpenter => (
              <span 
                key={carpenter.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black text-white shadow-2xs"
                style={{ backgroundColor: carpenter.color }}
              >
                <span>{carpenter.name}</span>
              </span>
            ))
          ) : (
            <span className="text-xs font-black text-slate-600 uppercase bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
              Equipa Torino
            </span>
          )}
        </div>

        {/* Tag Categoria */}
        <span className={cn(
          "text-xs font-black uppercase px-2.5 py-1 rounded-lg border shrink-0",
          isProducao ? "bg-blue-50 text-blue-800 border-blue-200" : "bg-emerald-50 text-emerald-800 border-emerald-200"
        )}>
          {isProducao ? 'Fábrica' : 'Montagem'}
        </span>
      </div>

    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/80">
      <p className="text-base text-slate-400 font-black uppercase tracking-wider italic">{message}</p>
    </div>
  );
}
