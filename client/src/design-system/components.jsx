import { forwardRef, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDownToLine, ArrowRight, Bell, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, GraduationCap, Inbox, LogOut, Menu, PanelLeftClose, Search, X } from 'lucide-react';
import './tokens.css';
import './components.css';

const cx = (...parts) => parts.filter(Boolean).join(' ');
export const Icon = ({ as: Component, ...props }) => <Component size={18} strokeWidth={1.7} aria-hidden="true" {...props} />;

export const Button = forwardRef(function Button({ variant = 'primary', icon, trailingIcon, children, className, href, linkComponent: LinkComponent = 'a', busy = false, disabled, ...props }, ref) {
  const shared = { ...props, ref, className: cx('va-button', `va-button--${variant}`, className), 'aria-busy': busy || undefined };
  const content = <>{icon && <Icon as={icon} />}<span>{children}</span>{trailingIcon && <Icon as={trailingIcon} />}</>;
  if (href && !disabled && !busy) return <LinkComponent {...shared} {...(LinkComponent === 'a' ? { href } : { to: href })}>{content}</LinkComponent>;
  return <button type="button" {...shared} disabled={disabled || busy}>{content}</button>;
});

export const IconButton = forwardRef(function IconButton({ icon, label, className, ...props }, ref) {
  return <button type="button" {...props} ref={ref} className={cx('va-icon-button', className)} aria-label={label}><Icon as={icon} /></button>;
});

export function PageHeader({ eyebrow, title, subtitle, actions, headingLevel = 1 }) {
  const Heading = headingLevel === 2 ? 'h2' : 'h1';
  return <header className="va-page-header"><div>{eyebrow && <p className="va-eyebrow">{eyebrow}</p>}<Heading>{title}</Heading>{subtitle && <p className="va-secondary">{subtitle}</p>}</div>{actions && <div className="va-actions">{actions}</div>}</header>;
}

export function Card({ title, eyebrow, subtitle, action, children, className, ...props }) {
  return <section {...props} className={cx('va-card', className)}>{(title || action) && <header className="va-card__header"><div>{eyebrow && <p className="va-eyebrow">{eyebrow}</p>}{title && <h2>{title}</h2>}{subtitle && <p className="va-secondary va-small">{subtitle}</p>}</div>{action}</header>}{children}</section>;
}

export function StatCard({ label, value, icon, tone = 'teal', detail, href, loading = false, linkComponent: LinkComponent = 'a' }) {
  const content = <><span className={cx('va-icon-chip', `va-tone-${tone}`)}><Icon as={icon} /></span><div className="va-stat__value">{loading ? '—' : value}</div><p className="va-stat__label">{label}</p>{detail && <p className="va-stat__detail">{detail}</p>}{href && <ArrowRight className="va-stat__arrow" size={16} aria-hidden="true" />}</>;
  const className = cx('va-card va-stat', `va-stat--${tone}`);
  return href ? <LinkComponent className={className} {...(LinkComponent === 'a' ? { href } : { to: href })} aria-label={`Open ${label}`}>{content}</LinkComponent> : <div className={className}>{content}</div>;
}

export function Badge({ children, tone = 'gold', dot = false, className }) {
  return <span className={cx('va-badge', `va-tone-${tone}`, className)}>{dot && <span className="va-badge__dot" aria-hidden="true" />}{children}</span>;
}
export const StatusPill = Badge;

export function BrandMark() {
  return <span className="va-brand__mark" role="img" aria-label="No.1 Vettri Academy"><img src="/icons/icon-192.png" alt="" /></span>;
}

export function Avatar({ name = 'Academy member', src, size = 'md', tone = 'teal', className }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return <span className={cx('va-avatar', `va-avatar--${size}`, `va-tone-${tone}`, className)}>{src ? <img src={src} alt={name} /> : <span role="img" aria-label={name}>{initials}</span>}</span>;
}

