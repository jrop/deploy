Deploy
======

`npm install -g https://jrop@bitbucket.org/jrop/deploy.git`

Then in your projects `package.json` file add the following configuration:

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

Then run:

```
deploy
```

(This runs in interactive mode, and prompts for various options)

Or run:

```
deploy --alias host-1
```

If you do not wish to be prompted for confirmation, add the `--no-confirm` flag.
