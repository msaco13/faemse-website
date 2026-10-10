import { useMemo, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import Markdown from '../components/Markdown';
import PageHead from '../components/PageHead';
import { leaves, parseHub, useHubDoc, useHubList, type Hub, type HubDoc } from '../lib/hubs';
import { useMemberStatus } from '../lib/useMemberStatus';

// The board's program hubs (Program Directors and its companions), admin-only
// while they are drafts. Three click levels, as the draft's build note asks:
//   /admin/hubs/:hub                     the pillars
//   /admin/hubs/:hub/:section            one pillar's subsections
//   /admin/hubs/:hub/:section/:sub       one subsection's content
// Every subsection has its own link, and previous/next walk the whole hub in
// order. Non-admins never fetch anything: the page checks the profile first,
// and the table's RLS refuses them anyway.

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHead
        id="adminhubs"
        eyebrow="Board admins only"
        title="Program hubs"
        sub="Drafts of the Program Directors hub and its companion hubs. Visible to board admins only until the board publishes them."
      />
      <section className="py-14 md:py-16 bg-paper min-h-[40vh]">
        <div className="wrap max-w-[900px]">{children}</div>
      </section>
    </>
  );
}

function Notice({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'error' }) {
  return (
    <div className={`card p-7 text-[15px] ${tone === 'error' ? 'text-brand-red font-semibold' : 'text-muted'}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

function Crumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-[13.5px]">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden>/</span>}
            {c.to ? (
              <Link to={c.to} className="text-brand-blue font-semibold hover:underline">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-semibold text-body">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function DraftBadge({ updated }: { updated: string }) {
  return (
    <p className="text-[12.5px] text-muted mb-2">
      <span className="font-bold tracking-[0.08em] uppercase text-brand-goldink bg-[#FBF3D9] px-2 py-0.5 rounded-full mr-2">Draft · admins only</span>
      Updated {fmt(updated)}
    </p>
  );
}

function RowLink({ to, n, title, meta }: { to: string; n?: number; title: string; meta?: string }) {
  return (
    <li>
      <Link to={to} className="card flex items-center gap-4 p-5 hover:border-brand-blue hover:-translate-y-0.5 transition-all">
        {n !== undefined && <span className="font-disp font-bold text-2xl text-brand-blue w-8 text-center flex-none">{n}</span>}
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-[16.5px]">{title}</span>
          {meta && <span className="block text-muted text-[13.5px] mt-0.5">{meta}</span>}
        </span>
        <span aria-hidden className="text-brand-blue font-bold">→</span>
      </Link>
    </li>
  );
}

function HubIndex() {
  const list = useHubList(true);
  if (list.status === 'loading') return <Notice>Loading the hubs…</Notice>;
  if (list.status === 'error') return <Notice tone="error">{list.message}</Notice>;
  if (list.status === 'missing' || list.data.length === 0)
    return <Notice>No hub documents are loaded yet. They go into the admin_documents table from the Supabase SQL Editor.</Notice>;
  return (
    <ul className="space-y-3">
      {list.data.map((h) => (
        <RowLink key={h.slug} to={`/admin/hubs/${h.slug}`} title={h.title} meta={`${h.summary ? `${h.summary} · ` : ''}Updated ${fmt(h.updated_at)}`} />
      ))}
    </ul>
  );
}

function HubHome({ doc, hub }: { doc: HubDoc; hub: Hub }) {
  const first = leaves(doc.slug, hub)[0];
  return (
    <>
      <Crumbs items={[{ label: 'All hubs', to: '/admin/hubs' }, { label: doc.title }]} />
      <DraftBadge updated={doc.updated_at} />
      <h2 className="font-disp font-bold uppercase text-[clamp(30px,4vw,44px)] leading-none mb-5">{doc.title}</h2>
      {hub.intro && (
        <div className="card p-6 md:p-7 mb-6">
          <Markdown source={hub.intro} />
        </div>
      )}
      {first && (
        <p className="mb-6">
          <Link to={first.path} className="btn-red">
            Start reading from the top
          </Link>
        </p>
      )}
      <ol className="space-y-3">
        {hub.sections.map((s, i) => (
          <RowLink
            key={s.slug}
            to={`/admin/hubs/${doc.slug}/${s.slug}`}
            n={i + 1}
            title={s.title}
            meta={s.subs.length ? `${s.subs.length} ${s.subs.length === 1 ? 'subsection' : 'subsections'}` : undefined}
          />
        ))}
      </ol>
    </>
  );
}

function PrevNext({ doc, hub, path }: { doc: HubDoc; hub: Hub; path: string }) {
  const all = leaves(doc.slug, hub);
  const at = all.findIndex((l) => l.path === path);
  const prev = at > 0 ? all[at - 1] : null;
  const next = at >= 0 && at < all.length - 1 ? all[at + 1] : null;
  const label = (l: (typeof all)[number]) => l.sub?.title ?? l.section.title;
  return (
    <nav aria-label="Previous and next" className="grid sm:grid-cols-2 gap-3 mt-8">
      {prev ? (
        <Link to={prev.path} className="card p-4 hover:border-brand-blue">
          <span className="block text-[12px] font-bold uppercase tracking-[0.1em] text-muted">Previous</span>
          <span className="block font-semibold text-brand-blue">{label(prev)}</span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link to={next.path} className="card p-4 hover:border-brand-blue sm:text-right">
          <span className="block text-[12px] font-bold uppercase tracking-[0.1em] text-muted">Next</span>
          <span className="block font-semibold text-brand-blue">{label(next)}</span>
        </Link>
      )}
    </nav>
  );
}

function SectionPage({ doc, hub, sectionSlug }: { doc: HubDoc; hub: Hub; sectionSlug: string }) {
  const section = hub.sections.find((s) => s.slug === sectionSlug);
  if (!section) return <NotInHub doc={doc} />;
  const path = `/admin/hubs/${doc.slug}/${section.slug}`;
  return (
    <>
      <Crumbs items={[{ label: 'All hubs', to: '/admin/hubs' }, { label: doc.title, to: `/admin/hubs/${doc.slug}` }, { label: section.title }]} />
      <DraftBadge updated={doc.updated_at} />
      <h2 className="font-disp font-bold uppercase text-[clamp(28px,3.6vw,40px)] leading-none mb-5">{section.title}</h2>
      {section.intro && (
        <div className="card p-6 md:p-7 mb-6">
          <Markdown source={section.intro} />
        </div>
      )}
      {section.subs.length > 0 ? (
        <ol className="space-y-3">
          {section.subs.map((s, i) => (
            <RowLink key={s.slug} to={`${path}/${s.slug}`} n={i + 1} title={s.title} />
          ))}
        </ol>
      ) : (
        <PrevNext doc={doc} hub={hub} path={path} />
      )}
    </>
  );
}

function SubPage({ doc, hub, sectionSlug, subSlug }: { doc: HubDoc; hub: Hub; sectionSlug: string; subSlug: string }) {
  const section = hub.sections.find((s) => s.slug === sectionSlug);
  const sub = section?.subs.find((s) => s.slug === subSlug);
  if (!section || !sub) return <NotInHub doc={doc} />;
  const path = `/admin/hubs/${doc.slug}/${section.slug}/${sub.slug}`;
  return (
    <>
      <Crumbs
        items={[
          { label: 'All hubs', to: '/admin/hubs' },
          { label: doc.title, to: `/admin/hubs/${doc.slug}` },
          { label: section.title, to: `/admin/hubs/${doc.slug}/${section.slug}` },
          { label: sub.title },
        ]}
      />
      <DraftBadge updated={doc.updated_at} />
      <h2 className="font-disp font-bold uppercase text-[clamp(26px,3.2vw,36px)] leading-none mb-5">{sub.title}</h2>
      <article className="card p-6 md:p-8">
        <Markdown source={sub.body} />
      </article>
      <PrevNext doc={doc} hub={hub} path={path} />
    </>
  );
}

function NotInHub({ doc }: { doc: HubDoc }) {
  return (
    <Notice>
      That section isn&rsquo;t in this hub (it may have been renamed).{' '}
      <Link to={`/admin/hubs/${doc.slug}`} className="text-brand-blue font-semibold">
        Back to {doc.title}
      </Link>
    </Notice>
  );
}

function HubView({ hubSlug, sectionSlug, subSlug }: { hubSlug: string; sectionSlug?: string; subSlug?: string }) {
  const state = useHubDoc(hubSlug, true);
  const doc = state.status === 'ready' ? state.data : null;
  const hub = useMemo(() => (doc ? parseHub(doc.body) : null), [doc]);
  if (state.status === 'loading') return <Notice>Loading…</Notice>;
  if (state.status === 'error') return <Notice tone="error">{state.message}</Notice>;
  if (state.status === 'missing' || !doc || !hub)
    return (
      <Notice>
        No hub at this address.{' '}
        <Link to="/admin/hubs" className="text-brand-blue font-semibold">
          See all hubs
        </Link>
      </Notice>
    );
  if (sectionSlug && subSlug) return <SubPage doc={doc} hub={hub} sectionSlug={sectionSlug} subSlug={subSlug} />;
  if (sectionSlug) return <SectionPage doc={doc} hub={hub} sectionSlug={sectionSlug} />;
  return <HubHome doc={doc} hub={hub} />;
}

export default function Hubs() {
  const { hub, section, sub } = useParams();
  const status = useMemberStatus();
  let body: ReactNode;
  if (!status.checked) body = <Notice>Checking your access…</Notice>;
  else if (!status.signedIn)
    body = (
      <Notice>
        This area is for board admins.{' '}
        <Link to="/login" className="text-brand-blue font-semibold">
          Sign in
        </Link>{' '}
        with an admin account to see it.
      </Notice>
    );
  else if (!status.admin) body = <Notice>This area is for board admins only.</Notice>;
  else if (hub) body = <HubView key={hub} hubSlug={hub} sectionSlug={section} subSlug={sub} />;
  else body = <HubIndex />;
  return <Shell>{body}</Shell>;
}