function Field({ label, hint, error, id, children, className }) {
  return <div className={cx('va-field', className)}>{label && <label htmlFor={id}>{label}</label>}{children}{(error || hint) && <p id={`${id}-message`} className={error ? 'va-field__error' : 'va-field__hint'} role={error ? 'alert' : undefined}>{error || hint}</p>}</div>;
}

function fieldComponent(tag) {
  return forwardRef(function FieldControl({ id: providedId, label, hint, error, className, ...props }, ref) {
    const generated = useId();
    const id = providedId || generated;
    const Component = tag;
    return <Field {...{ id, label, hint, error, className }}><div className={cx('va-control-wrap', tag === 'select' && 'va-control-wrap--select')}><Component {...props} id={id} ref={ref} className="va-input" aria-invalid={Boolean(error)} aria-describedby={error || hint ? `${id}-message` : undefined} />{tag === 'select' && <ChevronDown size={16} aria-hidden="true" />}</div></Field>;
  });
}
export const Input = fieldComponent('input');
export const Select = fieldComponent('select');
export const Textarea = fieldComponent('textarea');

export function Tabs({ items, value, onChange, label = 'Sections' }) {
  const refs = useRef({});
  const choose = (index) => { const item = items[(index + items.length) % items.length]; onChange(item.value); refs.current[item.value]?.focus(); };
  return <div className="va-tabs" role="tablist" aria-label={label}>{items.map((item, index) => <button key={item.value} ref={(element) => { refs.current[item.value] = element; }} type="button" role="tab" aria-selected={value === item.value} tabIndex={value === item.value ? 0 : -1} onClick={() => onChange(item.value)} onKeyDown={(event) => {
    if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) { event.preventDefault(); choose(event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : index + (event.key === 'ArrowRight' ? 1 : -1)); }
  }}>{item.icon && <Icon as={item.icon} />}{item.label}{item.count != null && <span className="va-tab-count">{item.count}</span>}</button>)}</div>;
}

export function Tooltip({ content, children }) {
  const id = useId();
  return <span className="va-tooltip" tabIndex={0} aria-describedby={id}>{children}<span role="tooltip" id={id}>{content}</span></span>;
}

export function ProgressBar({ value = 0, label, detail, tone = 'teal' }) {
  const percent = Math.max(0, Math.min(100, Number(value) || 0));
  return <div className="va-progress">{(label || detail) && <div className="va-progress__labels"><span>{label}</span><strong>{detail || `${percent}%`}</strong></div>}<progress className={`va-progress__track va-progress__track--${tone}`} max="100" value={percent} aria-label={label || 'Progress'} /></div>;
}

export function ProgressRing({ value = 0, label }) {
  const percent = Math.max(0, Math.min(100, Number(value) || 0));
  return <div className="va-progress-ring" role="img" aria-label={`${label}: ${percent}%`}><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="42" className="va-progress-ring__base" /><circle cx="50" cy="50" r="42" pathLength="100" strokeDasharray={`${percent} 100`} className="va-progress-ring__fill" /></svg><span><strong>{percent}%</strong><small>{label}</small></span></div>;
}

export function EmptyState({ icon = Inbox, title = 'A little room for what comes next.', description, action }) {
  return <div className="va-empty"><span className="va-icon-chip va-tone-teal"><Icon as={icon} /></span><h3>{title}</h3>{description && <p className="va-secondary">{description}</p>}{action}</div>;
}

export function Skeleton({ lines = 3, label = 'Loading content' }) {
  return <div className="va-skeleton" role="status" aria-label={label}><span className="va-sr-only">{label}</span>{Array.from({ length: lines }, (_, index) => <div key={index} className={index === lines - 1 ? 'va-skeleton__line va-skeleton__line--short' : 'va-skeleton__line'} />)}</div>;
}

