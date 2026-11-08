import { createFileRoute } from "@tanstack/react-router";
import { SITE_LOGO_URL } from "@/lib/site-content/branding";

/** Home page — rendered from the database copy of the original markup. */
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dr. Dina Svinareva, MD, Ph.D. | Ophthalmic & Oculoplastic Surgeon" },
      { name: "description", content: "Consultant ophthalmic surgeon in Voronezh & Belgorod: blepharoplasty, oculoplastic surgery, cataract, glaucoma and strabismus care." },
      { property: "og:title", content: "Dr. Dina Svinareva, MD, Ph.D. | Ophthalmic & Oculoplastic Surgeon" },
      { property: "og:description", content: "Consultant ophthalmic surgeon in Voronezh & Belgorod: blepharoplasty, oculoplastic surgery, cataract, glaucoma and strabismus care." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "preload",
        as: "image",
        href: SITE_LOGO_URL,
        fetchPriority: "high",
      },
    ],
  }),
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { renderSitePage } = await import("@/lib/site-content/render.server");
        return renderSitePage(request, "index");
      },
    },
  },
});
