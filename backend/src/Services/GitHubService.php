<?php

declare(strict_types=1);

namespace RepoPulse\Services;

use GuzzleHttp\ClientInterface;
use GuzzleHttp\Exception\GuzzleException;
use RuntimeException;

final class GitHubService
{
    private string $cacheDirectory;

    public function __construct(
        private readonly ClientInterface $client,
        private readonly string $token = '',
        private readonly int $cacheTtl = 60,
    ) {
        $this->cacheDirectory = sys_get_temp_dir() . '/repopulse-cache';
        if (!is_dir($this->cacheDirectory)) {
            mkdir($this->cacheDirectory, 0775, true);
        }
    }

    /** @return list<array<string, mixed>> */
    public function searchRepositories(string $query): array
    {
        $result = $this->request('search/repositories', ['q' => $query, 'sort' => 'updated', 'order' => 'desc', 'per_page' => 12]);
        return array_map(fn (array $repo): array => $this->normalizeRepository($repo), $result['items'] ?? []);
    }

    /** @return array<string, mixed> */
    public function repositoryDetails(string $owner, string $repo): array
    {
        if (!preg_match('/^[A-Za-z0-9_.-]{1,100}$/', $owner) || !preg_match('/^[A-Za-z0-9_.-]{1,100}$/', $repo)) {
            throw new RuntimeException('Invalid repository identifier.', 400);
        }

        $repository = $this->request('repos/' . rawurlencode($owner) . '/' . rawurlencode($repo));
        $commits = $this->request('repos/' . rawurlencode($owner) . '/' . rawurlencode($repo) . '/commits', ['per_page' => 8]);

        return [
            'repository' => $this->normalizeRepository($repository),
            'commits' => array_map(static fn (array $commit): array => [
                'sha' => substr((string) ($commit['sha'] ?? ''), 0, 7),
                'message' => strtok((string) ($commit['commit']['message'] ?? 'Sem mensagem'), "\n"),
                'author' => $commit['commit']['author']['name'] ?? $commit['author']['login'] ?? 'Autor desconhecido',
                'avatar_url' => $commit['author']['avatar_url'] ?? null,
                'date' => $commit['commit']['author']['date'] ?? null,
                'url' => $commit['html_url'] ?? null,
            ], is_array($commits) ? $commits : []),
        ];
    }

    /** @return array<string, mixed> */
    private function normalizeRepository(array $repo): array
    {
        return [
            'id' => $repo['id'] ?? 0,
            'name' => $repo['name'] ?? '',
            'full_name' => $repo['full_name'] ?? '',
            'description' => $repo['description'] ?? null,
            'html_url' => $repo['html_url'] ?? '',
            'homepage' => $repo['homepage'] ?? null,
            'language' => $repo['language'] ?? null,
            'stars' => $repo['stargazers_count'] ?? 0,
            'forks' => $repo['forks_count'] ?? 0,
            'open_issues' => $repo['open_issues_count'] ?? 0,
            'watchers' => $repo['watchers_count'] ?? 0,
            'visibility' => $repo['visibility'] ?? 'public',
            'updated_at' => $repo['updated_at'] ?? null,
            'owner' => [
                'login' => $repo['owner']['login'] ?? '',
                'avatar_url' => $repo['owner']['avatar_url'] ?? null,
                'html_url' => $repo['owner']['html_url'] ?? '',
            ],
        ];
    }

    /** @return array<mixed> */
    private function request(string $path, array $query = []): array
    {
        $cacheKey = hash('sha256', $path . '?' . http_build_query($query));
        $cacheFile = $this->cacheDirectory . '/' . $cacheKey . '.json';
        if (is_file($cacheFile) && filemtime($cacheFile) + max(0, $this->cacheTtl) > time()) {
            $cached = file_get_contents($cacheFile);
            if ($cached !== false) {
                return json_decode($cached, true, 512, JSON_THROW_ON_ERROR);
            }
        }

        $headers = $this->token !== '' ? ['Authorization' => 'Bearer ' . $this->token] : [];
        try {
            $response = $this->client->request('GET', $path, ['query' => $query, 'headers' => $headers, 'http_errors' => false]);
        } catch (GuzzleException $exception) {
            throw new RuntimeException('GitHub API is unavailable.', 502, $exception);
        }

        $status = $response->getStatusCode();
        if ($status === 404) {
            throw new RuntimeException('GitHub resource not found.', 404);
        }
        if ($status === 403 || $status === 429) {
            throw new RuntimeException('GitHub API rate limit reached.', 429);
        }
        if ($status < 200 || $status >= 300) {
            throw new RuntimeException('GitHub API returned an unexpected response.', 502);
        }

        $body = (string) $response->getBody();
        $data = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
        file_put_contents($cacheFile, $body, LOCK_EX);
        return $data;
    }
}
