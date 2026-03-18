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
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-900">
        <p className="text-4xl font-black animate-pulse uppercase tracking-tighter">Carregando Programação...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-100 text-slate-900 h-screen w-screen flex flex-col relative overflow-hidden select-none">
        
        {!isFullscreen && (
          <div className="absolute top-4 right-4 z-[100]">
            <Button 
              size="sm" 
              onClick={toggleFullscreen} 
              className="bg-primary hover:bg-primary/90 text-white font-bold px-4 py-2 rounded-full shadow-lg flex gap-2 border-2 border-white"
            >
              <Maximize className="h-4 w-4" />
              TELA CHEIA
            </Button>
          </div>
        )}

        {/* Header Fixo - Compacto para ganhar espaço */}
        <header className="px-6 py-3 border-b-2 border-slate-200 bg-white flex justify-between items-center z-10 shadow-sm flex-shrink-0">
            <div className="flex items-center gap-4">
                <div className="h-8 w-3 bg-primary rounded-full shadow-sm"></div>
                <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-800">Programação Torino</h1>
            </div>
            <div className="text-right">
                <p className="text-slate-500 text-lg font-bold uppercase tracking-widest">
                    {format(new Date(), "eeee, dd 'de' MMMM", { locale: ptBR })}
                </p>
            </div>
        </header>

        {/* Main Content - Flex-1 para ocupar o restante da tela */}
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
                    <p className="text-2xl font-black text-white uppercase tracking-[0.2em] animate-pulse">
                        {customMessage}
                    </p>
                </div>
            )}
            
            {/* Indicadores de Progresso */}
            <div className="flex justify-center gap-4 py-2 bg-white">
                {weekDays.map((_, index) => (
                    <div
                        key={index}
                        className={`h-2 rounded-full transition-all duration-700 ease-in-out ${
                            index === currentSlide 
                            ? 'w-16 bg-primary' 
                            : 'w-2 bg-slate-300'
                        }`}
                    />
                ))}
            </div>
        </footer>
    </div>
  );
}

export default function ApresentacaoPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-white text-slate-900"><p className="text-2xl font-black">Carregando...</p></div>}>
      <FactoryDisplayContent />
    </Suspense>
  );
}
