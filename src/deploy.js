import { exec } from 'child_process'
import fs from 'mz/fs'
import inquirer from 'inquirer'
import path from 'path'
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
	h('  -no-confirmation     only works in non-interactive mode: does not prompt for confirmation')
	h('  --alias [name]       load the destination with alias [name]')
	h('  --dry-run            run rsync in dry-run mode')
	h('  --delete             delete remote files that do not exist locally')
}

//
// child_process.exec as a promise
//
function pexec(cmd, opts) {
	opts = opts || { }
	return new Promise((yes, no) => {
		exec(cmd, opts, (stdout, stderr) => yes([ stdout, stderr ]))
	})
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
function inquire(questions) {
	return new Promise((yes, no) => {
		inquirer.prompt(questions, answers => yes(answers))
	})
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
			let answers = await inquire([{
				name: 'destIndex',
				type: 'list',
				message: 'Which host do you want to deploy to?',
				choices: _.map(conf.destinations, (dest, index) => ({ name: dest.name, value: index }))
			}]) // parseInt(await ask('Which host do you want to deploy to?')) - 1
			destIndex = answers.destIndex
		}

		let typeArgs = await inquire([{
			type: 'list',
			name: 'type',
			message: 'How would you like to deploy?',
			choices: [
				{ name: 'Normal (--dry-run)', value: [ '--dry-run' ] },
				{ name: 'Normal', value: [] }, 
				{ name: 'Delete (--delete --dry-run)', value: [ '--delete', '--dry-run' ] }, 
				{ name: 'Delete (--delete)', value: [ '--delete' ] } ]
		}])
		cmd = cmd.concat(typeArgs.type)
		addInvariants()
		cmd.push(conf.destinations[destIndex].destination)

		console.log('Command: ' + _.flatten(cmd).join(' '))
		let answer = await inquire([{
			type: 'confirm',
			message: 'Do you want to execute the above command?',
			name: 'confirm'
		}])
		if (answer.confirm === false) {
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
		try { pkgStat = await fs.stat(pkgPath) } catch (e) { }

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
		let [ stdout, stderr ] = await pexec(cmd.join(' '), { cwd: process.cwd() })
		if (stdout && stdout.length)
			console.log(stdout)
		if (stderr && stderr.length)
			console.error(stderr)
	} catch (e) {
		console.error(e.stack)
	}
})()
