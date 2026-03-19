
'use client';

import { useContext, useState, useMemo, useEffect } from 'react';
import { AppContext } from '@/context/app-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, Maximize, Scissors, Zap, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

export default function ApresentacaoCortePage() {
  const { cuttingOrders, updateCuttingOrderStatus, isLoading } = useContext(AppContext);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const pendingOrders = useMemo(() => 
    (cuttingOrders || []).filter(o => o.status === 'pending'),
    [cuttingOrders]
  );

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFs);
    return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-900">
        <p className="text-4xl font-black animate-pulse uppercase tracking-tighter">Carregando Fila de Corte...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-100 text-slate-900 h-screen w-screen flex flex-col relative overflow-hidden select-none">
      
      {!isFullscreen && (
        <div className="absolute top-4 right-4 z-[100]">
          <Button 
            onClick={toggleFullscreen} 
            className="bg-primary hover:bg-primary/90 text-white font-bold px-6 py-4 rounded-full shadow-xl flex gap-2 border-2 border-white text-lg"
          >
            <Maximize className="h-5 w-5" />
            TELA CHEIA
          </Button>
        </div>
      )}

      {/* Header */}
      <header className="px-8 py-6 border-b-4 border-slate-200 bg-white flex justify-between items-center z-10 shadow-md">
        <div className="flex items-center gap-6">
          <div className="h-12 w-4 bg-orange-600 rounded-full"></div>
          <h1 className="text-5xl font-black tracking-tighter uppercase text-slate-800">Fila de Corte CNC</h1>
          <Badge variant="outline" className="text-2xl px-4 py-1 border-2 border-orange-200 text-orange-700 font-black">
            {pendingOrders.length} PROJETOS
          </Badge>
        </div>
        <div className="text-right">
          <p className="text-slate-500 text-2xl font-black uppercase tracking-widest">
            {format(new Date(), "eeee, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-6">
          {pendingOrders.length > 0 ? (
            pendingOrders.map((order, index) => (
              <div 
                key={order.id}
                className={cn(
                  "p-6 rounded-3xl border-4 bg-white shadow-xl flex items-center gap-8 transition-all",
                  order.isUrgent ? "border-red-600 bg-red-50/50 animate-pulse" : "border-slate-200",
                  index === 0 && !order.isUrgent && "border-blue-500 ring-8 ring-blue-500/10"
                )}
              >
                {/* Position */}
                <div className={cn(
                  "h-24 w-24 rounded-2xl flex items-center justify-center text-5xl font-black flex-shrink-0 shadow-inner",
                  order.isUrgent ? "bg-red-600 text-white" : (index === 0 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400")
                )}>
                  {index + 1}
                </div>

                {/* Info */}
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-4 mb-2">
                    {order.isUrgent && (
                      <span className="bg-red-600 text-white text-xl font-black px-4 py-1 rounded-full flex items-center gap-2">
                        <Zap className="h-6 w-6 fill-white" /> URGENTE
                      </span>
                    )}
                    {index === 0 && !order.isUrgent && (
                      <span className="bg-blue-600 text-white text-xl font-black px-4 py-1 rounded-full flex items-center gap-2">
                        PRÓXIMO
                      </span>
                    )}
                  </div>
                  <h2 className={cn(
                    "text-6xl font-black tracking-tight truncate leading-none mb-2",
                    order.isUrgent ? "text-red-800" : "text-slate-900"
                  )}>
                    {order.folderName}
                  </h2>
                  <div className="flex items-center gap-4 text-slate-500 font-bold text-xl uppercase tracking-tighter">
                    <Clock className="h-6 w-6" />
                    Adicionado às {format(parseISO(order.createdAt), "HH:mm")}
                  </div>
                </div>

                {/* Actions */}
                <Button 
                  onClick={() => updateCuttingOrderStatus(order.id, 'completed')}
                  className={cn(
                    "h-24 px-10 text-3xl font-black rounded-2xl flex gap-4 shadow-xl active:scale-95 transition-transform",
                    order.isUrgent ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
                  )}
                >
                  <CheckCircle2 className="h-10 w-10" />
                  CONCLUÍDO
                </Button>
              </div>
            ))
          ) : (
            <div className="h-[60vh] flex flex-col items-center justify-center border-8 border-dashed border-slate-200 rounded-[4rem] bg-slate-50/50">
              <Scissors className="h-32 w-32 text-slate-200 mb-6" />
              <p className="text-5xl text-slate-300 font-black uppercase tracking-widest italic text-center">
                Fila Vazia.<br/>Aguardando arquivos...
              </p>
            </div>
          )}
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 12px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }
      `}</style>
    </div>
  );
}
