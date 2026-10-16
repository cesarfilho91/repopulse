<?php

declare(strict_types=1);

namespace RepoPulse\Tests;

use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Response;
use PHPUnit\Framework\TestCase;
use RepoPulse\Services\GitHubService;

final class GitHubServiceTest extends TestCase
{
    public function testSearchNormalizesRepositoryData(): void
    {
        $payload = ['items' => [[
            'id' => 42, 'name' => 'demo', 'full_name' => 'octocat/demo',
            'html_url' => 'https://github.com/octocat/demo', 'stargazers_count' => 17,
            'forks_count' => 3, 'open_issues_count' => 2, 'owner' => ['login' => 'octocat'],
        ]]];
        $client = new Client(['handler' => HandlerStack::create(new MockHandler([
            new Response(200, [], json_encode($payload, JSON_THROW_ON_ERROR)),
        ]))]);
        $service = new GitHubService($client, '', 0);
        $result = $service->searchRepositories('octocat');

        self::assertCount(1, $result);
        self::assertSame('octocat/demo', $result[0]['full_name']);
        self::assertSame(17, $result[0]['stars']);
    }

    public function testNotFoundIsExposedAs404(): void
    {
        $client = new Client(['handler' => HandlerStack::create(new MockHandler([new Response(404)]))]);
        $service = new GitHubService($client, '', 0);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionCode(404);
        $service->repositoryDetails('unknown-owner', 'unknown-repo');
    }
}
