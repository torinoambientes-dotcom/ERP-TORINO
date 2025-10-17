'use client';

import { useMemo, useContext } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { AppContext } from '@/context/app-context';
import type { StockItem, StockMovement, TeamMember } from '@/lib/types';
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

interface StockMovementHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: StockItem;
}

const reasonLabels: { [key: string]: string } = {
  compra: 'Entrada por Compra',
  estorno: 'Estorno / Devolução',
  uso_marceneiro: 'Uso por Marceneiro',
  despacho_producao: 'Despacho para Produção',
  quebra_perda: 'Quebra / Perda',
  outros: 'Outros',
};

export function StockMovementHistoryModal({
  isOpen,
  onClose,
  item,
}: StockMovementHistoryModalProps) {
  const { stockMovements, teamMembers, isLoading } = useContext(AppContext);

  const movementsForItem = useMemo(() => {
    if (!stockMovements) return [];
    return stockMovements
      .filter(mov => mov.stockItemId === item.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [stockMovements, item.id]);

  const memberMap = useMemo(() => {
    if (!teamMembers) return new Map();
    return new Map(teamMembers.map((m: TeamMember) => [m.id, m]));
  }, [teamMembers]);

  const getDetailsText = (movement: StockMovement) => {
    if (movement.reason === 'uso_marceneiro' && movement.details) {
      const marceneiro = memberMap.get(movement.details);
      return `Marceneiro: ${marceneiro?.name || 'ID ' + movement.details}`;
    }
    if ((movement.reason === 'outros' || movement.reason === 'despacho_producao' || movement.reason === 'compra' || movement.reason === 'quebra_perda') && movement.details) {
      return `${movement.details}`;
    }
    return null;
  };

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
            {!isLoading && movementsForItem.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center h-48">
                <p className="text-muted-foreground">Nenhuma movimentação registrada.</p>
              </div>
            )}
            {!isLoading &&
              movementsForItem.map((movement) => {
                const member = memberMap.get(movement.memberId);
                const isEntry = movement.type === 'entry';
                const detailsText = getDetailsText(movement);

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
                      <p className="text-sm text-muted-foreground">
                        {reasonLabels[movement.reason] || 'Motivo desconhecido'}
                      </p>
                      {detailsText && <p className="text-sm text-muted-foreground italic">{detailsText}</p>}
                       <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                        <span>Registrado por:</span>
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
