'use client';
import { useContext, useMemo, useState, useEffect, Suspense } from 'react';
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
import { startOfWeek, addDays, format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function FactoryDisplayContent() {
  const { projects, teamMembers, appointments, isLoading } = useContext(AppContext);
  const searchParams = useSearchParams();

  const [api, setApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);

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
  
  useEffect(() => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-white">
        <p className="text-3xl font-bold animate-pulse">Carregando Programação da Fábrica...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-950 text-white min-h-screen flex flex-col relative overflow-hidden">
        {/* Header Fixo do Ecrã */}
        <header className="p-6 border-b border-gray-800 bg-gray-900/50 backdrop-blur-md flex justify-between items-center z-10">
            <div className="flex items-center gap-4">
                <div className="h-12 w-1 bg-primary rounded-full"></div>
                <h1 className="text-4xl font-black tracking-tighter uppercase">Programação da Oficina</h1>
            </div>
            <div className="text-right">
                <p className="text-gray-400 text-xl font-medium uppercase tracking-widest">
                    {format(new Date(), "eeee, dd 'de' MMMM", { locale: ptBR })}
                </p>
            </div>
        </header>

        <main className="flex-grow flex flex-col justify-center p-8">
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

        {/* Indicadores de Progresso dos Slides */}
        <div className="flex justify-center gap-3 pb-8">
            {weekDays.map((_, index) => (
                <div
                    key={index}
                    className={`h-3 rounded-full transition-all duration-500 ${
                        index === currentSlide ? 'w-16 bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]' : 'w-3 bg-gray-800'
                    }`}
                />
            ))}
        </div>

        {customMessage && (
            <footer className="bg-primary/10 border-t border-primary/20 p-4 text-center">
                <p className="text-2xl font-bold text-primary animate-bounce uppercase tracking-wide">
                    {customMessage}
                </p>
            </footer>
        )}
    </div>
  );
}

export default function ApresentacaoPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-950 text-white"><p>Carregando...</p></div>}>
      <FactoryDisplayContent />
    </Suspense>
  );
}
