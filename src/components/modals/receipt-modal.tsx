'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { Transaction } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRef } from 'react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export function ReceiptModal({ isOpen, onClose, transaction }: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!transaction) return null;

  const handlePrint = () => {
    if (!receiptRef.current) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>Recibo - Torino Ambientes</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
              .receipt-container { max-width: 800px; margin: 0 auto; border: 2px solid #ddd; padding: 40px; border-radius: 8px; }
              .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { font-size: 24px; font-weight: bold; color: #1a1a1a; }
              .receipt-title { font-size: 28px; font-weight: bold; color: #10b981; text-transform: uppercase; letter-spacing: 2px; }
              .value-box { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px 20px; border-radius: 8px; font-size: 20px; font-weight: bold; margin-bottom: 30px; }
              .content { font-size: 16px; line-height: 2; margin-bottom: 40px; }
              .highlight { font-weight: bold; border-bottom: 1px solid #333; padding: 0 6px; }
              .signature-section { margin-top: 80px; display: flex; flex-direction: column; align-items: center; }
              .signature-line { width: 300px; border-bottom: 1px solid #000; margin-bottom: 10px; }
              .signature-name { font-weight: bold; }
              .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            ${receiptRef.current.innerHTML}
          </body>
        </html>
      `);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => { document.body.removeChild(iframe); }, 1000);
      }, 250);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formattedDate = format(
    parseISO(transaction.paymentDate || transaction.date),
    "dd 'de' MMMM 'de' yyyy",
    { locale: ptBR }
  );

  const clientName = transaction.clientName?.trim() || 'Cliente não informado';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] rounded-[2rem]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Visualização do Recibo</DialogTitle>
        </DialogHeader>

        {/* Hidden printable area */}
        <div className="hidden">
          <div ref={receiptRef}>
            <div className="receipt-container">
              <div className="header">
                <div className="logo">Torino Ambientes</div>
                <div className="receipt-title">RECIBO</div>
              </div>
              <div className="value-box">Valor: {formatCurrency(transaction.amount)}</div>
              <div className="content">
                Recebemos de <span className="highlight">{clientName}</span> o valor de{' '}
                <span className="highlight">{formatCurrency(transaction.amount)}</span> referente a{' '}
                <span className="highlight">{transaction.description}</span>, através da forma de pagamento{' '}
                <span className="highlight">{transaction.paymentMethod || 'Não informada'}</span>.
                <br /><br />
                Por ser verdade, firmamos o presente recibo.
              </div>
              <div className="footer">Documento emitido em {formattedDate}</div>
              <div className="signature-section">
                <div className="signature-line"></div>
                <div className="signature-name">Torino Ambientes</div>
              </div>
            </div>
          </div>
        </div>

        {/* Screen preview */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 my-4 relative shadow-inner overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[120px] font-black text-slate-100 opacity-50 pointer-events-none -rotate-12 select-none">
            RECIBO
          </div>
          <div className="relative z-10">
            <div className="flex justify-between items-center border-b-2 border-slate-200 pb-4 mb-6">
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Torino Ambientes</h2>
              <h1 className="text-2xl font-black text-emerald-500 uppercase tracking-widest">RECIBO</h1>
            </div>

            <div className="bg-white border border-slate-200 px-6 py-4 rounded-lg mb-5 shadow-sm">
              <span className="text-sm font-bold text-slate-400 uppercase tracking-wider block mb-1">Valor</span>
              <span className="text-3xl font-black text-slate-800">{formatCurrency(transaction.amount)}</span>
            </div>

            <div className="mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recebido de</span>
              <p className="text-lg font-black text-slate-800 mt-0.5">{clientName}</p>
            </div>

            <p className="text-slate-600 leading-relaxed text-base mb-8">
              Referente a <strong className="text-slate-800">{transaction.description}</strong>, através da forma de pagamento{' '}
              <strong className="text-slate-800">{transaction.paymentMethod || 'Não informada'}</strong>.
            </p>

            <div className="text-center mt-10 mb-4">
              <p className="text-sm text-slate-500 mb-10">Documento emitido em {formattedDate}</p>
              <div className="w-64 border-b border-slate-400 mx-auto mb-2"></div>
              <p className="font-bold text-slate-700">Torino Ambientes</p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="rounded-xl">Fechar</Button>
          <Button onClick={handlePrint} className="gap-2 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold">
            <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
