import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, Github, Search, ShieldCheck, SlidersHorizontal, Sparkles } from 'lucide-react';
import { RepositoryCard } from './components/RepositoryCard';
import { RepositoryDetailsPanel } from './components/RepositoryDetailsPanel';
import { getRepositoryDetails, searchRepositories } from './services/api';
import type { Repository, RepositoryDetails } from './types/github';

const DEFAULT_QUERY = 'react';
const REFRESH_INTERVAL = 60_000;
const numberFormat = new Intl.NumberFormat('pt-BR');

export default function App() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [activeQuery, setActiveQuery] = useState(DEFAULT_QUERY);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedRepository, setSelectedRepository] = useState<string | null>(null);
  const [details, setDetails] = useState<RepositoryDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [refreshEnabled, setRefreshEnabled] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const loadRepositories = useCallback(async (searchTerm: string, showLoading = true) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const data = await searchRepositories(searchTerm, controller.signal);
      setRepositories(data);
      setLastUpdated(new Date());
    } catch (caught) {
      if (caught instanceof Error && caught.name === 'AbortError') return;
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar os repositórios.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRepositories(DEFAULT_QUERY);
    return () => abortRef.current?.abort();
  }, [loadRepositories]);

  useEffect(() => {
    if (!refreshEnabled) return;
    const interval = window.setInterval(() => void loadRepositories(activeQuery, false), REFRESH_INTERVAL);
    return () => window.clearInterval(interval);
  }, [activeQuery, loadRepositories, refreshEnabled]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = query.trim();
    if (!normalized) return;
    setActiveQuery(normalized);
    void loadRepositories(normalized);
  };

  const openDetails = async (repository: Repository) => {
    setSelectedRepository(repository.full_name);
    setDetails(null);
    setDetailsError(null);
    setDetailsLoading(true);
    try {
      setDetails(await getRepositoryDetails(repository.full_name));
    } catch (caught) {
      setDetailsError(caught instanceof Error ? caught.message : 'Não foi possível carregar os detalhes.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const totalStars = repositories.reduce((total, repository) => total + repository.stars, 0);
  const totalForks = repositories.reduce((total, repository) => total + repository.forks, 0);
  const languages = new Set(repositories.map((repository) => repository.language).filter(Boolean)).size;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#top"><span className="brand__mark"><Activity size={21} strokeWidth={2.5} /></span><span>repo<span className="brand__accent">pulse</span><small>DEVELOPER INTELLIGENCE</small></span></a>
        <div className="sidebar__section-label">WORKSPACE</div>
        <a href="#overview" className="nav-item nav-item--active"><SlidersHorizontal size={17} />Visão geral</a>
        <a href="#repositories" className="nav-item"><Github size={17} />Explorar repositórios</a>
        <div className="sidebar__bottom"><div className="api-status"><span className="status-dot" /><span><strong>GitHub API</strong><small>Conexão ativa</small></span></div><p>Dados públicos do GitHub<br />Atualização a cada 60 segundos</p></div>
      </aside>

      <main className="main-content" id="top">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>Visão geral</strong></div><div className="topbar__right"><span className="live-indicator"><span className="status-dot" />LIVE DATA</span><a className="github-link" href="https://github.com" target="_blank" rel="noreferrer"><Github size={17} /> GitHub <ArrowUpRight size={14} /></a></div></header>
        <section className="page-heading" id="overview"><div><div className="eyebrow"><Sparkles size={13} /> DEVELOPER ANALYTICS</div><h1>GitHub, em movimento.</h1><p>Acompanhe projetos, métricas e atividade recente em um só lugar.</p></div><div className="last-updated"><span className="status-dot" /><span>{lastUpdated ? `Atualizado às ${lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Aguardando dados'}</span></div></section>

        <section className="metrics-grid" aria-label="Resumo da busca">
          <article className="metric-card"><div className="metric-card__top"><span>Repositórios encontrados</span><span className="metric-icon metric-icon--blue"><Github size={17} /></span></div><strong>{loading && repositories.length === 0 ? '—' : numberFormat.format(repositories.length)}</strong><div className="metric-card__foot"><span className="metric-neutral">Busca atual</span><span className="metric-foot-icon"><ArrowUpRight size={14} /></span></div></article>
          <article className="metric-card"><div className="metric-card__top"><span>Estrelas acumuladas</span><span className="metric-icon metric-icon--amber"><span>★</span></span></div><strong>{numberFormat.format(totalStars)}</strong><div className="metric-card__foot"><span className="metric-positive"><ArrowUpRight size={13} /> Popularidade</span><span className="metric-neutral">na seleção</span></div></article>
          <article className="metric-card"><div className="metric-card__top"><span>Forks acumulados</span><span className="metric-icon metric-icon--purple"><Github size={17} /></span></div><strong>{numberFormat.format(totalForks)}</strong><div className="metric-card__foot"><span className="metric-neutral">Projetos derivados</span><span className="metric-foot-icon"><ArrowDownRight size={14} /></span></div></article>
          <article className="metric-card"><div className="metric-card__top"><span>Linguagens distintas</span><span className="metric-icon metric-icon--green"><Activity size={17} /></span></div><strong>{languages}</strong><div className="metric-card__foot"><span className="metric-positive"><ShieldCheck size={13} /> Diversidade</span><span className="metric-neutral">na seleção</span></div></article>
        </section>

        <section className="repositories-section" id="repositories"><div className="section-heading"><div><h2>Explorar repositórios</h2><p>Encontre projetos públicos e acompanhe sua atividade.</p></div><span className="result-count">{repositories.length} resultados</span></div>
          <form className="search-bar" onSubmit={handleSearch}><Search size={19} /><input aria-label="Buscar repositórios" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busque por tecnologia, projeto ou organização…" /><kbd>ENTER</kbd><button type="submit" disabled={loading}><Search size={16} /><span>Buscar</span></button></form>
          <div className="filter-row"><div><span className="filter-label">SUGESTÕES</span>{['react', 'laravel', 'typescript', 'php'].map((term) => <button className={`query-chip ${activeQuery === term ? 'query-chip--active' : ''}`} key={term} onClick={() => { setQuery(term); setActiveQuery(term); void loadRepositories(term); }}>{term}</button>)}</div><label className="refresh-toggle"><input type="checkbox" checked={refreshEnabled} onChange={(event) => setRefreshEnabled(event.target.checked)} /><span className="toggle-track" /><span>Atualização automática</span></label></div>
          {error && <div className="error-banner" role="alert">{error}<button onClick={() => void loadRepositories(activeQuery)}>Tentar novamente</button></div>}
          {loading && repositories.length === 0 ? <div className="repository-grid">{Array.from({ length: 6 }, (_, index) => <div className="skeleton-card" key={index}><div /><div /><div /></div>)}</div> : <div className="repository-grid">{repositories.map((repository) => <RepositoryCard key={repository.id} repository={repository} onSelect={(item) => void openDetails(item)} />)}</div>}
          {!loading && !error && repositories.length === 0 && <div className="empty-state"><Search size={26} /><h3>Nenhum repositório encontrado</h3><p>Tente outro termo ou pesquise pelo nome de uma organização.</p></div>}
          <div className="section-footer"><span>Dados fornecidos pela GitHub REST API</span><a href="https://docs.github.com/en/rest" target="_blank" rel="noreferrer">Documentação da API <ArrowUpRight size={13} /></a></div>
        </section>
        <footer className="app-footer"><span>RepoPulse <span>·</span> Projeto de portfólio</span><span>Feito para explorar o que move o open source.</span></footer>
      </main>
      {selectedRepository && <RepositoryDetailsPanel details={details} loading={detailsLoading} error={detailsError} onClose={() => setSelectedRepository(null)} />}
    </div>
  );
}
