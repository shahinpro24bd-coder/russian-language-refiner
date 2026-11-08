import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, ImagePlus, LogOut, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { DEFAULT_ACCOUNT, KEYS, load, type Account } from "@/lib/admin-store";

const PAGES = [
  { slug: "index", label: "Home" },
  { slug: "about", label: "About" },
  { slug: "service", label: "Treatments" },
  { slug: "appoinment", label: "Appointment" },
  { slug: "contact", label: "Contact" },
] as const;

const SESSION_KEY = "site_admin_session_v1";
const CONTENT_KEY = "site_local_content_v1";

type LocalContent = {
  langs: Record<string, Record<string, string>>;
  images: Record<string, string>;
};

function readContent(): LocalContent {
  if (typeof window === "undefined") return { langs: {}, images: {} };
  try {
    const raw = window.localStorage.getItem(CONTENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<LocalContent>) : null;
    return { langs: parsed?.langs ?? {}, images: parsed?.images ?? {} };
  } catch {
    return { langs: {}, images: {} };
  }
}

function writeContent(next: LocalContent) {
  window.localStorage.setItem(CONTENT_KEY, JSON.stringify(next));
}

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    links: [{ rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Teko:wght@500;600&display=swap" }],
    meta: [
      { title: "Admin Panel | Dr. Dina Svinareva" },
      { name: "description", content: "Manage Dr. Dina Svinareva website content, treatments and appointment requests." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin Panel | Dr. Dina Svinareva" },
      { property: "og:description", content: "Manage Dr. Dina Svinareva website content, treatments and appointment requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

type Status = { tone: "idle" | "busy" | "ok" | "error"; message: string };

function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setAuthed(window.localStorage.getItem(SESSION_KEY) === "1");
    setChecked(true);
  }, []);

  const [editing, setEditing] = useState<string | null>(null);
  const signOut = () => {
    window.localStorage.removeItem(SESSION_KEY);
    setAuthed(false);
    setEditing(null);
  };
  if (!checked) return null;
  if (!authed)
    return (
      <LoginScreen
        onSuccess={() => {
          window.localStorage.setItem(SESSION_KEY, "1");
          setAuthed(true);
        }}
      />
    );
  if (editing)
    return <Editor initialPage={editing} onBack={() => setEditing(null)} onSignOut={signOut} />;
  return <AdminDashboard onEditPage={setEditing} onSignOut={signOut} />;
}

function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  return (
    <div lang="en" dir="ltr" className="flex min-h-dvh items-center justify-center bg-muted px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const acc = load<Account>(KEYS.account, DEFAULT_ACCOUNT);
          if (user.trim() === acc.username && password === acc.password) onSuccess();
          else setError("Wrong username or password.");
        }}
        className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <h1 className="text-lg font-semibold text-card-foreground">Dr. Dina Svinareva Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to manage the website.</p>

        <label className="mt-5 block text-xs font-medium text-muted-foreground">
          Username
          <input
            value={user}
            onChange={(e) => setUser(e.target.value)}
            autoComplete="username"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          />
        </label>
        <label className="mt-3 block text-xs font-medium text-muted-foreground">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          />
        </label>

        {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}

        <Button type="submit" className="mt-5 w-full">
          Sign in
        </Button>
      </form>
    </div>
  );
}

