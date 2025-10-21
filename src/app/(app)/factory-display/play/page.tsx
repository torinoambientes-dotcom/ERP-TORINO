'use client';
import { useContext, useMemo, useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppContext } from '@/context/app-context';
import type { TeamMember } from '@/lib/types';
import { CarpenterSlide } from './carpenter-slide';
import { MonthlyProductionSlide } from './monthly-production-slide';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { Logo } from '@/components/logo';
import type { ExtraProject } from '../page';


function FactoryDisplayContent() {
  const { teamMembers, isLoading } = useContext(AppContext);
  const searchParams = useSearchParams();

  const [api, setApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);

  const rotationTime = useMemo(() => {
    const time = searchParams.get('time');
    return time ? parseInt(time, 10) * 1000 : 60000;
  }, [searchParams]);

  const customMessage = useMemo(() => searchParams.get('message'), [searchParams]);
  
  const selectedCarpenterIds = useMemo(() => {
    const ids = searchParams.get('carpenters');
    return ids ? ids.split(',') : null;
  }, [searchParams]);

  const extraProjects = useMemo((): ExtraProject[] => {
    const data = searchParams.get('extraProjects');
    try {
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
  }, [searchParams]);

  const marceneiros = useMemo(() => {
    const allMarceneiros = (teamMembers || []).filter((member) => member.role === 'Marceneiro');
    if (selectedCarpenterIds) {
      return allMarceneiros.filter(m => selectedCarpenterIds.includes(m.id));
    }
    return allMarceneiros;
  }, [teamMembers, selectedCarpenterIds]);

  useEffect(() => {
    if (!api) {
      return;
    }

    const onSelect = () => {
      setCurrentSlide(api.selectedScrollSnap());
    };

    api.on('select', onSelect);

    return () => {
      api.off('select', onSelect);
    };
  }, [api]);
  
  const totalSlides = marceneiros.length + 1;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        <p className="text-2xl font-bold">A carregar dados da fábrica...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen p-8 flex flex-col">
      <header className="mb-8 flex items-center justify-between">
        <Logo className="h-20 w-auto text-white" />
        <p className="text-xl font-medium text-gray-400">
          Progresso da produção em tempo real
        </p>
      </header>

      <main className="flex-grow flex flex-col justify-center">
        {marceneiros.length > 0 ? (
          <Carousel
            setApi={setApi}
            plugins={[Autoplay({ delay: rotationTime, stopOnInteraction: true })]}
            className="w-full"
          >
            <CarouselContent>
              {marceneiros.map((marceneiro) => (
                <CarouselItem key={marceneiro.id}>
                  <CarpenterSlide marceneiro={marceneiro} extraProjects={extraProjects} />
                </CarouselItem>
              ))}
               <CarouselItem key="monthly-production">
                  <MonthlyProductionSlide />
                </CarouselItem>
            </CarouselContent>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {Array.from({ length: totalSlides }).map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-8 rounded-full transition-all ${
                    index === currentSlide ? 'bg-primary' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </Carousel>
        ) : (
          <div className="flex items-center justify-center h-96">
            <p className="text-xl text-gray-400">
              Nenhum marceneiro selecionado para exibir.
            </p>
          </div>
        )}
      </main>

      {customMessage && (
        <footer className="mt-8 text-center text-2xl font-semibold text-amber-300 tracking-wide">
          <p>{customMessage}</p>
        </footer>
      )}
    </div>
  );
}

export default function FactoryDisplayPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-900 text-white"><p>A carregar...</p></div>}>
      <FactoryDisplayContent />
    </Suspense>
  );
}