export function Toast({ title, description, tone = 'teal', onClose }) {
  return <div className={cx('va-toast', `va-toast--${tone}`)} role={tone === 'pink' ? 'alert' : 'status'}><span className={cx('va-icon-chip', `va-tone-${tone}`)}><Icon as={tone === 'pink' ? CircleHelp : Check} /></span><div><strong>{title}</strong>{description && <p className="va-secondary va-small">{description}</p>}</div>{onClose && <IconButton icon={X} label="Dismiss notification" onClick={onClose} />}</div>;
}

export function NotificationPanel({ items = [], onReadAll, onSelect, onClose, compact = false }) {
  return <div className="va-notifications"><header><div>{!compact && <p className="va-eyebrow">Your academy, in the loop</p>}<h2>Notifications</h2></div>{compact && onReadAll && <Button variant="ghost" onClick={onReadAll}>Mark all read</Button>}{onClose && <IconButton icon={X} label="Close notifications" onClick={onClose} />}</header>{onReadAll && !compact && <Button variant="ghost" icon={CheckCheck} onClick={onReadAll}>Mark all read</Button>}{items.length ? <div className="va-notifications__list">{items.map((item) => <button key={item.id} type="button" className="va-notification" onClick={() => onSelect?.(item)}><span className={cx('va-icon-chip', `va-tone-${item.tone || 'teal'}`)}><Icon as={item.icon || Bell} /></span><span><strong>{item.title}</strong><span className="va-secondary va-small">{item.description}</span><time>{item.time}</time></span>{!item.read && <span className="va-unread-dot" aria-label="Unread" />}</button>)}</div> : <EmptyState title="You're all caught up." description="New academy updates will appear here." />}</div>;
}

export function Modal({ open, title, description, children, onClose, actions, drawer = false }) {
  const titleId = useId();
  const descriptionId = useId();
  const panel = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    const handleKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current?.(); }
      if (event.key === 'Tab') {
        const focusable = [...(panel.current?.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]') || [])].filter((element) => element.getClientRects().length);
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (!first) { event.preventDefault(); panel.current?.focus(); }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', handleKey); previous?.focus?.(); };
  }, [open]);
  if (!open) return null;
  return createPortal(<div className={cx('va-theme', 'va-modal-backdrop', drawer && 'va-modal-backdrop--drawer')} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}><section ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} className={cx('va-modal', drawer && 'va-modal--drawer')}><header><div><h2 id={titleId}>{title}</h2>{description && <p id={descriptionId} className="va-secondary">{description}</p>}</div><IconButton icon={X} label="Close dialog" onClick={onClose} /></header><div className="va-modal__body">{children}</div>{actions && <footer className="va-actions">{actions}</footer>}</section></div>, document.body);
}
export const Drawer = (props) => <Modal {...props} drawer />;

export function DataTable({ title, columns, rows, getRowKey = (row) => row.id, searchPlaceholder = 'Search records', searchKeys = [], filters, pageSize = 5, loading = false, emptyTitle = 'No matching records', caption }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => !query || searchKeys.some((key) => String(row[key] ?? '').toLowerCase().includes(query)));
  }, [rows, search, searchKeys]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * pageSize, current * pageSize);
  return <section className="va-card va-data-table"><div className="va-table-toolbar"><div><p className="va-eyebrow">At a glance</p><h2>{title}</h2></div><div className="va-table-toolbar__filters"><label className="va-search"><Search size={17} aria-hidden="true" /><span className="va-sr-only">{searchPlaceholder}</span><input value={search} placeholder={searchPlaceholder} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>{filters}</div></div><div className="va-table-scroll"><table><caption className="va-sr-only">{caption || title}</caption><thead><tr>{columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={columns.length}><Skeleton lines={pageSize} /></td></tr> : visible.length ? visible.map((row) => <tr key={getRowKey(row)}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key] ?? 'NA'}</td>)}</tr>) : <tr><td colSpan={columns.length}><EmptyState title={emptyTitle} description="Try another search or adjust your filters." /></td></tr>}</tbody></table></div><footer className="va-table-footer"><p className="va-secondary va-small">{filtered.length ? `${(current - 1) * pageSize + 1}–${Math.min(current * pageSize, filtered.length)} of ${filtered.length} records` : '0 records'}</p><div className="va-actions"><IconButton icon={ChevronLeft} label="Previous page" disabled={current === 1} onClick={() => setPage(current - 1)} /><span className="va-small">Page {current} of {pages}</span><IconButton icon={ChevronRight} label="Next page" disabled={current === pages} onClick={() => setPage(current + 1)} /></div></footer></section>;
}

