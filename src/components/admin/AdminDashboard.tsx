import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Building2,
  CalendarCheck,
  ExternalLink,
  HelpCircle,
  Home,
  Info,
  KeyRound,
  LayoutGrid,
  Mail,
  Pencil,
  Phone,
  Plus,
  Stethoscope,
  Trash2,
  UserCog,
} from "lucide-react";
import {
  DEFAULT_ACCOUNT,
  DEFAULT_CONTACT,
  DEFAULT_FAQS,
  DEFAULT_SERVICES,
  KEYS,
  load,
  newId,
  save,
  type Account,
  type AppointmentRequest,
  type ContactInfo,
  type Faq,
  type Service,
} from "@/lib/admin-store";

export type Tab = "dashboard" | "contact" | "services" | "faqs" | "requests" | "account";

const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { id: "contact", label: "Contact Info", icon: Building2 },
  { id: "services", label: "Treatments", icon: Stethoscope },
  { id: "faqs", label: "FAQs", icon: HelpCircle },
  { id: "requests", label: "Appointment Requests", icon: CalendarCheck },
  { id: "account", label: "Account", icon: UserCog },
];

export const EDITABLE_PAGES = [
  { slug: "index", label: "Home", desc: "Hero, about the doctor, treatments, before & after, FAQ", icon: Home },
  { slug: "about", label: "About", desc: "Dr. Dina Svinareva's story, training and values", icon: Info },
  { slug: "service", label: "Treatments", desc: "All plastic and aesthetic treatments", icon: Stethoscope },
  { slug: "appoinment", label: "Appointment", desc: "Booking page and form texts", icon: CalendarCheck },
  { slug: "contact", label: "Contact", desc: "Contact details and form", icon: Mail },
] as const;

const btnOutline =
  "inline-flex items-center justify-center gap-2 border border-foreground bg-card px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-admin-accent-soft";
const btnAccent =
  "inline-flex items-center justify-center gap-2 border border-admin-accent bg-admin-accent px-3 py-1.5 text-sm text-admin-accent-foreground transition-opacity hover:opacity-90";
