# Deploy

`npm install -g https://jrop@bitbucket.org/jrop/deploy.git`

Then in your projects base directory, create a file called `deploy-config.json` that looks something like this:

```
{
	"files" : [ "*.php", "css/*", "img/*", "js/*" ],
	"ingore": "css/",
	"hosts": [
		{
			"host": "test-informationsystems.colostate.edu",
			"user": "cwis604",
			"dir": "~/public_html/wp-content/themes/is"
		},
		{
			"host": "informationsystems.colostate.edu",
			"user": "cwis604",
			"dir": "~/domains/informationsystems.colostate.edu/public_html/wp-content/themes/is"
		}
	]
}
```
