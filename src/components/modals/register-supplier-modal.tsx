
'use client';

import { useState, useContext, useEffect } from 'react';
import { AppContext } from '@/context/app-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Supplier } from '@/lib/types';

interface RegisterSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier?: Supplier; // Se fornecido, ativa modo edição
}

export function RegisterSupplierModal({ isOpen, onClose, supplier }: RegisterSupplierModalProps) {
  const { addSupplier, updateSupplier } = useContext(AppContext);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!supplier;

  const emptyForm = { name: '', document: '', email: '', phone: '', category: '' };

  const [formData, setFormData] = useState(emptyForm);

  // Preenche o formulário quando abre em modo edição
  useEffect(() => {
    if (isOpen && supplier) {
      setFormData({
        name: supplier.name || '',
        document: supplier.document || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        category: supplier.category || '',
      });
    } else if (isOpen && !supplier) {
      setFormData(emptyForm);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, supplier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast({
        title: 'Erro',
        description: 'O nome do fornecedor é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      if (isEditing && supplier) {
        updateSupplier(supplier.id, formData);
        toast({
          title: 'Sucesso',
          description: 'Fornecedor atualizado com sucesso!',
        });
      } else {
        addSupplier(formData);
        toast({
          title: 'Sucesso',
          description: 'Fornecedor cadastrado com sucesso!',
        });
      }
      onClose();
    } catch (error) {
      toast({
        title: 'Erro',
        description: `Ocorreu um erro ao ${isEditing ? 'atualizar' : 'cadastrar'} o fornecedor.`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Fornecedor' : 'Cadastrar Novo Fornecedor'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="name">Nome / Razão Social</Label>
            <Input
              id="name"
              placeholder="Ex: Madeireira Torino"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="document">CNPJ / CPF</Label>
            <Input
              id="document"
              placeholder="00.000.000/0000-00"
              value={formData.document}
              onChange={(e) => setFormData({ ...formData, document: e.target.value })}
            />
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="category">Categoria</Label>
            <Input
              id="category"
              placeholder="Ex: MDF, Ferragens, Vidros"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                placeholder="(00) 00000-0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="contato@empresa.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
