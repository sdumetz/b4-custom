# Customize bootstrap 4

This is a tool that aims to replicate bootstrap 3.x [customize](https://getbootstrap.com/docs/3.3/customize/) tool.

It's meant to be deployed on lambda (reference implementation coming soon)

## How it works

Run the following commands :

	run css-compile && npm run css-prefix && npm run css-minify

using a `_custom.scss` file

## Project state

Currently at "working demo". A graphical interface is needed.

Can be called directly with `curl` :

		curl -XPOST -H "Content-Type: text/plain" -H "Accept: application/zip" --data-binary '@_custom.scss' "gateway_url" > bootstrap.tar.gz
