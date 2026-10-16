import { ArrowUpRight, GitCommitHorizontal, GitFork, Star, X } from 'lucide-react';
import type { RepositoryDetails } from '../types/github';

interface RepositoryDetailsPanelProps {
  details: RepositoryDetails | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });
const numberFormat = new Intl.NumberFormat('pt-BR');

export function RepositoryDetailsPanel({ details, loading, error, onClose }: RepositoryDetailsPanelProps) {
  return (
    <div className="panel-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="details-panel" role="dialog" aria-modal="true" aria-labelledby="details-title">
        <div className="details-panel__header">
          <div><span className="eyebrow">REPOSITÓRIO</span><h2 id="details-title">Atividade recente</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar painel"><X size={19} /></button>
        </div>
        {loading && <div className="panel-state">Carregando detalhes do repositório…</div>}
        {error && <div className="panel-state panel-state--error">{error}</div>}
        {details && !loading && <>
          <div className="details-repository">
            <h3>{details.repository.full_name}</h3>
            <p>{details.repository.description || 'Sem descrição disponível.'}</p>
            <div className="details-stats">
              <span><Star size={15} />{numberFormat.format(details.repository.stars)}</span>
              <span><GitFork size={15} />{numberFormat.format(details.repository.forks)}</span>
              <span><GitCommitHorizontal size={15} />{numberFormat.format(details.repository.open_issues)} issues abertas</span>
            </div>
            <a href={details.repository.html_url} target="_blank" rel="noreferrer" className="external-link">Abrir no GitHub <ArrowUpRight size={15} /></a>
          </div>
          <div className="commit-list-heading"><h3>Commits recentes</h3><span>Últimos 8</span></div>
          <div className="commit-list">
            {details.commits.map((commit) => <article className="commit-item" key={commit.sha}>
              <div className="commit-item__icon"><GitCommitHorizontal size={16} /></div>
              <div className="commit-item__content">
                <p>{commit.message}</p>
                <span>{commit.author} · {commit.date ? dateFormat.format(new Date(commit.date)) : 'Data indisponível'}</span>
              </div>
              {commit.url && <a href={commit.url} target="_blank" rel="noreferrer" className="icon-link" aria-label={`Ver commit ${commit.sha}`}><ArrowUpRight size={15} /></a>}
            </article>)}
            {details.commits.length === 0 && <p className="empty-commits">Nenhum commit recente encontrado.</p>}
          </div>
        </>}
      </section>
    </div>
  );
}
