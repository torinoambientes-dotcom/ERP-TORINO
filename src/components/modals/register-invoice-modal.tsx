
'use client';

import { useState, useContext } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RegisterInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RegisterInvoiceModal({ isOpen, onClose }: RegisterInvoiceModalProps) {
  const { addInvoice, suppliers, projects } = useContext(AppContext);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    number: '',
    supplierId: '',
    category: 'Compra de Materiais',
    status: 'pending' as 'pending' | 'paid',
    relatedProjectId: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId || !formData.amount || !formData.date) {
      toast({
        title: 'Erro',
        description: 'Fornecedor, valor e data são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    const selectedSupplier = suppliers.find(s => s.id === formData.supplierId);
    if (!selectedSupplier) return;

    setIsLoading(true);
    try {
      addInvoice({
        number: formData.number,
        supplierId: formData.supplierId,
        supplierName: selectedSupplier.name,
        amount: parseFloat(formData.amount),
        date: formData.date,
        category: formData.category,
        status: formData.status,
        relatedProjectId: formData.relatedProjectId || undefined,
        notes: formData.notes,
      });

      toast({
        title: 'Sucesso',
        description: 'Nota Fiscal registrada com sucesso! Uma transação financeira correspondente foi criada.',
      });
      
      setFormData({
        number: '',
        supplierId: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        category: 'Compra de Materiais',
        status: 'pending',
        relatedProjectId: '',
        notes: '',
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao registrar a nota fiscal.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: string) => {
    if (!value) return '';
    const number = parseFloat(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(number);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (!value) {
      setFormData({ ...formData, amount: '' });
      return;
    }
    const amountInCents = parseInt(value);
    const amount = (amountInCents / 100).toFixed(2);
    setFormData({ ...formData, amount });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Entrada de Nota Fiscal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="supplier">Fornecedor</Label>
            <Select 
              onValueChange={(value) => setFormData({ ...formData, supplierId: value })}
              value={formData.supplierId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um fornecedor" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.length > 0 ? (
                  suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground">
                    Nenhum fornecedor cadastrado.
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="number">Número da NF</Label>
              <Input
                id="number"
                placeholder="Ex: 12345"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="amount">Valor Total</Label>
              <Input
                id="amount"
                type="text"
                placeholder="R$ 0,00"
                value={formatCurrency(formData.amount)}
                onChange={handleAmountChange}
                className="font-bold text-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="date">Data de Emissão</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="category">Categoria</Label>
              <Select 
                onValueChange={(value) => setFormData({ ...formData, category: value })}
                value={formData.category}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Compra de Materiais">Compra de Materiais</SelectItem>
                  <SelectItem value="Ferramentas">Ferramentas</SelectItem>
                  <SelectItem value="Serviços">Serviços</SelectItem>
                  <SelectItem value="Outras Saídas">Outras Saídas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="status">Status Inicial</Label>
              <Select 
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                value={formData.status}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente (A Pagar)</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="project">Vincular ao Projeto (Opcional)</Label>
              <Select 
                onValueChange={(value) => setFormData({ ...formData, relatedProjectId: value })}
                value={formData.relatedProjectId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum (Geral)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum (Geral)</SelectItem>
                  {(projects || []).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.clientName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="notes">Observações</Label>
            <Input
              id="notes"
              placeholder="..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Registrando...' : 'Registrar Nota Fiscal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
