'use client';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MonitorPlay } from 'lucide-react';
import Link from 'next/link';

export default function FactoryDisplaySettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Ecrã da Fábrica"
        description="Configure e inicie a apresentação para o monitor da sua fábrica."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Iniciar Apresentação</CardTitle>
                    <CardDescription>
                        Clique no botão abaixo para iniciar o modo de apresentação em ecrã inteiro. A apresentação irá alternar automaticamente entre os marceneiros a cada minuto.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Link href="/factory-display/play" passHref>
                        <Button size="lg" className="w-full sm:w-auto">
                            <MonitorPlay className="mr-2 h-5 w-5" />
                            Iniciar Apresentação
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-1">
            <Card className="bg-muted/50">
                <CardHeader>
                    <CardTitle>Em Breve</CardTitle>
                    <CardDescription>
                       Mais opções de configuração estarão disponíveis aqui.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>∙ Selecionar quais marceneiros exibir.</p>
                    <p>∙ Ajustar tempo de rotação.</p>
                    <p>∙ Adicionar mensagens personalizadas.</p>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
