
'use client';

import { useContext, useState, useMemo, useEffect } from 'react';
import { AppContext } from '@/context/app-context';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  Maximize,
  Minimize,
  Scissors,
  Zap,
  MessageSquareText,
  ClipboardList,
  CheckSquare,
  Square,
  Clock,
  ChevronDown,
  ChevronUp,
  Trophy,
  AlertTriangle,
  Send,
} from 'lucide-react';
import { cn, generateId } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <span className="font-black tabular-nums tracking-tighter">
      {format(time, 'HH:mm:ss')}
    </span>
  );
}

export default function ApresentacaoCortePage() {
  const { cuttingOrders, updateCuttingOrderStatus, updateCuttingOrder, isLoading } = useContext(AppContext);
  const { toast } = useToast();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [operatorNotes, setOperatorNotes] = useState<Record<string, string>>({});
  const [sheetToUnmark, setSheetToUnmark] = useState<{ orderId: string, sheetId: string, name: string } | null>(null);

  const pendingOrders = useMemo(() =>
    (cuttingOrders || []).filter(o => o.status === 'pending'),
    [cuttingOrders]
  );

  // Auto-expand first order
  useEffect(() => {
    if (pendingOrders.length > 0) {
      setExpandedOrders(prev => {
        const next = new Set(prev);
        next.add(pendingOrders[0].id);
        return next;
      });
    }
  }, [pendingOrders.length]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFs);
    return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  const toggleExpanded = (id: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSheet = (orderId: string, sheetId: string) => {
    const order = pendingOrders.find(o => o.id === orderId);
    if (!order?.sheets) return;

    const sheet = order.sheets.find(s => s.id === sheetId);
    if (!sheet) return;

    // Se estiver tentando DESMARCAR, pede confirmação
    if (sheet.isCut) {
      setSheetToUnmark({ orderId, sheetId, name: sheet.name });
      return;
    }

    // Se estiver MARCANDO, prossegue direto
    processToggleSheet(orderId, sheetId);
  };

  const processToggleSheet = (orderId: string, sheetId: string) => {
    const order = cuttingOrders?.find(o => o.id === orderId);
    if (!order?.sheets) return;

    const updatedSheets = order.sheets.map(s =>
      s.id === sheetId
        ? { ...s, isCut: !s.isCut, cutAt: !s.isCut ? new Date().toISOString() : undefined }
        : s
    );

    updateCuttingOrder(orderId, { sheets: updatedSheets });
    
    // Feedback visual
    const wasCut = order.sheets.find(s => s.id === sheetId)?.isCut;
    if (wasCut) {
      toast({
        title: 'Chapa desmarcada',
        description: 'O status da chapa voltou para pendente.',
      });
    }

    // Fecha o diálogo e limpa o estado
    setSheetToUnmark(null);
  };

  const handleComplete = (orderId: string, folderName: string) => {
    updateCuttingOrderStatus(orderId, 'completed');
    toast({
      title: '🎉 Corte Concluído!',
      description: `"${folderName}" foi removido da fila.`,
    });
  };

  const handleAddOperatorNote = (orderId: string) => {
    const noteText = operatorNotes[orderId];
    if (!noteText?.trim()) return;

    const order = pendingOrders.find(o => o.id === orderId);
    if (!order) return;

    const newPendency = {
      id: generateId('pend'),
      text: `[OPERADOR] ${noteText.trim()}`,
      isResolved: false,
      createdAt: new Date().toISOString(),
    };

    const currentPendencies = order.pendencies || [];
    updateCuttingOrder(orderId, { pendencies: [...currentPendencies, newPendency] });
    
    setOperatorNotes(prev => ({ ...prev, [orderId]: '' }));
    toast({
      title: 'Nota registrada!',
      description: 'A observação foi enviada para a gestão.',
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <p className="text-5xl font-black animate-pulse uppercase tracking-tighter text-white">
          Carregando Fila...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-950 text-white h-screen w-screen flex flex-col relative overflow-hidden select-none">

      {/* Header */}
      <header className="flex-shrink-0 px-8 py-4 bg-gray-900 border-b-2 border-orange-500/40 flex items-center justify-between shadow-2xl z-10">
        <div className="flex items-center gap-5">
          <div className="h-10 w-1.5 bg-orange-500 rounded-full" />
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase text-white leading-none">
              Fila de Corte CNC
            </h1>
            <p className="text-orange-400 text-sm font-bold uppercase tracking-widest mt-0.5">
              {format(new Date(), "eeee, dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <div className="ml-4 bg-orange-500/20 border border-orange-500/40 rounded-2xl px-5 py-2 text-center">
            <span className="text-4xl font-black text-orange-400">{pendingOrders.length}</span>
            <p className="text-xs font-bold text-orange-300/70 uppercase tracking-widest leading-none mt-0.5">
              {pendingOrders.length === 1 ? 'Projeto' : 'Projetos'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Horário</p>
            <p className="text-white text-3xl">
              <LiveClock />
            </p>
          </div>
          <Button
            onClick={toggleFullscreen}
            variant="outline"
            size="icon"
            className="border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-300 h-11 w-11"
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-6 space-y-4 cnc-scrollbar">
        {pendingOrders.length > 0 ? (
          pendingOrders.map((order, index) => {
            const sheets = order.sheets || [];
            const cutCount = sheets.filter(s => s.isCut).length;
            const totalSheets = sheets.length;
            const progress = totalSheets > 0 ? Math.round((cutCount / totalSheets) * 100) : 0;
            const allCut = totalSheets > 0 && cutCount === totalSheets;
            const isExpanded = expandedOrders.has(order.id);
            const isNext = index === 0 && !order.isUrgent;

            return (
              <div
                key={order.id}
                className={cn(
                  'rounded-3xl border-2 overflow-hidden transition-all duration-300',
                  order.isUrgent
                    ? 'border-red-500 bg-red-950/40 shadow-[0_0_40px_rgba(239,68,68,0.2)]'
                    : isNext
                    ? 'border-blue-500/60 bg-gray-900 shadow-[0_0_30px_rgba(59,130,246,0.15)]'
                    : 'border-gray-700/60 bg-gray-900'
                )}
              >
                {/* Order Header */}
                <button
                  className="w-full text-left"
                  onClick={() => toggleExpanded(order.id)}
                >
                  <div className="flex items-center gap-5 px-7 py-5">
                    {/* Position number */}
                    <div className={cn(
                      'h-16 w-16 rounded-2xl flex items-center justify-center text-3xl font-black flex-shrink-0',
                      order.isUrgent ? 'bg-red-600 text-white' : isNext ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
                    )}>
                      {index + 1}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-1">
                        {order.isUrgent && (
                          <span className="bg-red-600 text-white text-sm font-black px-3 py-0.5 rounded-full flex items-center gap-1.5 animate-pulse">
                            <Zap className="h-4 w-4 fill-white" /> URGENTE
                          </span>
                        )}
                        {isNext && (
                          <span className="bg-blue-600 text-white text-sm font-black px-3 py-0.5 rounded-full">
                            PRÓXIMO
                          </span>
                        )}
                        {allCut && (
                          <span className="bg-green-600 text-white text-sm font-black px-3 py-0.5 rounded-full flex items-center gap-1.5">
                            <Trophy className="h-4 w-4" /> PRONTO PARA CONCLUIR
                          </span>
                        )}
                      </div>
                      <h2 className={cn(
                        'text-4xl font-black tracking-tighter truncate leading-none',
                        order.isUrgent ? 'text-red-300' : 'text-white'
                      )}>
                        {order.folderName}
                      </h2>
                      {order.notes && (
                        <div className="mt-2 flex items-center gap-2 text-orange-400 font-bold text-sm">
                          <MessageSquareText className="h-4 w-4 shrink-0" />
                          <span className="uppercase tracking-tight">{order.notes}</span>
                        </div>
                      )}
                    </div>

                    {/* Right side: progress + expand */}
                    <div className="flex items-center gap-6 flex-shrink-0">
                      {totalSheets > 0 && (
                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end mb-1.5">
                            <ClipboardList className="h-4 w-4 text-gray-400" />
                            <span className={cn(
                              'text-2xl font-black tabular-nums',
                              allCut ? 'text-green-400' : 'text-white'
                            )}>
                              {cutCount}/{totalSheets}
                            </span>
                          </div>
                          {/* Mini progress bar */}
                          <div className="w-36 bg-gray-700 rounded-full h-3 overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-500',
                                allCut ? 'bg-green-500' : 'bg-blue-500'
                              )}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 font-bold mt-1 text-right">{progress}% cortado</p>
                        </div>
                      )}
                      <div className="text-gray-500">
                        {isExpanded ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Expanded: Sheets grid */}
                {isExpanded && (
                  <div className="px-7 pb-7 border-t border-gray-700/50">
                    
                    {/* Campo de Notas do Operador */}
                    <div className="mt-5 flex gap-3">
                      <div className="relative flex-1">
                        <MessageSquareText className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                        <Input 
                          placeholder="Registrar algo sobre este corte... (Ex: Chapa riscada, falta material)"
                          className="bg-gray-800 border-gray-700 text-white h-14 pl-12 text-lg rounded-2xl focus:ring-orange-500 focus:border-orange-500"
                          value={operatorNotes[order.id] || ''}
                          onChange={(e) => setOperatorNotes(prev => ({ ...prev, [order.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddOperatorNote(order.id);
                          }}
                        />
                      </div>
                      <Button 
                        onClick={() => handleAddOperatorNote(order.id)}
                        disabled={!operatorNotes[order.id]?.trim()}
                        className="h-14 px-6 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl gap-2 font-bold"
                      >
                        <Send className="h-5 w-5" />
                        ENVIAR
                      </Button>
                    </div>

                    {/* Pendências em aberto */}
                    {(() => {
                      const openPendencies = (order.pendencies || []).filter(p => !p.isResolved);
                      if (openPendencies.length === 0) return null;
                      return (
                        <div className="mt-5 mb-5 rounded-2xl border-2 border-amber-500/60 bg-amber-950/40 overflow-hidden">
                          <div className="flex items-center gap-3 px-5 py-3 bg-amber-500/20 border-b border-amber-500/30">
                            <AlertTriangle className="h-6 w-6 text-amber-400 fill-amber-400/20 shrink-0" />
                            <span className="text-amber-300 font-black uppercase tracking-widest text-base">
                              {openPendencies.length} Pendência{openPendencies.length > 1 ? 's' : ''} em Aberto
                            </span>
                          </div>
                          <div className="divide-y divide-amber-500/20">
                            {openPendencies.map(p => (
                              <div key={p.id} className="flex items-start gap-4 px-5 py-4">
                                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-amber-200 font-bold text-lg leading-snug">{p.text}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                {/* Large progress bar */}
                    {totalSheets > 0 && (
                      <div className="mt-5 mb-6">
                        <div className="flex justify-between text-sm font-bold text-gray-400 mb-2">
                          <span>{cutCount} de {totalSheets} chapas cortadas</span>
                          <span className={allCut ? 'text-green-400' : 'text-blue-400'}>{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-5 overflow-hidden shadow-inner">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-700 ease-out',
                              allCut
                                ? 'bg-gradient-to-r from-green-600 to-green-400'
                                : 'bg-gradient-to-r from-blue-700 to-blue-400'
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Sheets grid */}
                    {totalSheets > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {sheets.map(sheet => (
                          <button
                            key={sheet.id}
                            onClick={() => handleToggleSheet(order.id, sheet.id)}
                            className={cn(
                              'relative flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border-2 text-center transition-all duration-200 active:scale-95',
                              sheet.isCut
                                ? 'bg-green-500/20 border-green-500 text-green-300 shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                                : 'bg-gray-800 border-gray-600 text-gray-200 hover:border-blue-500 hover:bg-blue-500/10 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                            )}
                          >
                            {sheet.isCut ? (
                              <CheckSquare className="h-12 w-12 text-green-400" />
                            ) : (
                              <Square className="h-12 w-12 text-gray-500" />
                            )}
                            <p className={cn(
                              'text-base font-black leading-tight tracking-tight',
                              sheet.isCut && 'line-through opacity-60'
                            )}>
                              {sheet.name}
                            </p>
                            {sheet.isCut && sheet.cutAt && (
                              <p className="text-xs font-bold text-green-500 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(parseISO(sheet.cutAt), 'HH:mm')}
                              </p>
                            )}
                            {/* Checkmark overlay when cut */}
                            {sheet.isCut && (
                              <div className="absolute top-2 right-2 h-5 w-5 bg-green-500 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="h-4 w-4 text-white" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-gray-600">
                        <ClipboardList className="h-12 w-12 mb-3" />
                        <p className="font-bold uppercase tracking-widest text-sm">Nenhuma chapa cadastrada</p>
                        <p className="text-xs mt-1 text-gray-700">O responsável deve cadastrar as chapas na gestão.</p>
                      </div>
                    )}

                    {/* Complete button — only shows when all sheets cut OR no sheets */}
                    {(allCut || totalSheets === 0) && (
                      <div className="mt-6 flex justify-center">
                        <Button
                          onClick={() => handleComplete(order.id, order.folderName)}
                          className="bg-green-600 hover:bg-green-500 text-white font-black text-xl px-12 py-7 rounded-2xl gap-3 shadow-[0_0_30px_rgba(34,197,94,0.35)] transition-all hover:shadow-[0_0_40px_rgba(34,197,94,0.5)] hover:scale-105"
                        >
                          <CheckCircle2 className="h-7 w-7" />
                          CONCLUIR CORTE
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="h-[65vh] flex flex-col items-center justify-center border-4 border-dashed border-gray-800 rounded-[3rem] bg-gray-900/30">
            <Scissors className="h-24 w-24 text-gray-800 mb-6" />
            <p className="text-4xl text-gray-700 font-black uppercase tracking-widest italic text-center">
              Fila Vazia.<br />
              <span className="text-2xl">Aguardando arquivos...</span>
            </p>
          </div>
        )}
      </main>

      <style jsx global>{`
        .cnc-scrollbar::-webkit-scrollbar { width: 8px; }
        .cnc-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .cnc-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 20px; }
        .cnc-scrollbar::-webkit-scrollbar-thumb:hover { background: #4b5563; }
      `}</style>

      <AlertDialog open={!!sheetToUnmark} onOpenChange={(open) => !open && setSheetToUnmark(null)}>
        <AlertDialogContent className="bg-gray-900 border-gray-700 text-white max-w-lg rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-3xl font-black flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              DESMARCAR CHAPA?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400 text-xl font-medium mt-4">
              Você tem certeza que deseja desmarcar a chapa <span className="text-white font-black">"{sheetToUnmark?.name}"</span> como cortada?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-4">
            <AlertDialogCancel className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white h-16 text-xl rounded-2xl flex-1">
              VOLTAR (MANTER CORTADA)
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (sheetToUnmark) {
                  processToggleSheet(sheetToUnmark.orderId, sheetToUnmark.sheetId);
                }
              }}
              className="bg-orange-600 hover:bg-orange-500 text-white h-16 text-xl font-black rounded-2xl flex-1"
            >
              CONFIRMAR E DESMARCAR
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