export function ChartCard({ children, legend = [], ...props }) {
  return <Card {...props}><div className="va-chart">{children}</div>{legend.length > 0 && <ul className="va-chart-legend">{legend.map((item) => <li key={item.label}><span className={`va-legend-dot va-tone-${item.tone || 'teal'}`} />{item.label}</li>)}</ul>}</Card>;
}

export function TrendChart({ series = [], labels = [], label = 'Progress over time' }) {
  const maximum = Math.max(1, ...series.flatMap((item) => item.values));
  return <div className="va-trend-chart"><svg viewBox="0 0 440 140" role="img" aria-label={label}>{[30, 70, 110].map((y) => <line key={y} x1="8" x2="432" y1={y} y2={y} className="va-chart-grid" />)}{series.map((item) => <polyline key={item.label} className={`va-chart-line va-chart-line--${item.tone || 'teal'}`} points={item.values.map((value, index) => `${8 + index * (424 / Math.max(1, item.values.length - 1))},${128 - value / maximum * 110}`).join(' ')} />)}</svg><div className="va-chart-labels">{labels.map((item) => <span key={item}>{item}</span>)}</div></div>;
}

export function HeroCard({ eyebrow, title, description, actions, children, className, actionsAside = false, headingLevel = 2 }) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  return <section className={cx('va-hero', className)}><span className="va-hero__ring" aria-hidden="true" /><span className="va-hero__halo" aria-hidden="true" /><div className="va-hero__content"><p className="va-eyebrow">{eyebrow}</p><Heading>{title}</Heading><p>{description}</p>{actions && !actionsAside && <div className="va-actions">{actions}</div>}</div>{actions && actionsAside && <div className="va-hero__actions-aside">{actions}</div>}{children && <div className="va-hero__aside">{children}</div>}</section>;
}

export function AlertBanner({ title, description, action, icon = CircleHelp }) {
  return <div className="va-alert" role="status"><span className="va-icon-chip"><Icon as={icon} /></span><div><strong>{title}</strong>{description && <p>{description}</p>}</div>{action}</div>;
}

export function InstallCard({ onInstall, onDismiss }) {
  return <aside className="va-install-card" aria-label="Install academy app"><span className="va-icon-chip va-tone-gold"><Icon as={ArrowDownToLine} /></span><div><strong>Your academy. One click away.</strong><p className="va-secondary va-small">Add Vettri to your home screen.</p></div><Button variant="gold" onClick={onInstall}>Install</Button>{onDismiss && <IconButton icon={X} label="Dismiss install prompt" onClick={onDismiss} />}</aside>;
}

