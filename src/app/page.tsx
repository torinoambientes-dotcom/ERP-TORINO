'use client';
import Link from 'next/link';
import { useContext } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AppContext } from '@/context/app-context';
import { PageHeader } from '@/components/layout/page-header';

export default function ProjectsPage() {
  const { projects } = useContext(AppContext);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Projetos"
        description="Visualize e gerencie todos os seus projetos."
      />
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((project) => (
            <Link
              href={`/projects/${project.id}`}
              key={project.id}
              className="block h-full transform transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <Card className="h-full cursor-pointer">
                <CardHeader>
                  <CardTitle className="font-headline text-lg tracking-tight">
                    {project.clientName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {project.environments.length} ambiente(s)
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/50">
          <div className="text-center">
            <h3 className="font-headline text-xl font-semibold text-muted-foreground">
              Nenhum projeto cadastrado
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Cadastre um novo projeto na barra lateral.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
