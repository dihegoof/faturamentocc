import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "./auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Cargas CocaCola — Controle operacional de cargas" },
      { name: "description", content: "Gestão operacional de cargas com perfis de Faturamento e Remessa." },
      { property: "og:title", content: "Cargas CocaCola — Controle operacional" },
      { property: "og:description", content: "Gestão operacional de cargas com perfis de Faturamento e Remessa." },
    ],
  }),
  component: LoginPage,
});
