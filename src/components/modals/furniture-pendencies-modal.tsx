'use client';
import { useContext, useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { AppContext } from '@/context/app-context';
import type { Furniture, Pendency } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { generateId } from '@/lib/utils';
import { useUser } from '@/firebase';

interface FurniturePendenciesModalProps {
  isOpen: boolean;
  onClose: () => void;
  furniture: Furniture;
  onUpdate: (furniture: Furniture) => void;
}

export function FurniturePendenciesModal({
  isOpen,
  onClose,
  furniture,
  onUpdate,
}: FurniturePendenciesModalProps) {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('FurniturePendenciesModal must be used within an AppProvider');
  }
  const { teamMembers } = context;
  const { user } = useUser();

  const [newPendency, setNewPendency] = useState('');
  
  const loggedInMember = useMemo(() => {
    if (!user || !teamMembers) return null;
    return teamMembers.find(member => member.id === user.uid);
  }, [user, teamMembers]);

  const handleAddPendency = () => {
    if (!newPendency.trim() || !loggedInMember) return;

    const pendency: Pendency = {
      id: generateId('pend'),
      text: newPendency,
      isResolved: false,
      authorId: loggedInMember.id,
    };

    const updatedFurniture = { 
      ...furniture, 
      pendencies: [...(furniture.pendencies || []), pendency] 
    };
    onUpdate(updatedFurniture);
    setNewPendency('');
  };

  const handleTogglePendency = (pendencyId: string) => {
    const updatedPendencies = (furniture.pendencies || []).map(p => 
      p.id === pendencyId ? { ...p, isResolved: !p.isResolved } : p
    );
    onUpdate({ ...furniture, pendencies: updatedPendencies });
  };

  const safePendencies = furniture.pendencies || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-xl h-auto flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">Pendências de "{furniture.name}"</DialogTitle>
          <DialogDescription>
            Crie e gerencie a lista de tarefas ou problemas a serem resolvidos para este item.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow flex flex-col overflow-hidden py-4">
          <ScrollArea className="h-full pr-4 flex-grow">
            <div className="space-y-3">
              {safePendencies.length > 0 ? (
                safePendencies.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center space-x-3"
                  >
                    <Checkbox
                      id={p.id}
                      checked={p.isResolved}
                      onCheckedChange={() => handleTogglePendency(p.id)}
                    />
                    <label
                      htmlFor={p.id}
                      className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                        p.isResolved ? 'line-through text-muted-foreground' : ''
                      }`}
                    >
                      {p.text}
                    </label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma pendência para este item.
                </p>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Input
            value={newPendency}
            onChange={(e) => setNewPendency(e.target.value)}
            placeholder="Nova pendência..."
            onKeyDown={(e) => e.key === 'Enter' && handleAddPendency()}
            disabled={!loggedInMember}
          />
          <Button onClick={handleAddPendency} disabled={!loggedInMember}>
            Adicionar
          </Button>
        </div>
        
        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
