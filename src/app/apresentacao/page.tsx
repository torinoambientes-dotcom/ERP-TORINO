
'use client';
import { useContext, useMemo, useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppContext } from '@/context/app-context';
import { DayScheduleSlide } from './day-schedule-slide';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { startOfWeek, addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Maximize, MonitorPlay } from 'lucide-react';
import { Button } from '@/components/ui/button';

function FactoryDisplayContent() {
  const { projects, teamMembers, appointments, isLoading } = useContext(AppContext);
  const searchParams = useSearchParams();

  const [api, setApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Configurações via URL
  const rotationTime = useMemo(() => {
    const time = searchParams.get('time');
    return time ? parseInt(time, 10) * 1000 : 30000; // Default 30s
  }, [searchParams]);

  const customMessage = useMemo(() => searchParams.get('message'), [searchParams]);
  
  const selectedCarpenterIds = useMemo(() => {
    const ids = searchParams.get('carpenters');
    return ids ? ids.split(',') : null;
  }, [searchParams]);

  // Gerar os 5 dias úteis da semana atual (Segunda a Sexta)
  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 5 }).map((_, i) => addDays(start, i));
  }, []);

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
      document.exitFullscreen();
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
      <div className="flex h-screen items-center justify-center bg-white text-slate-900">
        <p className="text-5xl font-black animate-pulse uppercase tracking-tighter">Carregando Programação...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 text-slate-900 min-h-screen flex flex-col relative overflow-hidden select-none">
        
        {/* Botão de Ecrã Inteiro (Apenas visível se não estiver em fullscreen) */}
        {!isFullscreen && (
          <div className="absolute top-4 right-4 z-50 animate-bounce">
            <Button size="lg" onClick={toggleFullscreen} className="bg-primary hover:bg-primary/90 text-white font-black px-8 py-6 rounded-2xl shadow-2xl flex gap-3 text-xl">
              <Maximize className="h-8 w-8" />
              ATIVAR ECRÃ INTEIRO
            </Button>
          </div>
        )}

        {/* Header Fixo - Alto Contraste */}
        <header className="p-6 border-b-4 border-slate-200 bg-white flex justify-between items-center z-10 shadow-sm">
            <div className="flex items-center gap-6">
                <div className="h-12 w-4 bg-primary rounded-full shadow-sm"></div>
                <h1 className="text-5xl font-black tracking-tighter uppercase text-slate-800">Programação Torino</h1>
            </div>
            <div className="text-right">
                <p className="text-slate-500 text-2xl font-bold uppercase tracking-wider">
                    {format(new Date(), "eeee, dd 'de' MMMM", { locale: ptBR })}
                </p>
            </div>
        </header>

        <main className="flex-1 flex flex-col justify-center p-6">
            <Carousel
                setApi={setApi}
                plugins={[Autoplay({ delay: rotationTime, stopOnInteraction: false })]}
                className="w-full h-full"
            >
                <CarouselContent>
                    {weekDays.map((day) => (
                        <CarouselItem key={day.toISOString()} className="h-full">
                            <DayScheduleSlide 
                                day={day} 
                                projects={projects} 
                                appointments={appointments}
                                teamMembers={teamMembers}
                                selectedCarpenterIds={selectedCarpenterIds}
                            />
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>
        </main>

        {/* Indicadores de Progresso */}
        <div className="flex justify-center gap-4 pb-6">
            {weekDays.map((_, index) => (
                <div
                    key={index}
                    className={`h-3 rounded-full transition-all duration-700 ease-in-out ${
                        index === currentSlide 
                        ? 'w-24 bg-primary shadow-sm' 
                        : 'w-3 bg-slate-300'
                    }`}
                />
            ))}
        </div>

        {customMessage && (
            <footer className="bg-primary border-t-4 border-white p-4 text-center">
                <p className="text-3xl font-black text-white uppercase tracking-widest">
                    {customMessage}
                </p>
            </footer>
        )}
    </div>
  );
}

export default function ApresentacaoPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-white text-slate-900"><p className="text-4xl font-black">Carregando...</p></div>}>
      <FactoryDisplayContent />
    </Suspense>
  );
}
