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
import { Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';

function FactoryDisplayContent() {
  const { projects, teamMembers, appointments, isLoading } = useContext(AppContext);
  const searchParams = useSearchParams();

  const [api, setApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-900">
        <p className="text-5xl font-black animate-pulse uppercase tracking-tighter">Carregando Programação...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-100 text-slate-900 h-screen flex flex-col relative overflow-hidden select-none">
        
        {!isFullscreen && (
          <div className="absolute top-6 right-6 z-50 animate-bounce">
            <Button size="lg" onClick={toggleFullscreen} className="bg-primary hover:bg-primary/90 text-white font-black px-10 py-8 rounded-3xl shadow-2xl flex gap-4 text-2xl border-4 border-white">
              <Maximize className="h-10 w-10" />
              ATIVAR ECRÃ INTEIRO
            </Button>
          </div>
        )}

        {/* Header Fixo - Reduzi a altura para ganhar espaço vertical */}
        <header className="px-8 py-4 border-b-4 border-slate-200 bg-white flex justify-between items-center z-10 shadow-md">
            <div className="flex items-center gap-6">
                <div className="h-10 w-4 bg-primary rounded-full shadow-sm"></div>
                <h1 className="text-4xl font-black tracking-tighter uppercase text-slate-800">Programação Torino</h1>
            </div>
            <div className="text-right">
                <p className="text-slate-500 text-xl font-bold uppercase tracking-widest">
                    {format(new Date(), "eeee, dd 'de' MMMM", { locale: ptBR })}
                </p>
            </div>
        </header>

        {/* Main Content - Flex grow para ocupar tudo */}
        <main className="flex-1 flex flex-col min-h-0 pt-4">
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
                            />
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>
        </main>

        {/* Indicadores de Progresso - Mais visíveis */}
        <div className="flex justify-center gap-6 pb-4">
            {weekDays.map((_, index) => (
                <div
                    key={index}
                    className={`h-4 rounded-full transition-all duration-700 ease-in-out border-2 ${
                        index === currentSlide 
                        ? 'w-32 bg-primary border-primary shadow-lg scale-110' 
                        : 'w-4 bg-slate-300 border-slate-200'
                    }`}
                />
            ))}
        </div>

        {customMessage && (
            <footer className="bg-primary border-t-4 border-white p-3 text-center shadow-2xl relative z-20">
                <p className="text-3xl font-black text-white uppercase tracking-[0.3em] animate-pulse">
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
