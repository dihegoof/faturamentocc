import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AccountShell } from "@/components/cargo/AccountShell";
import { CatalogSection } from "@/components/cargo/CatalogSection";
import { ClientsSection } from "@/components/cargo/ClientsSection";
import { ContactsSection } from "@/components/cargo/ContactsSection";
import { UsersSection } from "@/components/cargo/UsersSection";
import { ArchiveSection } from "@/components/cargo/ArchiveSection";
import { AgendaSection } from "@/components/cargo/AgendaSection";
import { AgendaSyncToggle } from "@/components/cargo/AgendaSyncToggle";
import { DeletedLoadsSection } from "@/components/cargo/DeletedLoadsSection";
import { getCurrentUser } from "@/lib/auth";
import { SectionInfo } from "@/components/cargo/SectionInfo";
import { EraseAllButton } from "@/components/cargo/EraseAllButton";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel — Cargas CocaCola" },
      { name: "description", content: "Cadastros de clientes, e-mails de CT-e, produtos e usuários." },
      { property: "og:title", content: "Painel — Cargas CocaCola" },
      { property: "og:description", content: "Cadastros da plataforma de cargas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AccountShell>
      <Painel />
    </AccountShell>
  ),
});

/** Título com (i): explicação longa no hover, resumo curto embaixo. */
const SECOES: { id: string; curto: string; detalhe: string }[] = [
  { id: "config", curto: "Liga e desliga os recursos do app.", detalhe: "Sincronização da Agenda: com ela ligada o Faturamento sobe a agenda e as cargas ficam aguardando a Remessa. Desligada, o app funciona como antes. Aviso de pallets: avisa quando a carga passa do maior valor que a placa já levou." },
  { id: "agenda", curto: "Upload da agenda do dia seguinte.", detalhe: "Sobe o arquivo .xlsx da agenda. O app lê a aba Programação e cria as cargas aguardando a Remessa definir placa e transportadora. O DT é a chave que liga a carga à Remessa." },
  { id: "excluidas", curto: "Cargas fora do painel, com restaurar.", detalhe: "A exclusão tira a carga da operação para todos. Ela continua aqui e pode voltar ao painel a qualquer momento. Nada é apagado do sistema antes de 6 meses." },
  { id: "arquivo", curto: "Retenção e arquivo morto.", detalhe: "Todo o histórico fica no sistema por no mínimo 6 meses. Passado esse prazo o período é exportado e compactado para o arquivo morto, e o expurgo só libera depois da carência." },
  { id: "clientes", curto: "Cadastro de centros e clientes.", detalhe: "Centro (sigla), nome, CNPJ, código do cliente, itinerário e tipo de pallet. O código do centro liga a carga ao cliente no espelho." },
  { id: "emails", curto: "Destinatários do CT-e manual.", detalhe: "Para fixo, cópia fixa e e-mails por transportadora. É daqui que saem os destinatários do e-mail de solicitação de CT-e." },
  { id: "catalogo", curto: "Catálogo de produtos.", detalhe: "Código, descrição, caixas por pallet e código SAP. Serve para conferir as caixas das cargas e calcular pallets." },
  { id: "usuarios", curto: "Usuários da plataforma.", detalhe: "Cadastro de quem acessa o app, com o perfil de cada um: administrador, faturamento ou remessa." },
];

function Titulo({ id }: { id: string }) {
  const s = SECOES.find((x) => x.id === id)!;
  return (
    <div className="flex items-center gap-2 pt-1">
      <h2 className="font-display text-xl font-bold">{s.curto}</h2>
      <SectionInfo title={s.curto} detail={s.detalhe} />
    </div>
  );
}

function Painel() {
  const { data: me } = useQuery({ queryKey: ["me-profile"], queryFn: getCurrentUser });
  const isAdmin = me?.profile === "admin";

  return (
    <main className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
      <h1 className="font-display text-3xl font-bold">Painel</h1>

      <Titulo id="config" />
      {isAdmin && <AgendaSyncToggle me={me?.display_name ?? me?.email ?? undefined} />}

      <Titulo id="agenda" />
      {isAdmin && <AgendaSection uploadedBy={me?.display_name ?? me?.email ?? undefined} />}

      <Titulo id="excluidas" />
      {isAdmin && <DeletedLoadsSection />}

      <Titulo id="arquivo" />
      {isAdmin && <ArchiveSection />}

      <Titulo id="clientes" />
      <ClientsSection />

      <Titulo id="emails" />
      <ContactsSection />

      <Titulo id="catalogo" />
      <CatalogSection />

      <Titulo id="usuarios" />
      {isAdmin && <UsersSection />}

      <h2 className="font-display text-xl font-bold">
      E-mails para CT-e manual<EraseAllButton />
      </h2>
    </main>
  );
}
