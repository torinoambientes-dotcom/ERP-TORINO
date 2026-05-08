
'use client';

import { useContext, useMemo, useState } from 'react';
import { AppContext } from '@/context/app-context';
import { useUser } from '@/firebase';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Wallet, ArrowUpCircle, ArrowDownCircle, Banknote, Calendar as CalendarIcon, Filter, Search, MoreHorizontal, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Transaction } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RegisterTransactionModal } from '@/components/modals/register-transaction-modal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';

export default function FinancePage() {
  const { user } = useUser();
  const { transactions, isLoading, projects, quotes, teamMembers, deleteTransaction } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [isModalOpen, setModalOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>(format(new Date(), 'yyyy-MM'));

  const loggedInMember = useMemo(() => {
    if (!user || !teamMembers) return null;
    return teamMembers.find(member => member.id === user.uid);
  }, [user, teamMembers]);

  const isAdmin = loggedInMember?.role === 'Administrativo';

  const filteredTransactions = useMemo(() => {
    return (transactions || []).filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           t.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTab = activeTab === 'all' || 
                        (activeTab === 'income' && t.type === 'income') || 
                        (activeTab === 'expense' && t.type === 'expense') ||
                        (activeTab === 'pending' && t.status === 'pending');
      const matchesDate = !dateFilter || (t.date && t.date.startsWith(dateFilter));
      
      return matchesSearch && matchesTab && matchesDate;
    });
  }, [transactions, searchTerm, activeTab, dateFilter]);

  const summary = useMemo(() => {
    const periodTransactions = transactions.filter(t => !dateFilter || (t.date && t.date.startsWith(dateFilter)));
    
    const income = periodTransactions.filter(t => t.type === 'income' && t.status === 'completed').reduce((acc, t) => acc + t.amount, 0);
    const expense = periodTransactions.filter(t => t.type === 'expense' && t.status === 'completed').reduce((acc, t) => acc + t.amount, 0);
    const pendingReceivables = periodTransactions.filter(t => t.type === 'income' && t.status === 'pending').reduce((acc, t) => acc + t.amount, 0);
    const pendingPayables = periodTransactions.filter(t => t.type === 'expense' && t.status === 'pending').reduce((acc, t) => acc + t.amount, 0);

    return {
      income,
      expense,
      balance: income - expense,
      pendingReceivables,
      pendingPayables
    };
  }, [transactions, dateFilter]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (isLoading || (user && !loggedInMember)) {
    return <div className="flex h-full w-full items-center justify-center"><p>Carregando financeiro...</p></div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="p-6 bg-rose-50 rounded-full">
           <Wallet className="h-12 w-12 text-rose-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-800">Acesso Restrito</h2>
        <p className="text-slate-500 text-center max-w-md">
          Desculpe, você não tem permissão para visualizar as informações financeiras. 
          Entre em contato com um administrador se precisar de acesso.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader 
          title="Gestão Financeira" 
          description="Controle de entradas, saídas e fluxo de caixa da Torino Ambientes."
        />
        <div className="flex gap-2">
          <Input 
            type="month"
            className="w-full md:w-40 bg-white border-slate-200"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
          <Button onClick={() => setModalOpen(true)} className="gap-2 bg-slate-900 hover:bg-slate-800">
            <PlusCircle className="h-4 w-4" /> Nova Transação
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white/50 backdrop-blur-sm border-emerald-100 shadow-sm overflow-hidden relative group transition-all hover:shadow-md">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
             <ArrowUpCircle className="h-16 w-16 text-emerald-600" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 font-medium uppercase tracking-wider text-xs">
              <TrendingUp className="h-3 w-3 text-emerald-500" /> Total de Entradas
            </CardDescription>
            <CardTitle className="text-3xl font-black text-emerald-700">
              {formatCurrency(summary.income)}
            </CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-xs text-muted-foreground">Confirmadas no mês atual</p>
          </CardContent>
        </Card>

        <Card className="bg-white/50 backdrop-blur-sm border-rose-100 shadow-sm overflow-hidden relative group transition-all hover:shadow-md">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
             <ArrowDownCircle className="h-16 w-16 text-rose-600" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 font-medium uppercase tracking-wider text-xs">
              <TrendingDown className="h-3 w-3 text-rose-500" /> Total de Saídas
            </CardDescription>
            <CardTitle className="text-3xl font-black text-rose-700">
              {formatCurrency(summary.expense)}
            </CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-xs text-muted-foreground">Confirmadas no mês atual</p>
          </CardContent>
        </Card>

        <Card className="bg-white/50 backdrop-blur-sm border-blue-100 shadow-sm overflow-hidden relative group transition-all hover:shadow-md">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
             <DollarSign className="h-16 w-16 text-blue-600" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 font-medium uppercase tracking-wider text-xs text-blue-600">
              <Wallet className="h-3 w-3" /> Saldo em Caixa
            </CardDescription>
            <CardTitle className={cn("text-3xl font-black", summary.balance >= 0 ? "text-blue-700" : "text-rose-700")}>
              {formatCurrency(summary.balance)}
            </CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-xs text-muted-foreground">Saldo disponível atual</p>
          </CardContent>
        </Card>

        <Card className="bg-white/50 backdrop-blur-sm border-amber-100 shadow-sm overflow-hidden relative group transition-all hover:shadow-md">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
             <Banknote className="h-16 w-16 text-amber-600" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 font-medium uppercase tracking-wider text-xs text-amber-600">
              <CalendarIcon className="h-3 w-3" /> Previsão Pendente
            </CardDescription>
            <CardTitle className="text-3xl font-black text-amber-700">
              {formatCurrency(summary.pendingReceivables - summary.pendingPayables)}
            </CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-xs text-muted-foreground">A receber/pagar pendentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="bg-white/70 backdrop-blur-md shadow-xl border-slate-100 rounded-[2rem] overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <CardTitle>Histórico de Transações</CardTitle>
              <CardDescription>Visualize e gerencie todas as movimentações financeiras.</CardDescription>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Pesquisar descrição ou categoria..." 
                className="pl-10 bg-white border-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-6">
            <Tabs defaultValue="all" onValueChange={setActiveTab}>
              <TabsList className="bg-slate-100/80 p-1">
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="income">Entradas</TabsTrigger>
                <TabsTrigger value="expense">Saídas</TabsTrigger>
                <TabsTrigger value="pending">Pendentes</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="w-[120px]">Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((t) => (
                  <TableRow key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell className="font-medium text-slate-500">
                      {format(parseISO(t.date), 'dd MMM yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-slate-800">{t.description}</div>
                      {t.relatedProjectId && (
                        <div className="text-xs text-slate-400 mt-1">Projeto Relacionado</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium bg-white">
                        {t.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={t.status === 'completed' ? 'default' : t.status === 'pending' ? 'secondary' : 'destructive'}
                        className={cn(
                          t.status === 'completed' && "bg-emerald-500 hover:bg-emerald-600",
                          t.status === 'pending' && "bg-amber-400 hover:bg-amber-500 text-white"
                        )}
                      >
                        {t.status === 'completed' ? 'Confirmado' : t.status === 'pending' ? 'Pendente' : 'Cancelado'}
                      </Badge>
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-black text-lg",
                      t.type === 'income' ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Transação?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação removerá permanentemente o registro de <strong>{t.description}</strong> no valor de <strong>{formatCurrency(t.amount)}</strong>.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-rose-600 hover:bg-rose-700 text-white"
                              onClick={() => deleteTransaction(t.id)}
                            >
                              Sim, excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Nenhuma transação encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <RegisterTransactionModal 
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
