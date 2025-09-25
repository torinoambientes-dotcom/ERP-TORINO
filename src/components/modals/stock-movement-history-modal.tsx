'use client';

import { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

import {
  useCollection,
  useFirestore,
  useMemoFirebase,
} from '@/firebase';
import { AppContext } from '@/context/app-context';
import type { StockItem, StockMovement } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { useContext } from 'react';

interface StockMovementHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: StockItem;
}

export function StockMovementHistoryModal({
  isOpen,
  onClose,
  item,
}: StockMovementHistoryModalProps) {
  const firestore = useFirestore();
  const { teamMembers } = useContext(AppContext);

  const movementsQuery = useMemoFirebase(
    () => collection(firestore, 'stock_items', item.id, 'movements'),
    [firestore, item.id]
  );
  
  const { data: movements, isLoading } = useCollection<StockMovement>(movementsQuery);

  const sortedMovements = useMemo(() => {
    if (!movements) return [];
    return movements.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [movements]);

  const memberMap = useMemo(() => {
    return new Map(teamMembers.map((m) => [m.id, m]));
  }, [teamMembers]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">
            Histórico de Movimentação
          </DialogTitle>
          <DialogDescription>
            Veja todas as entradas e saídas para o item{' '}
            <span className="font-bold">{item.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <ScrollArea className="flex-grow pr-4 -mr-4">
          <div className="space-y-4">
            {isLoading && <p>Carregando histórico...</p>}
            {!isLoading && sortedMovements.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center h-48">
                <p className="text-muted-foreground">Nenhuma movimentação registrada.</p>
              </div>
            )}
            {!isLoading &&
              sortedMovements.map((movement) => {
                const member = memberMap.get(movement.memberId);
                const isEntry = movement.type === 'entry';

                return (
                  <div key={movement.id} className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full',
                        isEntry ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      )}
                    >
                      {isEntry ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold">
                          {isEntry ? 'Entrada' : 'Saída'} de {movement.quantity}{' '}
                          {item.unit}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(movement.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground italic">"{movement.reason}"</p>
                       <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                        <span>Responsável:</span>
                        {member && <span className="h-3 w-3 rounded-full" style={{ backgroundColor: member.color }} />}
                        <span>{member?.name || 'Desconhecido'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </ScrollArea>
        
        <Separator />
        
        <DialogFooter className="mt-auto pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
