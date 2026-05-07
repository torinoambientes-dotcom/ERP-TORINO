
'use client';

import { useContext, useState, useMemo, useEffect } from 'react';
import { AppContext } from '@/context/app-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, Maximize, Scissors, Zap, AlertCircle, MessageSquareText, CalendarDays, ClipboardList, Square, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function ApresentacaoCortePage() {
  const { cuttingOrders, updateCuttingOrderStatus, updateCuttingOrder, isLoading } = useContext(AppContext);
  const { toast } = useToast();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const pendingOrders = useMemo(() => 
    (cuttingOrders || []).filter(o => o.status === 'pending'),
    [cuttingOrders]
  );

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Erro ao ativar ecrã inteiro: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFs);
    return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  const handleComplete = (orderId: string, folderName: string) => {
    updateCuttingOrderStatus(orderId, 'completed');
    toast({
      title: "Corte Concluído!",
      description: `O projeto ${folderName} foi removido da fila.`,
    });
  };

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
                  
                  {order.notes && (
                    <div className="mb-3 p-4 bg-orange-100 border-l-8 border-orange-500 rounded-xl flex items-start gap-3">
                      <MessageSquareText className="h-8 w-8 text-orange-600 shrink-0 mt-1" />
                      <p className="text-3xl font-black text-orange-800 uppercase tracking-tight">
                        {order.notes}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-slate-500 font-bold text-xl uppercase tracking-tighter">
                    <CalendarDays className="h-6 w-6" />
                    Incluído em {format(parseISO(order.createdAt), "dd/MM/yy 'às' HH:mm")}
                  </div>

                  {/* Sheets checklist */}
                  {(order.sheets && order.sheets.length > 0) && (
                    <div className="mt-4 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl">
                      <div className="flex items-center gap-3 mb-3">
                        <ClipboardList className="h-6 w-6 text-slate-600" />
                        <span className="text-xl font-black text-slate-700 uppercase tracking-tight">Chapas</span>
                        <span className="text-lg font-black text-slate-400">
                          {order.sheets.filter(s => s.isCut).length}/{order.sheets.length}
                        </span>
                        {/* Progress bar */}
                        <div className="flex-1 bg-slate-200 rounded-full h-3 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              order.sheets.filter(s => s.isCut).length === order.sheets.length ? "bg-green-500" : "bg-blue-500"
                            )}
                            style={{ width: `${Math.round((order.sheets.filter(s => s.isCut).length / order.sheets.length) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {order.sheets.map(sheet => (
                          <button
                            key={sheet.id}
                            onClick={() => {
                              const updatedSheets = order.sheets!.map(s =>
                                s.id === sheet.id ? { ...s, isCut: !s.isCut, cutAt: !s.isCut ? new Date().toISOString() : undefined } : s
                              );
                              updateCuttingOrder(order.id, { sheets: updatedSheets });
                            }}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all active:scale-95",
                              sheet.isCut
                                ? "bg-green-100 border-green-300 text-green-800"
                                : "bg-white border-slate-200 text-slate-800 hover:border-blue-300 hover:bg-blue-50"
                            )}
                          >
                            {sheet.isCut ? (
                              <CheckSquare className="h-7 w-7 text-green-600 shrink-0" />
                            ) : (
                              <Square className="h-7 w-7 text-slate-400 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className={cn(
                                "text-lg font-black truncate",
                                sheet.isCut && "line-through"
                              )}>{sheet.name}</p>
                              {sheet.isCut && sheet.cutAt && (
                                <p className="text-sm font-bold text-green-600">
                                  {format(parseISO(sheet.cutAt), "HH:mm")}
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <Button 
                  onClick={() => handleComplete(order.id, order.folderName)}
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
