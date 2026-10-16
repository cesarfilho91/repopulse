<?php

declare(strict_types=1);

use GuzzleHttp\Client;
use RepoPulse\Services\GitHubService;
use Slim\Factory\AppFactory;
use Slim\Psr7\Response;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

require __DIR__ . '/../vendor/autoload.php';

$app = AppFactory::create();
$app->addBodyParsingMiddleware();
$app->addRoutingMiddleware();

$allowedOrigins = array_filter(array_map('trim', explode(',', getenv('CORS_ORIGINS') ?: 'http://localhost:5173')));
$app->add(function (ServerRequestInterface $request, $handler) use ($allowedOrigins): ResponseInterface {
    $origin = $request->getHeaderLine('Origin');
    $response = $request->getMethod() === 'OPTIONS'
        ? new Response(204)
        : $handler->handle($request);

    if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
        $response = $response
            ->withHeader('Access-Control-Allow-Origin', $origin)
            ->withHeader('Vary', 'Origin')
            ->withHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
            ->withHeader('Access-Control-Allow-Headers', 'Content-Type');
    }

    return $response->withHeader('X-Content-Type-Options', 'nosniff');
});

$client = new Client([
    'base_uri' => 'https://api.github.com/',
    'timeout' => 8.0,
    'connect_timeout' => 3.0,
    'headers' => [
        'Accept' => 'application/vnd.github+json',
        'X-GitHub-Api-Version' => '2022-11-28',
        'User-Agent' => 'RepoPulse-Portfolio-App',
    ],
]);
$service = new GitHubService($client, getenv('GITHUB_TOKEN') ?: '', (int) (getenv('CACHE_TTL') ?: 60));

$app->get('/api/health', function (ServerRequestInterface $request, ResponseInterface $response) use ($service): ResponseInterface {
    $payload = ['status' => 'ok', 'service' => 'repopulse-api', 'timestamp' => gmdate(DATE_ATOM)];
    $response->getBody()->write(json_encode($payload, JSON_THROW_ON_ERROR));
    return $response->withHeader('Content-Type', 'application/json');
});

$app->get('/api/search', function (ServerRequestInterface $request, ResponseInterface $response) use ($service): ResponseInterface {
    $query = trim((string) ($request->getQueryParams()['q'] ?? ''));
    if ($query === '' || strlen($query) > 100) {
        $response->getBody()->write(json_encode(['error' => 'Informe uma busca entre 1 e 100 caracteres.']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }

    try {
        $data = $service->searchRepositories($query);
        $response->getBody()->write(json_encode(['data' => $data, 'meta' => ['count' => count($data), 'cached_for_seconds' => (int) (getenv('CACHE_TTL') ?: 60)]], JSON_THROW_ON_ERROR));
        return $response->withHeader('Content-Type', 'application/json');
    } catch (\Throwable $exception) {
        $status = $exception->getCode() === 404 ? 404 : ($exception->getCode() === 429 ? 429 : 502);
        $response->getBody()->write(json_encode(['error' => $status === 429 ? 'Limite da API do GitHub atingido. Tente novamente mais tarde.' : 'Não foi possível consultar o GitHub agora.']));
        return $response->withStatus($status)->withHeader('Content-Type', 'application/json');
    }
});

$app->get('/api/repositories/{owner}/{repo}', function (ServerRequestInterface $request, ResponseInterface $response, array $args) use ($service): ResponseInterface {
    try {
        $data = $service->repositoryDetails($args['owner'], $args['repo']);
        $response->getBody()->write(json_encode(['data' => $data], JSON_THROW_ON_ERROR));
        return $response->withHeader('Content-Type', 'application/json');
    } catch (\Throwable $exception) {
        $status = $exception->getCode() === 404 ? 404 : ($exception->getCode() === 429 ? 429 : 502);
        $message = $status === 404 ? 'Repositório não encontrado.' : ($status === 429 ? 'Limite da API do GitHub atingido.' : 'Não foi possível consultar o GitHub agora.');
        $response->getBody()->write(json_encode(['error' => $message]));
        return $response->withStatus($status)->withHeader('Content-Type', 'application/json');
    }
});

$app->options('/{routes:.*}', function (ServerRequestInterface $request, ResponseInterface $response): ResponseInterface {
    return $response;
});

$app->run();
