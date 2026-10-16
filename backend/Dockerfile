FROM php:8.3-cli-alpine AS runtime

RUN apk add --no-cache git unzip \
    && docker-php-ext-install opcache
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/app
COPY composer.json composer.json
RUN composer install --no-dev --no-interaction --prefer-dist --no-progress --optimize-autoloader
COPY . .
RUN chown -R www-data:www-data /var/www/app
ENV APP_ENV=production
EXPOSE 10000
CMD ["sh", "-c", "php -S 0.0.0.0:${PORT:-10000} -t public"]