const input = "mt-1 w-full border border-input bg-background px-3 py-2 text-sm text-foreground";
const heading = "font-['Teko','Oswald',sans-serif] tracking-wide";

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-card p-5 shadow-sm ${className}`}>{children}</div>;
}

export function AdminDashboard({
  onEditPage,
  onSignOut,
}: {
  onEditPage: (slug: string) => void;
  onSignOut: () => void;
}) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [contact, setContact] = useState<ContactInfo>(DEFAULT_CONTACT);
  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES);
  const [faqs, setFaqs] = useState<Faq[]>(DEFAULT_FAQS);
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    setContact({ ...DEFAULT_CONTACT, ...load(KEYS.contact, {}) });
    setServices(load(KEYS.services, DEFAULT_SERVICES));
    setFaqs(load(KEYS.faqs, DEFAULT_FAQS));
    setRequests(load(KEYS.requests, []));
  }, []);

  function persist<T>(key: string, value: T) {
    save(key, value);
    setSaved(true);
  }

  const weekAgo = Date.now() - 7 * 864e5;
  const stats = [
    { n: requests.filter((r) => !r.read).length, label: "New appointment requests" },
    { n: requests.filter((r) => r.createdAt > weekAgo).length, label: "Requests this week" },
    { n: services.length, label: "Treatments listed" },
    { n: faqs.length, label: "FAQ questions" },
  ];

  return (
    <div lang="en" dir="ltr" className="min-h-dvh bg-admin-canvas text-foreground">
      <header className="sticky top-0 z-10 bg-admin-bar text-admin-bar-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className={`${heading} text-2xl`}>
            Dr. Dina Svinareva <span className="text-admin-accent">Admin</span>
          </span>
          <div className="flex items-center gap-3">
            <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 border border-admin-bar-foreground px-2 py-1 text-sm">
              <ExternalLink className="size-4" /> View site
            </a>
            <span className={`px-4 py-1 text-sm ${saved ? "bg-admin-accent/70" : "bg-admin-accent"}`}>
              {saved ? "Saved" : "Saving…"}
            </span>
            <button type="button" onClick={onSignOut} className="border border-admin-bar-foreground px-2 py-1 text-sm">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <nav className="mb-6 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={tab === t.id ? btnAccent : btnOutline}
            >
              <t.icon className="size-4" /> {t.label}
            </button>
          ))}
        </nav>

        {tab === "dashboard" && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {stats.map((s) => (
                <Card key={s.label}>
                  <div className="text-3xl font-semibold">{s.n}</div>
                  <div className="text-sm text-muted-foreground">{s.label}</div>
                </Card>
              ))}
            </div>

            <h2 className={`${heading} mt-8 text-2xl`}>Which page do you want to edit?</h2>
            <p className="mb-4 text-muted-foreground">Open a page to change its texts and photos directly on the page.</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {EDITABLE_PAGES.map((p) => (
                <Card key={p.slug} className="flex flex-col">
                  <span className="mb-3 flex size-11 items-center justify-center bg-admin-accent-soft text-admin-accent">
                    <p.icon className="size-5" />
                  </span>
                  <h3 className={`${heading} text-xl`}>{p.label}</h3>
                  <p className="mb-3 flex-1 text-sm text-muted-foreground">{p.desc}</p>
                  <div className="flex items-center justify-between">
                    <button type="button" onClick={() => onEditPage(p.slug)} className="inline-flex items-center gap-1.5 text-admin-accent">
                      <Pencil className="size-4" /> Edit page
                    </button>
                    <a href={`/${p.slug}.html`} target="_blank" rel="noreferrer" className="text-sm text-admin-accent/80">
                      View
                    </a>
                  </div>
                </Card>
              ))}
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-[2fr_1fr]">
              <Card>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className={`${heading} text-xl`}>Latest appointment requests</h3>
                  <button type="button" onClick={() => setTab("requests")} className="text-sm text-admin-accent">
                    See all
                  </button>
                </div>
                {requests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No requests yet. They appear here when patients send the appointment form.</p>
                ) : (
                  <ul>
                    {requests.slice(0, 5).map((r) => (
                      <li key={r.id} className="flex justify-between border-b border-foreground py-2 text-sm">
                        <span>
                          <b className={r.read ? "font-normal" : ""}>{r.name}</b> · {r.phone}
                        </span>
                        <span>{new Date(r.createdAt).toLocaleDateString("en-GB")}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card>
                <h3 className={`${heading} mb-3 text-xl`}>Quick actions</h3>
                <div className="grid gap-2">
                  <button type="button" className={btnAccent} onClick={() => onEditPage("index")}>
                    <Pencil className="size-4" /> Edit home page
                  </button>
                  <button type="button" className={btnOutline} onClick={() => setTab("contact")}>
                    <Phone className="size-4" /> Update contact info
                  </button>
                  <button type="button" className={btnOutline} onClick={() => setTab("services")}>
                    <Stethoscope className="size-4" /> Manage treatments
                  </button>
                  <button type="button" className={btnOutline} onClick={() => setTab("account")}>
                    <KeyRound className="size-4" /> Change password
                  </button>
                  <a className={btnOutline} href="/" target="_blank" rel="noreferrer">
                    <ExternalLink className="size-4" /> Open website
                  </a>
                </div>
              </Card>
            </div>
          </>
        )}

        {tab === "contact" && (
          <Card className="max-w-3xl">
            <h2 className={`${heading} text-2xl`}>Contact info</h2>
            <p className="mb-4 text-sm text-muted-foreground">Phone, WhatsApp and social links update the buttons across the website.</p>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                persist(KEYS.contact, contact);
              }}
            >
              {(
                [
                  ["doctor", "Doctor name"],
                  ["title", "Title"],
                  ["phone", "Phone"],
                  ["whatsapp", "WhatsApp number"],
                  ["email", "Email"],
                  ["hours", "Working hours"],
                  ["address", "Clinic address"],
                  ["instagram", "Instagram link"],
                  ["facebook", "Facebook link"],
                ] as [keyof ContactInfo, string][]
              ).map(([k, label]) => (
                <label key={k} className="text-xs font-medium text-muted-foreground">
                  {label}
                  <input
                    className={input}
                    value={contact[k]}
                    onChange={(e) => {
                      setSaved(false);
                      setContact({ ...contact, [k]: e.target.value });
                    }}
                  />
                </label>
              ))}
              <div className="sm:col-span-2">
                <button type="submit" className={btnAccent}>Save contact info</button>
              </div>
            </form>
          </Card>
        )}

        {tab === "services" && (
          <ListEditor
            title="Treatments"
            items={services}
            fields={[
              ["name", "Treatment name", false],
              ["description", "Short description", true],
            ]}
            blank={() => ({ id: newId(), name: "", description: "" })}
            onChange={(v) => {
              setSaved(false);
              setServices(v);
            }}
            onSave={() => persist(KEYS.services, services)}
          />
        )}

        {tab === "faqs" && (
          <ListEditor
            title="FAQs"
            items={faqs}
            fields={[
              ["question", "Question", false],
              ["answer", "Answer", true],
            ]}
            blank={() => ({ id: newId(), question: "", answer: "" })}
            onChange={(v) => {
              setSaved(false);
              setFaqs(v);
            }}
            onSave={() => persist(KEYS.faqs, faqs)}
          />
        )}

        {tab === "requests" && (
          <Requests
            requests={requests}
            onChange={(v) => {
              setRequests(v);
              persist(KEYS.requests, v);
            }}
          />
        )}

        {tab === "account" && <AccountForm />}
      </main>
    </div>
  );
}

function ListEditor<T extends { id: string }>({
  title,
  items,
  fields,
  blank,
  onChange,
  onSave,
}: {
  title: string;
  items: T[];
  fields: [keyof T & string, string, boolean][];
  blank: () => T;
  onChange: (v: T[]) => void;
  onSave: () => void;
}) {
  return (
    <Card className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className={`${heading} text-2xl`}>{title}</h2>
        <button type="button" className={btnOutline} onClick={() => onChange([...items, blank()])}>
          <Plus className="size-4" /> Add
        </button>
      </div>
      <div className="grid gap-3">
        {items.map((item, idx) => (
          <div key={item.id} className="border border-border p-3">
            {fields.map(([k, label, multi]) => {
              const value = String(item[k] ?? "");
              const set = (v: string) => onChange(items.map((it, i) => (i === idx ? { ...it, [k]: v } : it)));
              return (
                <label key={k} className="mb-2 block text-xs font-medium text-muted-foreground">
                  {label}
                  {multi ? (
                    <textarea className={input} rows={2} value={value} onChange={(e) => set(e.target.value)} />
                  ) : (
                    <input className={input} value={value} onChange={(e) => set(e.target.value)} />
                  )}
                </label>
              );
            })}
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm text-destructive"
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
            >
              <Trash2 className="size-4" /> Remove
            </button>
          </div>
        ))}
      </div>
      <button type="button" className={`${btnAccent} mt-4`} onClick={onSave}>
        Save {title.toLowerCase()}
      </button>
    </Card>
  );
}

function Requests({
  requests,
  onChange,
}: {
  requests: AppointmentRequest[];
  onChange: (v: AppointmentRequest[]) => void;
}) {
  const sorted = useMemo(() => [...requests].sort((a, b) => b.createdAt - a.createdAt), [requests]);
  return (
    <Card>
      <h2 className={`${heading} text-2xl`}>Appointment requests</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Requests sent from the website's appointment form on this browser. They also go to WhatsApp as before.
      </p>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No requests yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-foreground">
              <tr>
                <th className="py-2">Name</th>
                <th>Phone</th>
                <th>Preferred date</th>
                <th>Message</th>
                <th>Received</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.id} className={`border-b border-border ${r.read ? "" : "font-semibold"}`}>
                  <td className="py-2">{r.name}</td>
                  <td>
                    <a className="text-admin-accent" href={`https://wa.me/${r.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                      {r.phone}
                    </a>
                  </td>
                  <td>{r.date || "—"}</td>
                  <td className="max-w-xs truncate font-normal">{r.message || "—"}</td>
                  <td className="font-normal">{new Date(r.createdAt).toLocaleString("en-GB")}</td>
                  <td className="whitespace-nowrap text-right font-normal">
                    <button
                      type="button"
                      className="mr-3 text-admin-accent"
                      onClick={() => onChange(requests.map((x) => (x.id === r.id ? { ...x, read: !x.read } : x)))}
                    >
                      {r.read ? "Mark new" : "Mark read"}
                    </button>
                    <button type="button" className="text-destructive" onClick={() => onChange(requests.filter((x) => x.id !== r.id))}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function AccountForm() {
  const [current, setCurrent] = useState("");
  const [username, setUsername] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => setUsername(load<Account>(KEYS.account, DEFAULT_ACCOUNT).username), []);
  return (
    <Card className="max-w-md">
      <h2 className={`${heading} text-2xl`}>Account</h2>
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const acc = load<Account>(KEYS.account, DEFAULT_ACCOUNT);
          if (current !== acc.password) return setMsg("Current password is wrong.");
          if (next && next.length < 6) return setMsg("New password must be at least 6 characters.");
          save(KEYS.account, { username: username.trim() || acc.username, password: next || acc.password });
          setCurrent("");
          setNext("");
          setMsg("Account updated.");
        }}
      >
        <label className="text-xs font-medium text-muted-foreground">
          Username
          <input className={input} value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Current password
          <input type="password" className={input} value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          New password
          <input type="password" className={input} value={next} onChange={(e) => setNext(e.target.value)} />
        </label>
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        <button type="submit" className={btnAccent}>Update account</button>
      </form>
    </Card>
  );
}
