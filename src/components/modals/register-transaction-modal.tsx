
'use client';

import { useState, useContext, useMemo } from 'react';
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
import { cn } from '@/lib/utils';
import { TransactionType } from '@/lib/types';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface RegisterTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = {
  income: [
    'Venda de Projeto',
    'Serviço de Montagem',
    'Venda de Ferragens',
    'Ajuste de Saldo',
    'Outras Entradas'
  ],
  expense: [
    'Compra de Materiais',
    'Folha de Pagamento',
    'Aluguel / Condomínio',
    'Energia / Água / Internet',
    'Ferramentas',
    'Marketing',
    'Impostos',
    'Outras Saídas'
  ]
};

export function RegisterTransactionModal({ isOpen, onClose }: RegisterTransactionModalProps) {
  const { addTransaction, projects } = useContext(AppContext);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    type: 'expense' as TransactionType,
    amount: '',
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0], // reference date
    dueDate: '',
    paymentDate: new Date().toISOString().split('T')[0],
    barcode: '',
    status: 'completed' as 'pending' | 'completed',
    relatedProjectId: '',
    paymentMethod: 'Pix'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.description || !formData.category) {
      toast({
        title: 'Erro',
        description: 'Valor, descrição e categoria são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      addTransaction({
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description,
        category: formData.category,
        date: formData.status === 'completed' ? formData.paymentDate : (formData.dueDate || formData.date),
        dueDate: formData.dueDate || undefined,
        paymentDate: formData.status === 'completed' ? formData.paymentDate : undefined,
        barcode: formData.barcode || undefined,
        status: formData.status,
        relatedProjectId: formData.relatedProjectId || undefined,
        paymentMethod: formData.paymentMethod
      });

      toast({
        title: 'Sucesso',
        description: 'Transação registrada com sucesso!',
      });
      
      setFormData({
        type: 'expense',
        amount: '',
        description: '',
        category: '',
        date: new Date().toISOString().split('T')[0],
        dueDate: '',
        paymentDate: new Date().toISOString().split('T')[0],
        barcode: '',
        status: 'completed',
        relatedProjectId: '',
        paymentMethod: 'Pix'
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao registrar a transação.',
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
      <DialogContent className="sm:max-w-[500px] rounded-[2rem]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Nova Movimentação Financeira</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Type Selector */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'income', category: '' })}
              className={cn(
                "flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all",
                formData.type === 'income' 
                  ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm" 
                  : "bg-white border-slate-100 text-slate-400 hover:border-emerald-200"
              )}
            >
              <ArrowUpCircle className={cn("h-6 w-6", formData.type === 'income' ? "text-emerald-500" : "text-slate-300")} />
              <span className="font-bold uppercase tracking-wider text-sm">Entrada</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'expense', category: '' })}
              className={cn(
                "flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all",
                formData.type === 'expense' 
                  ? "bg-rose-50 border-rose-500 text-rose-700 shadow-sm" 
                  : "bg-white border-slate-100 text-slate-400 hover:border-rose-200"
              )}
            >
              <ArrowDownCircle className={cn("h-6 w-6", formData.type === 'expense' ? "text-rose-500" : "text-slate-300")} />
              <span className="font-bold uppercase tracking-wider text-sm">Saída</span>
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="description">Descrição / Título</Label>
              <Input
                id="description"
                placeholder="Ex: Recebimento parcela final cliente João"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="amount">Valor</Label>
                <Input
                  id="amount"
                  type="text"
                  placeholder="R$ 0,00"
                  value={formatCurrency(formData.amount)}
                  onChange={handleAmountChange}
                  className="font-bold text-lg text-slate-800"
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="status">Status</Label>
                <Select 
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  value={formData.status}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Concluído / Pago</SelectItem>
                    <SelectItem value="pending">Pendente / A Pagar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {formData.status === 'pending' ? (
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="dueDate" className="text-amber-600 font-bold">Data de Vencimento</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
              ) : (
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="paymentDate" className="text-emerald-600 font-bold">Data do Pagamento</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  />
                </div>
              )}
              
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
                    {CATEGORIES[formData.type].map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.type === 'expense' && formData.status === 'pending' && (
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="barcode">Código de Barras / Chave PIX (Opcional)</Label>
                <Input
                  id="barcode"
                  placeholder="Cole aqui o código para facilitar o pagamento"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="font-mono text-sm"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="project">Projeto Relacionado (Opcional)</Label>
                <Select 
                  onValueChange={(value) => setFormData({ ...formData, relatedProjectId: value })}
                  value={formData.relatedProjectId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.clientName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="paymentMethod">Meio de Pagamento</Label>
                <Select 
                  onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                  value={formData.paymentMethod}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pix">Pix</SelectItem>
                    <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                    <SelectItem value="Boleto">Boleto</SelectItem>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="Transferência">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className={cn(
                "rounded-xl font-bold px-8",
                formData.type === 'income' ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
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