function Editor({ onSignOut, onBack, initialPage }: { onSignOut: () => void; onBack: () => void; initialPage: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [page, setPage] = useState<string>(initialPage);
  const [lang, setLang] = useState<string>("en");
  const [dirty, setDirty] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ tone: "idle", message: "" });
  const [images, setImages] = useState<{ slot: string; url: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingSlot = useRef<string | null>(null);

  const dirtyCount = useMemo(() => Object.keys(dirty).length, [dirty]);
  const frameSrc = `/${page}.html?edit=1&lang=${lang}`;

  const saveImage = useCallback(async (slot: string, file: File) => {
    setStatus({ tone: "busy", message: "Saving image…" });
    if (file.size > 1_500_000) {
      setStatus({ tone: "error", message: "Image is too large (maximum 1.5 MB)." });
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read the file."));
      reader.readAsDataURL(file);
    }).catch(() => "");
    if (!dataUrl) {
      setStatus({ tone: "error", message: "Could not read the image." });
      return;
    }
    try {
      const current = readContent();
      current.images[slot] = dataUrl;
      writeContent(current);
      frameRef.current?.contentWindow?.postMessage(
        { source: "cms-admin", type: "image-saved", slot, url: dataUrl },
        "*",
      );
      setStatus({ tone: "ok", message: "Image updated in this browser." });
    } catch {
      setStatus({ tone: "error", message: "Browser storage is full. Could not save the image." });
    }
  }, []);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || data.source !== "cms-editor") return;
      if (data.type === "lang-changed" && typeof data.lang === "string") {
        setLang(data.lang);
        return;
      }
      if (data.type === "images" && Array.isArray(data.images)) {
        setImages(data.images);
        return;
      }
      if (data.type === "text") {
        setDirty((prev) => ({ ...prev, [data.key]: data.value }));
      } else if (data.type === "image" && data.file instanceof File) {
        void saveImage(data.slot, data.file);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [saveImage]);

  function handleSave() {
    if (!dirtyCount) return;
    try {
      const current = readContent();
      const forLang = { ...(current.langs[lang] ?? {}) };
      for (const [key, value] of Object.entries(dirty)) forLang[key] = value;
      current.langs[lang] = forLang;
      writeContent(current);
      setDirty({});
      setStatus({ tone: "ok", message: "Changes saved in this browser." });
    } catch {
      setStatus({ tone: "error", message: "Could not save changes." });
    }
  }

  function handleReset() {
    if (!window.confirm("Delete all website content changes saved in this browser?")) return;
    window.localStorage.removeItem(CONTENT_KEY);
    setDirty({});
    setStatus({ tone: "ok", message: "Original content restored." });
    frameRef.current?.contentWindow?.location.reload();
  }

  function switchTo(next: { page?: string; lang?: string }) {
    if (dirtyCount && !window.confirm("You have unsaved changes. Continue without saving?")) return;
    setDirty({});
    if (next.page) setPage(next.page);
    if (next.lang) setLang(next.lang);
  }

  return (
    <div lang="en" dir="ltr" className="flex h-dvh min-h-0 flex-col bg-muted">
      <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card px-3 py-3 sm:px-4 lg:flex lg:flex-wrap">
        <div className="flex min-w-0 items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={onBack}>
            ← Dashboard
          </Button>
          <select
            aria-label="Page to edit"
            value={page}
            onChange={(e) => switchTo({ page: e.target.value })}
            className="min-w-0 max-w-48 rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
          >
            {PAGES.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex shrink-0 overflow-hidden rounded-md border border-input">
          {(
            [
              ["en", "English"],
              ["he", "Hebrew"],
            ] as const
          ).map(([code, label]) => (
            <Button
              key={code}
              type="button"
              variant={lang === code ? "default" : "ghost"}
              size="sm"
              onClick={() => switchTo({ lang: code })}
              className="rounded-none px-2.5"
            >
              {label}
            </Button>
          ))}
        </div>

        <span className="col-span-2 min-w-0 text-xs text-muted-foreground lg:col-auto">
          Dr. Dina Svinareva · {dirtyCount ? "Unsaved changes" : "Website editor"}
        </span>

        <div className="col-span-2 flex min-w-0 flex-wrap items-center justify-end gap-2 lg:col-auto lg:ml-auto">
          {status.message ? (
            <span
              className={
                "text-xs " +
                (status.tone === "error" ? "text-destructive" : "text-muted-foreground")
              }
            >
              {status.message}
            </span>
          ) : null}
          <Button
            type="button"
            onClick={handleSave}
            disabled={!dirtyCount || status.tone === "busy"}
            size="sm"
          >
            <Save aria-hidden="true" />
            Save{dirtyCount ? ` (${dirtyCount})` : ""}
          </Button>
          <Button type="button" onClick={handleReset} variant="ghost" size="sm">
            <RotateCcw aria-hidden="true" />
            Reset
          </Button>
          <a
            href={`/${page}.html`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            View site
          </a>
          <Button
            type="button"
            onClick={onSignOut}
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
          >
            <LogOut aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <iframe
          ref={frameRef}
          key={frameSrc}
          src={frameSrc}
          title="Dr. Dina Svinareva website preview"
          className="min-h-0 min-w-0 flex-1 border-0 bg-background"
        />
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-l border-border bg-card p-3 md:block">
          <h2 className="mb-2 text-sm font-semibold text-card-foreground">
            Images ({images.length})
          </h2>
          <ul className="space-y-3">
            {images.map((img) => (
              <li key={img.slot} className="rounded-md border border-border p-2">
                <button
                  type="button"
                  onClick={() =>
                    frameRef.current?.contentWindow?.postMessage(
                      { source: "cms-admin", type: "scroll-to", slot: img.slot },
                      "*",
                    )
                  }
                  className="block w-full"
                  title="Show on page"
                >
                  <img src={img.url} alt={img.slot} className="h-24 w-full rounded object-cover" />
                </button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="mt-2 w-full"
                  disabled={status.tone === "busy"}
                  onClick={() => {
                    pendingSlot.current = img.slot;
                    fileRef.current?.click();
                  }}
                >
                  <ImagePlus aria-hidden="true" />
                  Replace image
                </Button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file && pendingSlot.current) void saveImage(pendingSlot.current, file);
        }}
      />
    </div>
  );
}
