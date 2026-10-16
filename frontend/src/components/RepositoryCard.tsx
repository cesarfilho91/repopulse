import { ExternalLink, GitFork, Star } from 'lucide-react';
import type { Repository } from '../types/github';

interface RepositoryCardProps {
  repository: Repository;
  onSelect: (repository: Repository) => void;
}

const numberFormat = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

export function RepositoryCard({ repository, onSelect }: RepositoryCardProps) {
  return (
    <article className="repository-card">
      <div className="repository-card__topline">
        <span className="language"><span className="language__dot" />{repository.language ?? 'Outras linguagens'}</span>
        <a href={repository.html_url} target="_blank" rel="noreferrer" aria-label={`Abrir ${repository.full_name} no GitHub`} className="icon-link"><ExternalLink size={16} /></a>
      </div>
      <button className="repository-card__title" onClick={() => onSelect(repository)}>{repository.full_name}</button>
      <p className="repository-card__description">{repository.description || 'Este repositório não possui descrição.'}</p>
      <div className="repository-card__footer">
        <span><Star size={15} />{numberFormat.format(repository.stars)}</span>
        <span><GitFork size={15} />{numberFormat.format(repository.forks)}</span>
        <button className="text-button" onClick={() => onSelect(repository)}>Ver atividade <span aria-hidden="true">→</span></button>
      </div>
    </article>
  );
}
