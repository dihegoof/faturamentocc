import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardPaste, FileText, Truck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cargas CocaCola — Controle operacional de cargas" },
      { name: "description", content: "Gestão operacional de cargas com perfis de Faturamento e Remessa." },
      { property: "og:title", content: "Cargas CocaCola — Controle operacional" },
      { property: "og:description", content: "Gestão operacional de cargas com perfis de Faturamento e Remessa." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-hero text-primary-foreground">
      <div className="wave-stripe flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="mb-3 grid h-14 w-14 place-items-center rounded-xl bg-primary-foreground/15">
          <Truck className="h-8 w-8" />
        </div>
        <h1 className="text-center font-display text-5xl font-bold uppercase tracking-wide md:text-7xl">Cargas · CocaCola</h1>
        <p className="mt-2 text-center text-primary-foreground/80">Controle operacional de cargas. Escolha seu perfil de trabalho.</p>
        <div className="mt-10 grid w-full max-w-3xl gap-4 md:grid-cols-2">
          {[
            { to: "/faturamento" as const, icon: FileText, title: "Faturamento", text: "Faturar, solicitar CT-e, registrar corte, impressão e finalizar cargas." },
            { to: "/remessa" as const, icon: ClipboardPaste, title: "Remessa", text: "Importar cargas, acompanhar status em tempo real e consultar histórico." },
          ].map(({ to, icon: Icon, title, text }) => (
            <Link key={to} to={to} className="group rounded-xl bg-card p-6 text-card-foreground shadow-xl transition-transform hover:-translate-y-1">
              <Icon className="h-8 w-8 text-primary" />
              <div className="mt-3 font-display text-3xl font-bold uppercase">{title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              <span className="mt-4 inline-block font-semibold text-primary group-hover:underline">Entrar →</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
