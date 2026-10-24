add:
	git add Makefile
	git commit -m "chore: add Makefile"

	# Update package.json
	git add package.json
	git commit -m "build: update package configuration"

	# Update package-lock.json
	git add package-lock.json
	git commit -m "build: update package lockfile"

	# Update site navigation component
	git add src/components/site/Nav.tsx
	git commit -m "feat(ui): update site navigation"

	# Add installable application files
	git add installable/
	git commit -m "feat: add installable application"

release:
	npm run build
	mv dist/index.html ../zyphor-os.github.io
	mv dist/logo.png ../zyphor-os.github.io