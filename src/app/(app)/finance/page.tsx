'use client';

import { useContext, useMemo, useState } from 'react';
import { AppContext } from '@/context/app-context';
import { useUser } from '@/firebase';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Transaction } from '@/lib/types';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  PlusCircle, Wallet, ArrowUpCircle, ArrowDownCircle, DollarSign, CalendarClock,
  MoreHorizontal, Receipt, CheckCircle, Trash2, Search, RefreshCw, Copy, Check,
  TrendingUp, TrendingDown,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RegisterTransactionModal } from '@/components/modals/register-transaction-modal';
import { RegisterRecurringModal } from '@/components/modals/register-recurring-modal';
import { ReceiptModal } from '@/components/modals/receipt-modal';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function safeDate(d?: string) {
  if (!d) return null;
  try { const p = parseISO(d); return isValid(p) ? p : null; } catch { return null; }
}

function DateCell({ t }: { t: Transaction }) {
  const pay = t.status === 'completed' && t.paymentDate ? safeDate(t.paymentDate) : null;
  const due = safeDate(t.dueDate);
  const ref = safeDate(t.date);
  if (pay) return (
    <div className="flex flex-col gap-0.5">
      <span className="text-emerald-600 font-bold text-sm">{format(pay, 'dd MMM yyyy', { locale: ptBR })}</span>
      {due && <span className="text-slate-400 text-xs">Venc: {format(due, 'dd/MM')}</span>}
    </div>
  );
  if (due) return <span className="text-amber-600 font-bold text-sm">{format(due, 'dd MMM yyyy', { locale: ptBR })}</span>;
  if (ref) return <span className="text-slate-500 text-sm">{format(ref, 'dd MMM yyyy', { locale: ptBR })}</span>;
  return <span className="text-slate-400 text-xs">—</span>;
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <Button variant="ghost" size="sm" className="h-6 px-2 gap-1 text-xs"
      onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000); }}>
      {ok ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      {ok ? 'Copiado' : 'Copiar'}
    </Button>
  );
}

