# Makefile for e2e workflow convenience
.PHONY: e2e-up e2e-install e2e-test e2e-down e2e-run

COMPOSE_FILE=docker-compose.playwright.yml

e2e-up:
	docker compose -f $(COMPOSE_FILE) pull
	docker compose -f $(COMPOSE_FILE) up -d db wordpress

# Run wp core install and plugin activation using volumes-from approach
e2e-install:
	@WORDPRESS_CONTAINER=$$(docker compose -f $(COMPOSE_FILE) ps -q wordpress) ; \
	if [ -z "$$WORDPRESS_CONTAINER" ]; then echo "WordPress container not found" ; exit 1 ; fi ; \
	docker run --rm --volumes-from "$$WORDPRESS_CONTAINER" --network $$(docker network ls --filter name=$$(basename "$(PWD)")_default -q) \
		-e WORDPRESS_DB_HOST='db:3306' -e WORDPRESS_DB_USER='wordpress' -e WORDPRESS_DB_PASSWORD='wordpress' -e WORDPRESS_DB_NAME='wordpress' \
		wordpress:cli wp core install --url=http://wordpress --title=wp --admin_user=admin --admin_password=pass --admin_email=admin@example.com --skip-email --path=/var/www/html || true ; \
	docker run --rm --volumes-from "$$WORDPRESS_CONTAINER" --network $$(docker network ls --filter name=$$(basename "$(PWD)")_default -q) \
		-e WORDPRESS_DB_HOST='db:3306' -e WORDPRESS_DB_USER='wordpress' -e WORDPRESS_DB_PASSWORD='wordpress' -e WORDPRESS_DB_NAME='wordpress' \
		wordpress:cli wp plugin activate common-wp-blocks --path=/var/www/html || true

e2e-test:
	docker compose -f $(COMPOSE_FILE) up -d playwright
	docker compose -f $(COMPOSE_FILE) exec playwright sh -c "npm ci && npx playwright test --config=tests/e2e/playwright.config.js"

e2e-run: e2e-up e2e-install e2e-test

e2e-down:
	docker compose -f $(COMPOSE_FILE) down -v
