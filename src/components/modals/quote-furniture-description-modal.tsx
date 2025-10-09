'use client';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { QuoteFurniture } from '@/lib/types';

interface QuoteFurnitureDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  furniture: QuoteFurniture;
  onUpdate: (furniture: QuoteFurniture) => void;
}

export function QuoteFurnitureDescriptionModal({
  isOpen,
  onClose,
  furniture,
  onUpdate,
}: QuoteFurnitureDescriptionModalProps) {
  const [description, setDescription] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setDescription(furniture.description || '');
    }
  }, [isOpen, furniture]);

  const handleSave = () => {
    const updatedFurniture: QuoteFurniture = {
      ...furniture,
      description: description,
    };
    onUpdate(updatedFurniture);
    toast({
      title: 'Descrição salva!',
      description: `A descrição para "${furniture.name}" foi atualizada.`,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-headline">Descritivo para "{furniture.name}"</DialogTitle>
          <DialogDescription>
            Descreva os detalhes deste móvel para a proposta. Ex: Balcão com 5 portas e 4 gavetas, cantos curvos.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Digite o descritivo aqui..."
            className="min-h-[150px]"
          />
        </div>
        
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave}>
            Salvar Descrição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
