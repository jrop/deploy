# Deploy

[![Greenkeeper badge](https://badges.greenkeeper.io/jrop/deploy.svg)](https://greenkeeper.io/)

> Control rsync with config in your package.json

## Installation

`npm install -g deploy-rsync`

## Use

Configuration for `deploy` is handled by adding configuration to your `package.json` file.  An example configuration is:

```
"deploy": {
	"destinations": [ {
		"dest": "user@host:/path/to/directory",
		"name": "Host #1",
		"alias": "host-1",
		"env": (object),
		"preHooks": (array or string),
		"postHooks": (array or string)
	}, ... ],
	"exclude": [ "pattern1", ... ],
	"args": [ "--update" ],

	// or optionally:
	"src": "...",
	"dest": "...",
	"args": [ "-avn" ],
}
```

Then you may run `deploy` in the same directory as this `package.json` file.

```
$ deploy
```

(This runs in interactive mode, and prompts for various options)

Or, to run in non-interactive mode:

```
$ deploy --alias host-1
```

If you do not wish to be prompted for confirmation, add the `--no-confirm` flag.
