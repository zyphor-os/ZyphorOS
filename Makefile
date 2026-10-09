add:
	git add Makefile
	git commit -m "chore: add Makefile"

	git add src/components/site/Footer.tsx
	git commit -m "chore: update site footer"

	git add src/components/site/Nav.tsx
	git commit -m "chore: update site navigation"

	git add src/routes/about.tsx
	git commit -m "chore: update about page"

	git add src/routes/index.tsx
	git commit -m "chore: update homepage"

release:
	npm run build
	mv dist/index.html ../zyphor-os.github.io
	mv dist/logo.png ../zyphor-os.github.io