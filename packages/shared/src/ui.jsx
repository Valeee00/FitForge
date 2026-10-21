import React, { useEffect, useRef } from 'react';
import { X, Dumbbell, AlertTriangle, ArrowUpRight, Plus } from 'lucide-react';
export { Dumbbell, Plus, ArrowUpRight };
export function Button({ children, variant = 'primary', className = '', ...props }) { return <button className={`btn btn-${variant} ${className}`} {...props}>{children}</button>; }
export function PageHeader({ eyebrow, title, description, action }) { return <header className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted">{description}</p></div>{action}</header>; }
export function Notice({ children, error = false }) { return children ? <div className={`notice ${error ? 'notice-error' : ''}`} role={error ? 'alert' : 'status'}>{children}</div> : null; }
export function Empty({ title, description, action }) { return <div className="empty"><Dumbbell size={36} strokeWidth={1.3}/><h3>{title}</h3><p className="muted">{description}</p>{action}</div>; }
export function Field({ label, children, hint }) { return <label className="field"><span>{label}</span>{children}{hint && <small className="muted">{hint}</small>}</label>; }
export function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef(null);
  useEffect(() => { const dialog = ref.current; const previous = document.activeElement; dialog.showModal(); return () => { dialog.close(); previous?.focus?.(); }; }, []);
  return <dialog ref={ref} className={`modal ${wide ? 'modal-wide' : ''}`} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); } }} aria-labelledby="modal-title"><div className="modal-top"><h2 id="modal-title">{title}</h2><button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={20}/></button></div>{children}</dialog>;
}
export function Confirm({ title, children, onClose, onConfirm }) { return <Modal title={title} onClose={onClose}><p className="muted">{children}</p><div className="form-actions"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="danger" onClick={onConfirm}>Excluir</Button></div></Modal>; }
export class Boundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { console.error('[FitForge]', error); }
  render() { return this.state.error ? <section className="panel empty"><AlertTriangle size={32}/><h2>Este módulo está indisponível</h2><p className="muted">As outras áreas continuam disponíveis. Confira se o módulo está em execução e tente recarregar.</p><Button onClick={() => window.location.reload()}>Recarregar aplicativo</Button></section> : this.props.children; }
}
export function WeekChart({ buckets }) {
  const max = Math.max(1, ...buckets.map(d => d.minutes));
  return <div className="week-chart" role="img" aria-label={`Minutos de treino nesta semana: ${buckets.map(d => `${d.label}: ${d.minutes}`).join(', ')}`}>
    {buckets.map(d => <div className="chart-column" key={d.date}><span className="chart-value">{d.minutes || '—'}</span><div className="bar-track"><div className={`bar ${d.minutes ? 'filled' : ''}`} style={{ height: d.minutes ? `${Math.max(4, d.minutes / max * 100)}%` : '4px' }}/></div><span>{d.label}</span></div>)}
  </div>;
}
