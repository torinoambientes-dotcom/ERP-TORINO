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
import { startOfWeek, addDays, format } from 'date-fns';
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
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <p className="text-5xl font-black animate-pulse uppercase tracking-tighter">Carregando Programação...</p>
      </div>
    );
  }

  return (
    <div className="bg-black text-white min-h-screen flex flex-col relative overflow-hidden select-none">
        {/* Header Fixo do Ecrã - Mais Robusto */}
        <header className="p-8 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-xl flex justify-between items-center z-10 shadow-2xl">
            <div className="flex items-center gap-6">
                <div className="h-16 w-3 bg-primary rounded-full shadow-[0_0_20px_rgba(var(--primary),0.6)]"></div>
                <h1 className="text-6xl font-black tracking-tighter uppercase">Programação da Oficina</h1>
            </div>
            <div className="text-right">
                <p className="text-zinc-400 text-3xl font-bold uppercase tracking-[0.2em]">
                    {format(new Date(), "eeee, dd 'de' MMMM", { locale: ptBR })}
                </p>
            </div>
        </header>

        <main className="flex-1 flex flex-col justify-center p-10">
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

        {/* Indicadores de Progresso dos Slides - Mais Elegantes */}
        <div className="flex justify-center gap-6 pb-10">
            {weekDays.map((_, index) => (
                <div
                    key={index}
                    className={`h-4 rounded-full transition-all duration-1000 ease-in-out ${
                        index === currentSlide 
                        ? 'w-32 bg-primary shadow-[0_0_25px_rgba(var(--primary),0.8)]' 
                        : 'w-4 bg-zinc-800'
                    }`}
                />
            ))}
        </div>

        {customMessage && (
            <footer className="bg-primary/20 border-t-2 border-primary/30 p-6 text-center shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                <p className="text-4xl font-black text-primary animate-pulse uppercase tracking-widest">
                    {customMessage}
                </p>
            </footer>
        )}
    </div>
  );
}

export default function ApresentacaoPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-black text-white"><p className="text-4xl font-black">Carregando...</p></div>}>
      <FactoryDisplayContent />
    </Suspense>
  );
}
