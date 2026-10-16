export interface RepositoryOwner {
  login: string;
  avatar_url: string | null;
  html_url: string;
}

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stars: number;
  forks: number;
  open_issues: number;
  watchers: number;
  visibility: string;
  updated_at: string | null;
  owner: RepositoryOwner;
}

export interface Commit {
  sha: string;
  message: string;
  author: string;
  avatar_url: string | null;
  date: string | null;
  url: string | null;
}

export interface RepositoryDetails {
  repository: Repository;
  commits: Commit[];
}
