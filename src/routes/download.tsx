import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Download,
  HardDrive,
  Cpu,
  MemoryStick,
  Check,
  AlertCircle,
  Loader2,
  Server as ServerIcon,
  Monitor,
  Package,
  Layers,
  ExternalLink,
  Code2,
  Globe,
  Bug,
} from "lucide-react";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { cn } from "@/lib/utils";
import { useZyphorDownloads } from "@/lib/useZyphorDownloads";
import { useScrollReveal } from "@/lib/useScrollReveal";
import mirrorData from "@/data/mirror-downloads.json";

interface SourceForgeProject {
  id: string;
  slug: string;
  title: string;
  url: string;
}

interface MirrorFile {
  filename: string;
  url: string;
}

interface MirrorGroup {
  name: string;
  files: MirrorFile[];
}

type CountryStat = { country: string; downloads: number };

type WorldState = {
  status: "loading" | "ready" | "error";
  countries: CountryStat[];
  projectsCounted: number;
};

const MIRROR_GROUPS = (mirrorData.groups ?? []) as MirrorGroup[];

const ISSUES_URL = "https://github.com/zyphor-os/zyphor-os-desktop/issues";

const SOURCEFORGE_PROJECTS: SourceForgeProject[] = [
  {
    id: "project-1",
    slug: "zyphor-os-1-legacy",
    title: "Zyphor OS 1 Legacy (End Of Life) XFCE",
    url: "https://sourceforge.net/projects/zyphor-os-1-legacy",
  },
  {
    id: "project-2",
    slug: "zyphor-os-2-ada-lovelace",
    title: 'Zyphor OS 2 "Ada Lovelace" LTS Reforged XFCE',
    url: "https://sourceforge.net/projects/zyphor-os-2-ada-lovelace/",
  },
  {
    id: "project-3",
    slug: "zyphor-os-3-bethany-lts",
    title: 'Zyphor OS 3 "Bethany" LTS XFCE',
    url: "https://sourceforge.net/projects/zyphor-os-3-bethany-lts/",
  },
  {
    id: "project-4",
    slug: "zyphor-os-3-bethany-lts-gnome",
    title: 'Zyphor OS 3 "Bethany" LTS GNOME',
    url: "https://sourceforge.net/projects/zyphor-os-3-bethany-lts-gnome/",
  },
  {
    id: "project-5",
    slug: "zyphor-os-3-bethany-lts-kde",
    title: 'Zyphor OS 3 "Bethany" LTS KDE Plasma',
    url: "https://sourceforge.net/projects/zyphor-os-3-bethany-lts-kde/",
  },
];

const START_DATE = "2026-01-30";
const COUNTRY_START_DATE = "2026-10-01";

async function fetchTotal(slug: string): Promise<number> {
  const endDate = new Date().toISOString().split("T")[0];
  const apiUrl =
    `https://sourceforge.net/projects/${slug}/files/stats/json` +
    `?start_date=${START_DATE}&end_date=${endDate}&period=monthly&os_by_country=false`;

  const response = await fetch(apiUrl);
  if (!response.ok) throw new Error("SourceForge API request failed");
  const data = await response.json();

  if (!Array.isArray(data.downloads)) return 0;
  return data.downloads.reduce(
    (total: number, item: unknown[]) => total + (Number(item[1]) || 0),
    0,
  );
}

