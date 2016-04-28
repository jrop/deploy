# Deploy

> Control rsync with config in your package.json

## Installation

`npm install -g deploy-rsync`

## Use

Configuration for `deploy` is handled by adding configuration to your `package.json` file.  An example configuration is:

```
"rsync": {
	"destinations": [ {
		"dest": "user@host:/path/to/directory",
		"name": "Host #1",
		"alias": "host-1"
	}, ... ],
	"exclude": [ "pattern1", ... ],
	"args": [ "--update" ]
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
