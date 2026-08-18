'use client';
import { useContext, useMemo, useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppContext } from '@/context/app-context';
import { DayScheduleSlide, getCarpenterPalette } from './day-schedule-slide';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { startOfWeek, addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Maximize, Users, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function FactoryDisplayContent() {
  const { projects, teamMembers, appointments, isLoading } = useContext(AppContext);
  const searchParams = useSearchParams();

  const [api, setApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const initialViewMode = useMemo(() => {
    const mode = searchParams.get('viewMode');
    return mode === 'tipo' ? 'tipo' : 'marceneiro';
  }, [searchParams]);

  const [viewMode, setViewMode] = useState<'marceneiro' | 'tipo'>(initialViewMode);

  const rotationTime = useMemo(() => {
    const time = searchParams.get('time');
    return time ? parseInt(time, 10) * 1000 : 30000;
  }, [searchParams]);

  const customMessage = useMemo(() => searchParams.get('message'), [searchParams]);
  
  const selectedCarpenterIds = useMemo(() => {
    const ids = searchParams.get('carpenters');
    return ids ? ids.split(',') : null;
  }, [searchParams]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 5 }).map((_, i) => addDays(start, i));
  }, []);

  // Lista dos marceneiros para a legenda do cabeçalho
  const marceneiros = useMemo(() => {
    const list = (teamMembers || []).filter(member => member.role === 'Marceneiro');
    if (selectedCarpenterIds) {
      return list.filter(m => selectedCarpenterIds.includes(m.id));
    }
    return list;
  }, [teamMembers, selectedCarpenterIds]);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrentSlide(api.selectedScrollSnap());
    api.on('select', onSelect);
    return () => api.off('select', onSelect);
  }, [api]);
  
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Erro ao ativar ecrã inteiro: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <p className="text-4xl font-black animate-pulse uppercase tracking-tighter">Carregando Programação Torino...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-100 text-slate-900 h-screen w-screen flex flex-col relative overflow-hidden select-none">
        
        {/* Header Unificado da Apresentação */}
        <header className="px-6 py-3 border-b-2 border-slate-200 bg-white flex flex-wrap justify-between items-center z-10 shadow-xs flex-shrink-0 gap-4">
            
            {/* Logo / Título */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-3 bg-primary rounded-full shadow-xs"></div>
              <div>
                <h1 className="text-2xl font-black tracking-tighter uppercase text-slate-900 leading-none">
                  Programação da Produção
                </h1>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-tight mt-0.5">
                  Torino Ambientes • TV Fábrica
                </p>
              </div>
            </div>

            {/* Legenda de Marceneiros com Cores */}
            <div className="hidden lg:flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider mr-1">Marceneiros:</span>
              {marceneiros.map((m, idx) => {
                const palette = getCarpenterPalette(m, idx);
                const colorHex = m.color || palette.hex;
                return (
                  <div key={m.id} className="flex items-center gap-2 px-3 py-1 rounded-full border bg-slate-50 text-xs font-black shadow-2xs">
                    <span 
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs" 
                      style={{ backgroundColor: colorHex }}
                    />
                    <span className="text-slate-800">{m.name}</span>
                  </div>
                );
              })}
            </div>

            {/* Seletor de Modo + Tela Cheia */}
            <div className="flex items-center gap-3">
              {/* Botões de Modo */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setViewMode('marceneiro')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black transition-all",
                    viewMode === 'marceneiro' 
                      ? "bg-primary text-white shadow-sm" 
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  )}
                >
                  <Users className="h-4 w-4" />
                  <span className="uppercase tracking-wider">Por Marceneiro</span>
                </button>

                <button
                  onClick={() => setViewMode('tipo')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black transition-all",
                    viewMode === 'tipo' 
                      ? "bg-primary text-white shadow-sm" 
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="uppercase tracking-wider">Por Tipo</span>
                </button>
              </div>

              {!isFullscreen && (
                <Button 
                  size="sm" 
                  onClick={toggleFullscreen} 
                  className="bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-3.5 py-1.5 rounded-xl shadow-xs flex gap-2 uppercase tracking-wider"
                >
                  <Maximize className="h-4 w-4" />
                  Tela Cheia
                </Button>
              )}
            </div>
        </header>

        {/* Main Content - Slides do Carrossel */}
        <main className="flex-1 min-h-0 relative">
            <Carousel
                setApi={setApi}
                plugins={[Autoplay({ delay: rotationTime, stopOnInteraction: false })]}
                className="w-full h-full"
            >
                <CarouselContent className="h-full">
                    {weekDays.map((day) => (
                        <CarouselItem key={day.toISOString()} className="h-full">
                            <DayScheduleSlide 
                                day={day} 
                                projects={projects} 
                                appointments={appointments}
                                teamMembers={teamMembers}
                                selectedCarpenterIds={selectedCarpenterIds}
                                viewMode={viewMode}
                            />
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>
        </main>

        {/* Rodapé Dinâmico */}
        <footer className="flex-shrink-0 bg-white border-t-2 border-slate-200">
            {customMessage && (
                <div className="bg-primary py-2 text-center shadow-inner">
                    <p className="text-xl font-black text-white uppercase tracking-[0.2em] animate-pulse">
                        {customMessage}
                    </p>
                </div>
            )}
            
            {/* Indicadores de Dias da Semana no Rodapé */}
            <div className="flex justify-center items-center gap-3 py-2 bg-white">
                {weekDays.map((day, index) => (
                    <div
                        key={index}
                        className={cn(
                          "flex items-center gap-2 px-4 py-1 rounded-full transition-all duration-300 text-xs font-black uppercase tracking-wider",
                          index === currentSlide ? "bg-primary text-white shadow-xs" : "bg-slate-100 text-slate-600"
                        )}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-current" />
                      <span>{format(day, 'eeee (dd/MM)', { locale: ptBR })}</span>
                    </div>
                ))}
            </div>
        </footer>
    </div>
  );
}

export default function ApresentacaoPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-900 text-white"><p className="text-2xl font-black">Carregando Apresentação...</p></div>}>
      <FactoryDisplayContent />
    </Suspense>
  );
}
