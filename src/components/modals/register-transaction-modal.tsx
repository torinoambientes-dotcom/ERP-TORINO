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
import { cn } from '@/lib/utils';
import { Transaction, TransactionType } from '@/lib/types';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface RegisterTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: TransactionType;
}

const INCOME_CATEGORIES = [
  'Venda de Projeto',
  'Serviço de Montagem',
  'Venda de Ferragens',
  'Ajuste de Saldo',
  'Outras Entradas',
];

const EXPENSE_CATEGORIES = [
  'Compra de Materiais',
  'Folha de Pagamento',
  'Aluguel / Condomínio',
  'Energia / Água / Internet',
  'Ferramentas',
  'Marketing',
  'Impostos e Taxas',
  'Outras Saídas',
];

const PAYMENT_METHODS = ['Pix', 'Transferência Bancária', 'Dinheiro', 'Boleto', 'Cartão de Débito', 'Cartão de Crédito'];

const initialState = (type: TransactionType) => ({
  type,
  amount: '',
  description: '',
  category: '',
  clientName: '',
  paymentDate: new Date().toISOString().split('T')[0],
  dueDate: '',
  barcode: '',
  status: 'completed' as 'pending' | 'completed',
  relatedProjectId: '',
  paymentMethod: 'Pix',
});

export function RegisterTransactionModal({ isOpen, onClose, defaultType = 'income' }: RegisterTransactionModalProps) {
  const { addTransaction, projects } = useContext(AppContext);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState(initialState(defaultType));

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleTypeChange = (type: TransactionType) => {
    setForm({ ...initialState(type) });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) { set('amount', ''); return; }
    set('amount', (parseInt(raw) / 100).toFixed(2));
  };

  const formatCurrency = (value: string) => {
    if (!value) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.description || !form.category) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha valor, descrição e categoria.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const payload: Omit<Transaction, 'id'> = {
        type: form.type,
        amount: parseFloat(form.amount),
        description: form.description,
        category: form.category,
        date: form.status === 'completed' ? (form.paymentDate || new Date().toISOString().split('T')[0]) : (form.dueDate || new Date().toISOString().split('T')[0]),
        status: form.status,
        paymentMethod: form.paymentMethod,
      };

      if (form.status === 'completed' && form.paymentDate) payload.paymentDate = form.paymentDate;
      if (form.dueDate) payload.dueDate = form.dueDate;
      if (form.barcode) payload.barcode = form.barcode;
      if (form.relatedProjectId) payload.relatedProjectId = form.relatedProjectId;
      if (form.type === 'income' && form.clientName) payload.clientName = form.clientName;

      addTransaction(payload);

      toast({ title: 'Lançamento registrado!', description: `${form.type === 'income' ? 'Entrada' : 'Saída'} registrada com sucesso.` });
      setForm(initialState(form.type));
      onClose();
    } catch {
      toast({ title: 'Erro', description: 'Ocorreu um erro ao salvar. Tente novamente.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const isIncome = form.type === 'income';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] rounded-[2rem]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Nova Movimentação</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={cn(
                'flex items-center justify-center gap-2 py-3 rounded-2xl border-2 font-bold transition-all text-sm',
                isIncome
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-emerald-200'
              )}
            >
              <ArrowUpCircle className={cn('h-5 w-5', isIncome ? 'text-emerald-500' : 'text-slate-300')} />
              Entrada
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={cn(
                'flex items-center justify-center gap-2 py-3 rounded-2xl border-2 font-bold transition-all text-sm',
                !isIncome
                  ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-rose-200'
              )}
            >
              <ArrowDownCircle className={cn('h-5 w-5', !isIncome ? 'text-rose-500' : 'text-slate-300')} />
              Saída
            </button>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="desc">Descrição *</Label>
            <Input
              id="desc"
              placeholder={isIncome ? 'Ex: Recebimento parcela final - Cozinha João' : 'Ex: Conta de Energia - Maio'}
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          {/* Client name (income only) */}
          {isIncome && (
            <div className="space-y-1.5">
              <Label htmlFor="clientName">Nome do Cliente (para o recibo)</Label>
              <Input
                id="clientName"
                placeholder="Ex: João da Silva"
                value={form.clientName}
                onChange={e => set('clientName', e.target.value)}
              />
            </div>
          )}

          {/* Amount + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Valor *</Label>
              <Input
                id="amount"
                type="text"
                inputMode="numeric"
                placeholder="R$ 0,00"
                value={formatCurrency(form.amount)}
                onChange={handleAmountChange}
                className="font-bold text-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isIncome ? (
                    <>
                      <SelectItem value="completed">Recebido ✓</SelectItem>
                      <SelectItem value="pending">A Receber</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="completed">Pago ✓</SelectItem>
                      <SelectItem value="pending">Pendente / A Pagar</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              {form.status === 'completed' ? (
                <>
                  <Label htmlFor="paymentDate" className={isIncome ? 'text-emerald-600 font-semibold' : 'text-blue-600 font-semibold'}>
                    {isIncome ? 'Data do Recebimento' : 'Data do Pagamento'}
                  </Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={form.paymentDate}
                    onChange={e => set('paymentDate', e.target.value)}
                  />
                </>
              ) : (
                <>
                  <Label htmlFor="dueDate" className="text-amber-600 font-semibold">Data de Vencimento</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={form.dueDate}
                    onChange={e => set('dueDate', e.target.value)}
                  />
                </>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">Categoria *</Label>
              <Select value={form.category} onValueChange={v => set('category', v)}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {(isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Barcode / PIX (expense only) */}
          {!isIncome && (
            <div className="space-y-1.5">
              <Label htmlFor="barcode">Código de Barras / Chave PIX (opcional)</Label>
              <Input
                id="barcode"
                placeholder="Cole aqui para facilitar o pagamento"
                value={form.barcode}
                onChange={e => set('barcode', e.target.value)}
                className="font-mono text-xs"
              />
            </div>
          )}

          {/* Payment method + Project */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
              <Select value={form.paymentMethod} onValueChange={v => set('paymentMethod', v)}>
                <SelectTrigger id="paymentMethod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project">Projeto (opcional)</Label>
              <Select value={form.relatedProjectId} onValueChange={v => set('relatedProjectId', v)}>
                <SelectTrigger id="project">
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.clientName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className={cn(
                'rounded-xl font-bold px-8',
                isIncome ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
              )}
            >
              {isLoading ? 'Salvando...' : 'Confirmar Lançamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
