import Q from 'q'
import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'
import prompt from 'prompt'
import _ from 'lodash'

//
// Prints a help message
//
function printHelp() {
	let h = (s) => console.log(s)
	h('A utility for rsync\'ing using configuration data\n')
	h('Usage: deploy\n')
	h('Make sure that this command is run in the same directory that the file "package.json" is found.\n')
	h('package.json options:')
	h('  "rsync": {')
	h('    "destinations": [{')
	h('      "destination": "user@host:/path/to/directory",')
	h('      "name": "Host #1"')
	h('    }, ...],')
	h('    "exclude": ["pattern1", ...]')
	h('  }\n')
	h('Options:')
	h('  -i                   interactive mode')
	h('  -no-confirmation     only works in interactive mode: does not prompt for confirmation')
	h('  --alias [name]       load the destination with alias [name]')
	h('  --dry-run            run rsync in dry-run mode')
	h('  --delete             delete remote files that do not exist locally')
}

//
// Validates the configuration
//
function validate(conf) {
	if (!conf.destinations.length) {
		console.error('No destinations declared in package.json (rsync.destinations)')
		process.exit(1)
	}

	let destsValid = _.chain(conf.destinations)
		.map(d => d.destination && d.name)
		.all()
		.value()

	if (!destsValid) {
		console.error('One or more rsync.destinations does not have all required properties: destination, and name')
		process.exit(1)
	}
}

//
// Prompts the user
//
async function ask(q) {
	try {
		prompt.message = ''
		prompt.delimiter = ''
		prompt.start()

		let response = await Q.nfcall(prompt.get, [{
			name: q
		}])

		return response[q]
	} catch (e) {
		return null
	}
}

//
// Builds the rsync command with either command line options,
// or by prompting the user (interactive [-i] mode)
//
async function getCommand(conf) {
	let cmd = [ 'rsync', '-av' ]

	function addInvariants() {
		cmd.push(_.map(conf.exclude, e => '--exclude "' + e.replace('"', '\\"') + '"'))
		cmd.push('./')
	}

	if (process.argv.indexOf('-i') != -1) {
		// run in interactive mode
		let destIndex = 0

		if (conf.destinations.length > 1) {
			console.log(_.map(conf.destinations,
							(dest, i) => (i + 1) + ': ' + dest.name)
						.join('\n'))

			destIndex = parseInt(await ask('Which host do you want to deploy to?')) - 1
			if (isNaN(destIndex) || destIndex < 0 || destIndex >= conf.destinations.length) {
				console.error('The given response is not a number or was not a valid option!')
				process.exit(1)
			}
		}

		console.log(_.map([ 'Normal (--dry-run)', 'Normal', 'Delete (--delete --dry-run)', 'Delete (--delete)' ], (p, i) => (i + 1) + ': ' + p).join('\n'))
		let type = parseInt(await ask('How would you like to deploy?'))
		if (isNaN(type) || type < 1 || type > 4) {
			console.error('The given response was not a valid option!')
			process.exit(1)
		}

		switch (type) {
		case 1:
			cmd.push('--dry-run')
			break
		case 2:
			break
		case 3:
			cmd.push('--dry-run')
			cmd.push('--delete')
			break
		case 4:
			cmd.push('--delete')
			break
		}

		addInvariants()
		cmd.push(conf.destinations[destIndex].destination)

		console.log('Command: ' + _.flatten(cmd).join(' '))
		let confirm = await ask('Do you want to execute the above command? [Y/n]:')
		if (confirm != 'Y') {
			console.log('Aborting')
			process.exit(1)
		}
	} else {
		// get options from command line
		if (process.argv.indexOf('--delete') != -1)
			cmd.push('--delete')
		if (process.argv.indexOf('--dry-run') != -1)
			cmd.push('--dry-run')

		addInvariants()

		let i = process.argv.indexOf('--alias')
		if (i == -1 || i == process.argv.length - 1) {
			console.error('No --alias given')
			process.exit(1)
		}
		let alias = process.argv[i + 1]
		let destIndex = _.findIndex(conf.destinations, d => d.alias == alias)
		if (destIndex == -1) {
			console.error('Cannot find destination with alias "' + alias + '"')
			process.exit(1)
		}
		cmd.push(conf.destinations[destIndex].destination)

		if (process.argv.indexOf('-no-confirmation') == -1) {
			console.log('Command: ' + _.flatten(cmd).join(' '))
			let confirm = await ask('Do you want to execute the above command? [Y/n]:')
			if (confirm != 'Y') {
				console.log('Aborting')
				process.exit(1)
			}
		}
	}

	return _.flatten(cmd)
}

//
// MAIN
//
(async() => {
	if (process.argv.indexOf('--help') != -1)
		return printHelp()

	try {
		let pkgPath = path.join(process.cwd(), 'package.json')
		let pkgStat = null
		try { pkgStat = await Q.nfcall(fs.stat, pkgPath) } catch (e) { }

		if (!pkgStat) {
			console.error('The file "package.json" does not exist in the current directory ("' + process.cwd() + '"); exiting.')
			return
		}

		let conf = require(pkgPath)
		conf = conf.rsync || { }
		conf = _.extend({
			destinations: [ ],
			exclude: [ ]
		}, conf)

		validate(conf)

		let cmd = await getCommand(conf)
		let [ stdout, stderr ] = await Q.nfcall(exec, cmd.join(' '), { cwd: process.cwd() })
		if (stdout.length)
			console.log(stdout)
		if (stderr.length)
			console.error(stderr)
	} catch (e) {
		console.error(e.stack)
	}
})()
