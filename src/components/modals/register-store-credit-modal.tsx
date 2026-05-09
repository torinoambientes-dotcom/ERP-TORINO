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
} from '@/components/ui/select';
import { StoreCredit } from '@/lib/types';
import { CreditCard } from 'lucide-react';

interface RegisterStoreCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RegisterStoreCreditModal({ isOpen, onClose }: RegisterStoreCreditModalProps) {
  const { addStoreCredit, suppliers, projects } = useContext(AppContext);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    supplierName: '',
    supplierId: '',
    clientName: '',
    relatedProjectId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  });

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) { set('amount', ''); return; }
    set('amount', (parseInt(raw) / 100).toFixed(2));
  };

  const formatCurrency = (value: string) => {
    if (!value) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(value));
  };

  const handleSupplierSelect = (supplierId: string) => {
    if (supplierId === 'none') {
      set('supplierId', '');
      return;
    }
    const sup = suppliers.find(s => s.id === supplierId);
    if (sup) {
      setForm(prev => ({ ...prev, supplierId: sup.id, supplierName: sup.name }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.supplierName || !form.clientName || !form.amount) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha loja, cliente e valor.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const payload: Omit<StoreCredit, 'id'> = {
        supplierName: form.supplierName,
        clientName: form.clientName,
        amount: parseFloat(form.amount),
        usedAmount: 0,
        date: form.date,
        status: 'active',
      };

      if (form.supplierId) payload.supplierId = form.supplierId;
      if (form.relatedProjectId) payload.relatedProjectId = form.relatedProjectId;
      if (form.description) payload.description = form.description;

      addStoreCredit(payload);

      toast({
        title: 'Crédito registrado!',
        description: `${formatCurrency(form.amount)} de crédito em ${form.supplierName} registrado.`,
      });

      setForm({
        supplierName: '', supplierId: '', clientName: '', relatedProjectId: '',
        amount: '', date: new Date().toISOString().split('T')[0], description: '',
      });
      onClose();
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-[2rem]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-violet-500" />
            Novo Crédito em Loja
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            Registre créditos gerados por pagamentos de clientes direto nos fornecedores.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Supplier */}
          <div className="space-y-1.5">
            <Label>Loja / Fornecedor *</Label>
            {suppliers.length > 0 ? (
              <Select value={form.supplierId || 'none'} onValueChange={handleSupplierSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a loja..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Digitar manualmente</SelectItem>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            {(!form.supplierId || suppliers.length === 0) && (
              <Input
                placeholder="Nome da loja / fornecedor"
                value={form.supplierName}
                onChange={e => set('supplierName', e.target.value)}
              />
            )}
          </div>

          {/* Client */}
          <div className="space-y-1.5">
            <Label>Nome do Cliente *</Label>
            <Input
              placeholder="Ex: João da Silva"
              value={form.clientName}
              onChange={e => set('clientName', e.target.value)}
            />
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor do Crédito *</Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="R$ 0,00"
                value={formatCurrency(form.amount)}
                onChange={handleAmountChange}
                className="font-bold text-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
              />
            </div>
          </div>

          {/* Project */}
          <div className="space-y-1.5">
            <Label>Projeto Relacionado (opcional)</Label>
            <Select value={form.relatedProjectId || 'none'} onValueChange={v => set('relatedProjectId', v === 'none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.clientName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Observação (opcional)</Label>
            <Input
              placeholder="Ex: Pago com cartão do cliente no Leroy Merlin"
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="rounded-xl font-bold px-8 bg-violet-600 hover:bg-violet-500 text-white"
            >
              {isLoading ? 'Salvando...' : 'Registrar Crédito'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
