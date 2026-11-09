import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/faturamento")({
  component: () => <div className="p-6">Faturamento ok</div>,
});
