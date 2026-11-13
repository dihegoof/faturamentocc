import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AccountShell } from "@/components/cargo/AccountShell";
import { CatalogSection } from "@/components/cargo/CatalogSection";
import { ClientsSection } from "@/components/cargo/ClientsSection";
import { ContactsSection } from "@/components/cargo/ContactsSection";
import { UsersSection } from "@/components/cargo/UsersSection";
import { getCurrentUser } from "@/lib/auth";

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

function Painel() {
  const { data: me } = useQuery({ queryKey: ["me-profile"], queryFn: getCurrentUser });
  return (
    <main className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
      <h1 className="font-display text-3xl font-bold">Painel</h1>
      <ClientsSection />
      <ContactsSection />
      <CatalogSection />
      {me?.profile === "admin" && <UsersSection />}
    </main>
  );
}