export default function FinancePage() {
  const { user } = useUser();
  const { transactions, isLoading, teamMembers, deleteTransaction, updateTransaction, addTransaction } = useContext(AppContext);

  const [activeTab, setActiveTab] = useState('income');
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM'));
  const [search, setSearch] = useState('');
  const [modalType, setModalType] = useState<'income' | 'expense' | null>(null);
  const [showRecurring, setShowRecurring] = useState(false);
  const [toDelete, setToDelete] = useState<Transaction | null>(null);
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);

  const loggedInMember = useMemo(() => {
    if (!user || !teamMembers) return null;
    return teamMembers.find(m => m.id === user.uid);
  }, [user, teamMembers]);

  const isAdmin = loggedInMember?.role === 'Administrativo';

  const allTx = useMemo(() => transactions || [], [transactions]);

  const periodTx = useMemo(() =>
    allTx.filter(t => !dateFilter || t.date?.startsWith(dateFilter)),
    [allTx, dateFilter]
  );

  const summary = useMemo(() => {
    const income = periodTx.filter(t => t.type === 'income' && t.status === 'completed').reduce((a, t) => a + t.amount, 0);
    const expense = periodTx.filter(t => t.type === 'expense' && t.status === 'completed').reduce((a, t) => a + t.amount, 0);
    const pendingIn = periodTx.filter(t => t.type === 'income' && t.status === 'pending').reduce((a, t) => a + t.amount, 0);
    const pendingOut = periodTx.filter(t => t.type === 'expense' && t.status === 'pending').reduce((a, t) => a + t.amount, 0);
    return { income, expense, balance: income - expense, pendingIn, pendingOut };
  }, [periodTx]);

  const getRows = (type: 'income' | 'expense' | 'recurring') => {
    const q = search.toLowerCase();
    return periodTx.filter(t => {
      const matchSearch = !q || t.description?.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q);
      if (type === 'recurring') return matchSearch && !!t.isRecurring;
      if (type === 'income') return matchSearch && t.type === 'income' && !t.isRecurring;
      return matchSearch && t.type === 'expense' && !t.isRecurring;
    });
  };

  const markPaid = (t: Transaction) =>
    updateTransaction(t.id, { status: 'completed', paymentDate: new Date().toISOString().split('T')[0] });

  const handleRenew = (t: Transaction) => {
    const now = new Date();
    const nm = (now.getMonth() + 1) % 12;
    const ny = nm === 0 ? now.getFullYear() + 1 : now.getFullYear();
    const day = t.recurringDay || 10;
    const maxDay = new Date(ny, nm + 1, 0).getDate();
    const d = Math.min(day, maxDay);
    const dueDate = `${ny}-${String(nm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const refDate = `${ny}-${String(nm + 1).padStart(2, '0')}-01`;
    const { id: _id, ...rest } = t;
    addTransaction({ ...rest, date: refDate, dueDate, paymentDate: undefined, status: 'pending' });
  };

  const EmptyRow = ({ cols, label }: { cols: number; label: string }) => (
    <TableRow>
      <TableCell colSpan={cols} className="h-24 text-center text-muted-foreground">{label}</TableCell>
    </TableRow>
  );

  if (isLoading || (user && !loggedInMember)) {
    return <div className="flex h-full w-full items-center justify-center"><p>Carregando financeiro...</p></div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="p-6 bg-rose-50 rounded-full"><Wallet className="h-12 w-12 text-rose-500" /></div>
        <h2 className="text-2xl font-black">Acesso Restrito</h2>
        <p className="text-slate-500 text-center max-w-md">Você não tem permissão para visualizar as informações financeiras.</p>
      </div>
    );
  }

  const incomeRows = getRows('income');
  const expenseRows = getRows('expense');
  const recurringRows = getRows('recurring');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader title="Gestão Financeira" description="Controle de entradas, saídas e contas fixas da Torino Ambientes." />
        <Input type="month" className="w-full md:w-40 bg-white" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {([
          { label: 'Total Entradas', value: summary.income, color: 'emerald', Icon: TrendingUp, sub: `+ ${fmt(summary.pendingIn)} a receber` },
          { label: 'Total Saídas', value: summary.expense, color: 'rose', Icon: TrendingDown, sub: `+ ${fmt(summary.pendingOut)} pendente` },
          { label: 'Saldo do Mês', value: summary.balance, color: summary.balance >= 0 ? 'blue' : 'rose', Icon: DollarSign, sub: 'Entradas − Saídas confirmadas' },
          { label: 'Contas Pendentes', value: summary.pendingOut, color: 'amber', Icon: CalendarClock, sub: 'A pagar este mês' },
        ] as const).map(({ label, value, color, Icon, sub }) => (
          <Card key={label} className="bg-white/60 overflow-hidden relative group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <Icon className="h-16 w-16" />
            </div>
            <CardHeader className="pb-1">
              <CardDescription className="text-xs font-medium uppercase tracking-wider">{label}</CardDescription>
              <CardTitle className={`text-2xl font-black text-${color}-700`}>{fmt(value)}</CardTitle>
            </CardHeader>
            <CardContent><p className="text-xs text-muted-foreground">{sub}</p></CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Card className="bg-white/70 backdrop-blur-md shadow-xl border-slate-100 rounded-[2rem] overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Movimentações Financeiras</CardTitle>
              <CardDescription>Gerencie entradas, saídas e contas fixas do mês.</CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pesquisar..." className="pl-10 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="px-6 pt-4 pb-0 border-b flex items-center justify-between gap-4 flex-wrap">
            <TabsList className="bg-slate-100 p-1">
              <TabsTrigger value="income" className="gap-1.5">
                <ArrowUpCircle className="h-4 w-4 text-emerald-500" /> Entradas
              </TabsTrigger>
              <TabsTrigger value="expense" className="gap-1.5">
                <ArrowDownCircle className="h-4 w-4 text-rose-500" /> Saídas
              </TabsTrigger>
              <TabsTrigger value="recurring" className="gap-1.5">
                <CalendarClock className="h-4 w-4 text-amber-500" /> Contas Fixas
              </TabsTrigger>
            </TabsList>
            <div className="pb-1">
              {activeTab === 'income' && (
                <Button size="sm" onClick={() => setModalType('income')} className="bg-emerald-600 hover:bg-emerald-500 gap-1.5">
                  <PlusCircle className="h-4 w-4" /> Nova Entrada
                </Button>
              )}
              {activeTab === 'expense' && (
                <Button size="sm" onClick={() => setModalType('expense')} className="bg-rose-600 hover:bg-rose-500 gap-1.5">
                  <PlusCircle className="h-4 w-4" /> Nova Saída
                </Button>
              )}
              {activeTab === 'recurring' && (
                <Button size="sm" onClick={() => setShowRecurring(true)} className="bg-amber-500 hover:bg-amber-400 gap-1.5">
                  <PlusCircle className="h-4 w-4" /> Nova Conta Fixa
                </Button>
              )}
            </div>
          </div>

          {/* ENTRADAS */}
          <TabsContent value="income" className="m-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomeRows.length > 0 ? incomeRows.map(t => (
                  <TableRow key={t.id} className="hover:bg-emerald-50/30">
                    <TableCell><DateCell t={t} /></TableCell>
                    <TableCell className="text-sm text-slate-600">{t.clientName || <span className="text-slate-300 italic text-xs">—</span>}</TableCell>
                    <TableCell className="font-semibold text-slate-800">{t.description}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs bg-white">{t.category}</Badge></TableCell>
                    <TableCell className="text-sm text-slate-500">{t.paymentMethod || '—'}</TableCell>
                    <TableCell>
                      <Badge className={cn(t.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-400 text-white')}>
                        {t.status === 'completed' ? 'Recebido' : 'A Receber'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-black text-emerald-600">+ {fmt(t.amount)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl w-48">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {t.status === 'pending' && (
                            <DropdownMenuItem className="text-emerald-600 font-medium cursor-pointer" onClick={() => markPaid(t)}>
                              <CheckCircle className="mr-2 h-4 w-4" /> Confirmar Recebimento
                            </DropdownMenuItem>
                          )}
                          {t.status === 'completed' && (
                            <DropdownMenuItem className="text-blue-600 font-medium cursor-pointer" onClick={() => setReceiptTx(t)}>
                              <Receipt className="mr-2 h-4 w-4" /> Gerar Recibo
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-rose-600 font-medium cursor-pointer" onClick={() => setToDelete(t)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) : <EmptyRow cols={8} label="Nenhuma entrada registrada neste período." />}
              </TableBody>
            </Table>
          </TabsContent>

          {/* SAÍDAS */}
          <TabsContent value="expense" className="m-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>PIX / Código</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenseRows.length > 0 ? expenseRows.map(t => (
                  <TableRow key={t.id} className="hover:bg-rose-50/30">
                    <TableCell><DateCell t={t} /></TableCell>
                    <TableCell>
                      <div className="font-semibold text-slate-800">{t.description}</div>
                      {t.relatedProjectId && <div className="text-xs text-slate-400">Projeto vinculado</div>}
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs bg-white">{t.category}</Badge></TableCell>
                    <TableCell>
                      {t.barcode
                        ? <div className="flex items-center gap-1"><span className="font-mono text-xs text-slate-500 max-w-[80px] truncate">{t.barcode}</span><CopyBtn text={t.barcode} /></div>
                        : <span className="text-slate-300 italic text-xs">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(t.status === 'completed' ? 'bg-emerald-500' : 'bg-rose-400 text-white')}>
                        {t.status === 'completed' ? 'Pago' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-black text-rose-600">- {fmt(t.amount)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl w-48">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {t.status === 'pending' && (
                            <DropdownMenuItem className="text-emerald-600 font-medium cursor-pointer" onClick={() => markPaid(t)}>
                              <CheckCircle className="mr-2 h-4 w-4" /> Marcar como Pago
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-rose-600 font-medium cursor-pointer" onClick={() => setToDelete(t)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) : <EmptyRow cols={7} label="Nenhuma saída registrada neste período." />}
              </TableBody>
            </Table>
          </TabsContent>

          {/* CONTAS FIXAS */}
          <TabsContent value="recurring" className="m-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Recorrência</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {recurringRows.length > 0 ? recurringRows.map(t => (
                  <TableRow key={t.id} className="hover:bg-amber-50/30">
                    <TableCell><DateCell t={t} /></TableCell>
                    <TableCell className="font-semibold text-slate-800">{t.description}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs bg-white">{t.category}</Badge></TableCell>
                    <TableCell>
                      {t.recurringDay
                        ? <span className="text-sm font-bold text-amber-600">Todo dia {t.recurringDay}</span>
                        : <span className="text-slate-400 text-xs">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(t.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-400 text-white')}>
                        {t.status === 'completed' ? 'Pago ✓' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-black text-amber-700">{fmt(t.amount)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl w-52">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {t.status === 'pending' && (
                            <DropdownMenuItem className="text-emerald-600 font-medium cursor-pointer" onClick={() => markPaid(t)}>
                              <CheckCircle className="mr-2 h-4 w-4" /> Marcar como Pago
                            </DropdownMenuItem>
                          )}
                          {t.status === 'completed' && (
                            <DropdownMenuItem className="text-amber-600 font-medium cursor-pointer" onClick={() => handleRenew(t)}>
                              <RefreshCw className="mr-2 h-4 w-4" /> Renovar para Próx. Mês
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-rose-600 font-medium cursor-pointer" onClick={() => setToDelete(t)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-28 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <CalendarClock className="h-8 w-8 opacity-30" />
                        <p>Nenhuma conta fixa registrada neste período.</p>
                        <Button size="sm" variant="outline" onClick={() => setShowRecurring(true)} className="mt-1 gap-1.5">
                          <PlusCircle className="h-3.5 w-3.5" /> Cadastrar Conta Fixa
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Modals */}
      <RegisterTransactionModal
        isOpen={modalType !== null}
        onClose={() => setModalType(null)}
        defaultType={modalType ?? 'income'}
      />

      <RegisterRecurringModal
        isOpen={showRecurring}
        onClose={() => setShowRecurring(false)}
      />

      <ReceiptModal
        isOpen={receiptTx !== null}
        onClose={() => setReceiptTx(null)}
        transaction={receiptTx}
      />

      <AlertDialog open={toDelete !== null} onOpenChange={open => { if (!open) setToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá permanentemente <strong>{toDelete?.description}</strong>
              {toDelete ? ` (${fmt(toDelete.amount)})` : ''}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => { if (toDelete) { deleteTransaction(toDelete.id); setToDelete(null); } }}
            >
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
