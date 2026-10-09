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
} from "lucide-react";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { cn } from "@/lib/utils";
import { useZyphorDownloads } from "@/lib/useZyphorDownloads";
import { useScrollReveal } from "@/lib/useScrollReveal";

interface SourceForgeProject {
  id: string;
  slug: string;
  title: string;
  url: string;
}

const SOURCEFORGE_PROJECTS: SourceForgeProject[] = [
  {
    id: "project-1",
    slug: "zyphor-os-1-legacy",
    title: "Zyphor OS 1 Legacy (End Of Life)",
    url: "https://sourceforge.net/projects/zyphor-os-1-legacy",
  },
  {
    id: "project-2",
    slug: "zyphor-os-2-ada-lovelace",
    title: 'Zyphor OS 2 "Ada Lovelace" LTS Reforged',
    url: "https://sourceforge.net/projects/zyphor-os-2-ada-lovelace/",
  },
  {
    id: "project-3",
    slug: "zyphor-os-3-bethany-lts",
    title: 'Zyphor OS 3 "Bethany" LTS',
    url: "https://sourceforge.net/projects/zyphor-os-3-bethany-lts/",
  },
];

const START_DATE = "2026-03-30";

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
  const { adaTags, legacyTags, state } = useZyphorDownloads();
  const downloadCounts = useSourceForgeDownloads();
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
        </div>

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

        <div id="archives" className="reveal">
          <div className="flex items-center gap-3 mb-8">
            <Package className="h-6 w-6 text-brand" />
            <h2 className="text-3xl font-bold">Release Archives</h2>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <div className="card-elevated rounded-2xl p-6 flex flex-col">
              <h3 className="text-xl font-semibold mb-2">New Source (Ada Lovelace LTS)</h3>
              <p className="text-sm text-muted-foreground mb-6">
                The modern Zyphor OS codebase. Long-term support releases carrying the Ada Lovelace codename.
              </p>

              <div className="flex-1 bg-background/50 rounded-xl border border-border/60 overflow-hidden flex flex-col">
                {state === "loading" ? (
                  <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div>
                ) : adaTags.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">No releases found.</div>
                ) : (
                  <ul className="divide-y divide-border/60 max-h-[400px] overflow-y-auto">
                    {adaTags.map(tag => (
                      <li key={tag}>
                        <a
                          href={`https://github.com/zyphor-os/zyphor-os-desktop/releases/tag/${tag}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between p-4 hover:bg-surface transition group"
                        >
                          <span className="font-mono text-sm font-medium">{tag}</span>
                          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="card-elevated rounded-2xl p-6 flex flex-col">
              <h3 className="text-xl font-semibold mb-2">Legacy Codebase</h3>
              <p className="text-sm text-muted-foreground mb-6">
                The original stable releases from the legacy repository. Maintained for archival purposes.
              </p>

              <div className="flex-1 bg-background/50 rounded-xl border border-border/60 overflow-hidden flex flex-col">
                {state === "loading" ? (
                  <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div>
                ) : legacyTags.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">No releases found.</div>
                ) : (
                  <ul className="divide-y divide-border/60 max-h-[400px] overflow-y-auto">
                    {legacyTags.map(tag => (
                      <li key={tag}>
                        <a
                          href={`https://github.com/markjasonespelita/zyphor_os/releases/tag/${tag}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between p-4 hover:bg-surface transition group"
                        >
                          <span className="font-mono text-sm font-medium">{tag}</span>
                          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
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