export function Sidebar({ groups, role, user, activeHref, collapsed, onCollapse, onNavigate, onLogout, linkComponent: LinkComponent = 'a' }) {
  return <div className={cx('va-sidebar-content', collapsed && 'va-sidebar-content--collapsed')}><div className="va-brand"><BrandMark />{!collapsed && <span><strong>No.1 Vettri</strong><small>Academy</small></span>}<IconButton icon={collapsed ? Menu : PanelLeftClose} label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={onCollapse} /></div><div className="va-sidebar-user"><Avatar name={user.name} src={user.profilePic} tone="gold" />{!collapsed && <div><strong>{user.name}</strong><Badge tone={role === 'admin' ? 'pink' : role === 'teacher' ? 'gold' : 'teal'}>{role[0].toUpperCase() + role.slice(1)}</Badge></div>}</div><nav className="va-sidebar-nav" aria-label={`${role} navigation`}>{groups.map((group) => <div className="va-nav-group" key={group.label}>{!collapsed && <p>{group.label}</p>}{group.items.map((item) => <LinkComponent key={item.href} {...(LinkComponent === 'a' ? { href: item.href } : { to: item.href })} title={collapsed ? item.label : undefined} className={cx('va-nav-item', activeHref === item.href && 'is-active')} aria-current={activeHref === item.href ? 'page' : undefined} aria-label={collapsed ? item.label : undefined} onClick={(event) => onNavigate?.(item, event)}><Icon as={item.icon} />{!collapsed && <span>{item.label}</span>}{!collapsed && item.badge > 0 && <span className="va-nav-count">{item.badge}</span>}</LinkComponent>)}</div>)}</nav><div className="va-sidebar-footer"><button type="button" className="va-nav-item va-nav-item--logout" onClick={onLogout} aria-label="Logout"><Icon as={LogOut} />{!collapsed && <span>Logout</span>}</button>{!collapsed && <p>Learning, thoughtfully connected.</p>}</div></div>;
}

export function Topbar({ title, breadcrumb = [], user, role, onMenu, onNotifications, unread = 0, search, onSearchChange, actions, subtitle }) {
  return <header className="va-topbar"><IconButton className="va-topbar__menu" icon={Menu} label="Open navigation" onClick={onMenu} /><div className="va-topbar__title"><span>{title}</span>{subtitle && <p className="va-topbar__identity">{subtitle}</p>}<nav aria-label="Breadcrumb"><ol>{breadcrumb.map((part, index) => <li key={index}>{index > 0 && <ChevronRight size={12} aria-hidden="true" />}{part.href ? <a href={part.href}>{part.label}</a> : <span>{part.label}</span>}</li>)}</ol></nav></div><div className="va-topbar__actions">{role === 'admin' && <label className="va-search va-topbar__search"><Search size={17} aria-hidden="true" /><span className="va-sr-only">Search academy</span><input placeholder="Search your academy…" value={search} onChange={onSearchChange} /></label>}{actions || <span className="va-bell"><IconButton icon={Bell} label={unread ? `Notifications, ${unread} unread` : 'Notifications'} onClick={onNotifications} />{unread > 0 && <span>{unread > 99 ? '99+' : unread}</span>}</span>}<Avatar name={user.name} src={user.profilePic} className="va-avatar--ring" /></div></header>;
}

export function AppShell({ sidebar, topbar, children, collapsed = false, mobileOpen = false, onCloseMenu, wide = false }) {
  return <div className={cx('va-theme', 'va-shell', collapsed && 'va-shell--collapsed')}><a href="#va-main" className="va-skip-link">Skip to content</a><aside className="va-shell__sidebar">{sidebar}</aside><div className="va-shell__workspace">{topbar}<main id="va-main" className={cx('va-shell__main', wide && 'va-shell__main--wide')} tabIndex={-1}>{children}</main></div><Drawer open={mobileOpen} title="Your academy" onClose={onCloseMenu}><div className="va-mobile-sidebar">{sidebar}</div></Drawer></div>;
}

export function AuthLayout({ title, subtitle, children, footer }) {
  return <div className="va-theme va-auth-layout"><section className="va-auth-layout__brand"><span className="va-auth-layout__ring" aria-hidden="true" /><BrandMark /><p className="va-eyebrow">No.1 Vettri Academy</p><h2>Good things<br />begin with learning.</h2><p>A thoughtful education.<br />A brighter possibility.</p><small>Every learner belongs.</small></section><section className="va-auth-layout__form"><header><p className="va-eyebrow">Your academy awaits</p><h2>{title}</h2>{subtitle && <p className="va-secondary">{subtitle}</p>}</header>{children}{footer}</section></div>;
}
