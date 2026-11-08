import { createFileRoute } from "@tanstack/react-router";

/** Every other public page: /about.html, /service.html, /contact.html … */
export const Route = createFileRoute("/$page")({
  head: ({ params }) => {
    const labels: Record<string, string> = {
      "about.html": "About",
      "service.html": "Treatments",
      "appoinment.html": "Appointment",
      "contact.html": "Contact",
    };
    const label = labels[params.page] ?? "Page";
    const title = `${label} | Dr. Dina Svinareva`;
    const description = `Dr. Dina Svinareva — ${label.toLowerCase()}: ophthalmic and oculoplastic surgery in Voronezh & Belgorod.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { renderSitePage } = await import("@/lib/site-content/render.server");
        const slug = String(params.page).replace(/\.html$/i, "");
        return renderSitePage(request, slug);
      },
    },
  },
});
