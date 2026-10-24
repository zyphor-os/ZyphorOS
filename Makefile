add:
	git add Makefile
	git commit -m "chore: add Makefile"

	# Add installable application files
	git add installable
	git commit -m "feat: add installable application"

release:
	npm run build
	mv dist/index.html ../zyphor-os.github.io
	mv dist/logo.png ../zyphor-os.github.io