'use client';
import { useContext, useMemo, useState, useEffect } from 'react';
import { AppContext } from '@/context/app-context';
import type { TeamMember } from '@/lib/types';
import { CarpenterSlide } from './carpenter-slide';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { Logo } from '@/components/logo';

export default function FactoryDisplayPage() {
  const { teamMembers, isLoading } = useContext(AppContext);
  const [api, setApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);

  const marceneiros = useMemo(() => {
    return (teamMembers || []).filter((member) => member.role === 'Marceneiro');
  }, [teamMembers]);

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

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        <p className="text-2xl font-bold">A carregar dados da fábrica...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen p-8">
      <div className="mb-8">
        <Logo className="h-20 w-auto text-white" />
        <p className="mt-2 text-lg text-gray-300">
          Progresso da produção em tempo real.
        </p>
      </div>

      {marceneiros.length > 0 ? (
        <Carousel
          setApi={setApi}
          plugins={[Autoplay({ delay: 60000, stopOnInteraction: true })]}
          className="w-full"
        >
          <CarouselContent>
            {marceneiros.map((marceneiro) => (
              <CarouselItem key={marceneiro.id}>
                <CarpenterSlide marceneiro={marceneiro} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {marceneiros.map((_, index) => (
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
            Nenhum marceneiro encontrado para exibir.
          </p>
        </div>
      )}
    </div>
  );
}