/** Returns total downloads per project slug: number, null (loading) or "error". */
function useSourceForgeDownloads() {
  const [counts, setCounts] = useState<Record<string, number | null | "error">>(() =>
    Object.fromEntries(SOURCEFORGE_PROJECTS.map((p) => [p.slug, null])),
  );

  useEffect(() => {
    let cancelled = false;
    SOURCEFORGE_PROJECTS.forEach(async (p) => {
      try {
        const total = await fetchTotal(p.slug);
        if (!cancelled) setCounts((c) => ({ ...c, [p.slug]: total }));
      } catch (error) {
        console.error(`Unable to load SourceForge statistics for ${p.slug}:`, error);
        if (!cancelled) setCounts((c) => ({ ...c, [p.slug]: "error" }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return counts;
}

async function fetchCountries(slug: string): Promise<[string, number][]> {
  const endDate = new Date().toISOString().split("T")[0];
  const apiUrl =
    `https://sourceforge.net/projects/${slug}/files/stats/json` +
    `?start_date=${COUNTRY_START_DATE}&end_date=${endDate}`;

  const response = await fetch(apiUrl);
  if (!response.ok) throw new Error("SourceForge API request failed");
  const data = await response.json();

  if (!Array.isArray(data.countries)) return [];
  return data.countries.map((item: unknown[]) => [
    String(item[0]),
    Number(item[1]) || 0,
  ]);
}

/** Merges country download stats across ALL SourceForge projects. */
function useSourceForgeCountries(): WorldState {
  const [state, setState] = useState<WorldState>({
    status: "loading",
    countries: [],
    projectsCounted: 0,
  });

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled(SOURCEFORGE_PROJECTS.map((p) => fetchCountries(p.slug))).then(
      (results) => {
        if (cancelled) return;

        const totals = new Map<string, number>();
        let succeeded = 0;

        results.forEach((r, i) => {
          if (r.status === "fulfilled") {
            succeeded++;
            r.value.forEach(([country, n]) =>
              totals.set(country, (totals.get(country) ?? 0) + n),
            );
          } else {
            console.error(
              `Unable to load country stats for ${SOURCEFORGE_PROJECTS[i].slug}:`,
              r.reason,
            );
          }
        });

        if (succeeded === 0) {
          setState({ status: "error", countries: [], projectsCounted: 0 });
          return;
        }

        const countries = [...totals.entries()]
          .map(([country, downloads]) => ({ country, downloads }))
          .filter((c) => c.downloads > 0)
          .sort((a, b) => b.downloads - a.downloads);

        setState({ status: "ready", countries, projectsCounted: succeeded });
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export const Route = createFileRoute("/download")({
  head: () => ({
    meta: [
      { title: "Download & Releases — Zyphor OS" },
      {
        name: "description",
        content:
          "Download the latest Zyphor OS ISO and browse the full release archive. Desktop and minimal editions, checksums, release notes, and hardware requirements.",
      },
    ],
  }),
  component: DownloadPage,
});

function DownloadPage() {
  const { state } = useZyphorDownloads();
  const downloadCounts = useSourceForgeDownloads();
  const worldStats = useSourceForgeCountries();
  useScrollReveal();

  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Download & Releases"
        title="Get Zyphor OS."
        description="Pick the Zyphor OS release that fits you. Every release is hosted on SourceForge, with live download counts."
      />

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 space-y-24">
        {state === "rate-limited" && (
          <StatusBanner
            icon={AlertCircle}
            variant="warn"
            message="GitHub API rate limit reached. Showing cached release data. If data is stale, visit GitHub directly."
          />
        )}
        {state === "error" && (
          <StatusBanner
            icon={AlertCircle}
            variant="warn"
            message="Could not reach GitHub. Showing last known release data. Refresh to try again."
          />
        )}

        <div className="reveal">
          <div className="flex items-center gap-3 mb-8">
            <Download className="h-6 w-6 text-brand" />
            <h2 className="text-3xl font-bold">Downloads</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {SOURCEFORGE_PROJECTS.map((project) => (
              <SourceForgeCard
                key={project.id}
                title={project.title}
                url={project.url}
                count={downloadCounts[project.slug]}
              />
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <a
              href={ISSUES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-brand btn-brand-hover inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold shadow-sm transition-all"
            >
              <Bug className="h-4 w-4" />
              Report Bugs & Issues Here
            </a>
          </div>
        </div>

        <WorldDownloads
          status={worldStats.status}
          countries={worldStats.countries}
          projectsCounted={worldStats.projectsCounted}
        />

        {MIRROR_GROUPS.length > 0 && (
          <div id="mirrors" className="reveal">
            <div className="flex items-center gap-3 mb-8">
              <Globe className="h-6 w-6 text-brand" />
              <h2 className="text-3xl font-bold">Mirror downloads</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {MIRROR_GROUPS.map((group) => (
                <div
                  key={group.name}
                  className="card-elevated rounded-2xl p-6 flex flex-col h-full"
                >
                  <h3 className="text-xl font-bold mb-4">{group.name}</h3>

                  <ul className="flex-1 space-y-3">
                    {group.files.map((file) => (
                      <li key={file.url}>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/50 px-4 py-3 hover:bg-surface transition"
                        >
                          <span className="font-mono text-sm break-all">{file.filename}</span>
                          <Download className="h-4 w-4 shrink-0 text-brand" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-2 reveal">
          <ReqCard
            title="Minimum hardware"
            items={[
              { icon: Cpu, k: "CPU", v: "64-bit dual-core, 1.5 GHz" },
              { icon: MemoryStick, k: "RAM", v: "2 GB" },
              { icon: HardDrive, k: "Storage", v: "20 GB" },
            ]}
          />
          <ReqCard
            title="Recommended hardware"
            items={[
              { icon: Cpu, k: "CPU", v: "64-bit quad-core, 2.4 GHz+" },
              { icon: MemoryStick, k: "RAM", v: "8 GB or more" },
              { icon: HardDrive, k: "Storage", v: "40 GB SSD" },
            ]}
          />
        </div>

        <div className="card-elevated rounded-2xl p-8 reveal">
          <h3 className="text-2xl font-semibold">Installation guide</h3>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Zyphor OS installs like any modern Linux distribution. Write the ISO to a USB drive, boot from it, and follow the installer.
          </p>
          <ol className="mt-6 space-y-3">
            {[
              "Download the ISO from the GitHub Releases page.",
              "Write the ISO to a USB drive using dd, Balena Etcher or Rufus.",
              "Boot from the USB and select Install Zyphor OS.",
              "Follow the guided installer and reboot into your new system.",
              "Run `zyphor system upgrade` and `zyphor doctor scan` after first login.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand text-xs ring-1 ring-brand/30">
                  {i + 1}
                </span>
                <span className="text-sm text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </SiteLayout>
  );
}

function SourceForgeCard({
  title,
  url,
  count,
}: {
  title: string;
  url: string;
  count: number | null | "error";
}) {
  return (
    <div className="card-elevated rounded-2xl p-6 flex flex-col h-full text-center hover:-translate-y-1 transition-all duration-300">
      <h3 className="text-xl font-bold mb-3">{title}</h3>

      <div className="my-4 flex-1">
        <div className="text-3xl font-bold text-foreground">
          {count === null ? "..." : count === "error" ? "—" : count.toLocaleString()}
        </div>
        <small className="text-muted-foreground">Downloads</small>
      </div>

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-brand btn-brand-hover inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold shadow-sm transition-all"
      >
        <Download className="h-4 w-4" />
        Download From SourceForge
      </a>
    </div>
  );
}

function WorldDownloads({
  status,
  countries,
  projectsCounted,
}: {
  status: "loading" | "ready" | "error";
  countries: CountryStat[];
  projectsCounted: number;
}) {
  const [showAll, setShowAll] = useState(false);

  const total = countries.reduce((sum, c) => sum + c.downloads, 0);
  const max = countries[0]?.downloads ?? 1;
  const visible = showAll ? countries : countries.slice(0, 10);

  return (
    <div id="worldwide" className="reveal">
      <div className="flex items-center gap-3 mb-8">
        <Globe className="h-6 w-6 text-brand" />
        <h2 className="text-3xl font-bold">Downloads from any part of the world</h2>
      </div>

      {status === "loading" && (
        <div className="card-elevated rounded-2xl p-8 flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading worldwide statistics…</span>
        </div>
      )}

      {status === "error" && (
        <StatusBanner
          icon={AlertCircle}
          variant="warn"
          message="Could not load worldwide download statistics from SourceForge. Refresh to try again."
        />
      )}

      {status === "ready" && (
        <div className="card-elevated rounded-2xl p-6 sm:p-8">
          <div className="grid gap-6 sm:grid-cols-3 mb-8 text-center">
            <div>
              <div className="text-3xl font-bold">{countries.length.toLocaleString()}</div>
              <small className="text-muted-foreground">Countries & regions</small>
            </div>
            <div>
              <div className="text-3xl font-bold">{total.toLocaleString()}</div>
              <small className="text-muted-foreground">
                Total downloads (since Oct. 1, 2026)
              </small>
            </div>
            <div>
              <div className="text-3xl font-bold">
                {projectsCounted}/{SOURCEFORGE_PROJECTS.length}
              </div>
              <small className="text-muted-foreground">Projects counted</small>
            </div>
          </div>

          <ul className="space-y-3">
            {visible.map((c, i) => (
              <li key={c.country} className="flex items-center gap-3">
                <span className="w-6 text-right text-xs text-muted-foreground">{i + 1}</span>
                <span className="w-40 sm:w-52 truncate text-sm font-medium">{c.country}</span>
                <div className="flex-1 h-2 rounded-full bg-brand/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand transition-all duration-700"
                    style={{ width: `${(c.downloads / max) * 100}%` }}
                  />
                </div>
                <span className="w-16 text-right text-sm tabular-nums text-muted-foreground">
                  {c.downloads.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>

          {countries.length > 10 && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="btn-brand btn-brand-hover inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition-all"
              >
                {showAll ? "Show top 10" : `Show all ${countries.length} countries`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBanner({
  icon: Icon,
  variant,
  message,
}: {
  icon: React.ElementType;
  variant: "warn" | "info";
  message: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
        variant === "warn"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
          : "border-brand/30 bg-brand/10 text-brand",
      )}
    >
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

function ReqCard({
  title,
  items,
}: {
  title: string;
  items: { icon: React.ElementType; k: string; v: string }[];
}) {
  return (
    <div className="card-elevated rounded-2xl p-6">
      <div className="flex items-center gap-2">
        <Check className="h-4 w-4 text-brand" />
        <h4 className="font-semibold">{title}</h4>
      </div>
      <ul className="mt-5 space-y-3">
        {items.map(({ icon: Icon, k, v }) => (
          <li key={k} className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand ring-1 ring-brand/20">
              <Icon className="h-4 w-4" />
            </span>
            <div className="flex-1 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{k}</span>
              <span className="text-sm font-medium">{v}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}