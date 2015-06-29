import Q from 'q'
import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'
import prompt from 'prompt'
import _ from 'lodash'

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
	h('  }')
}

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
// MAIN
//
(async() => {

if (process.argv.length && process.argv.indexOf('--help') != -1)
	return printHelp()

try {

let pkgPath = path.join(process.cwd(), 'package.json')
let pkgStat = null
try { pkgStat = await Q.nfcall(fs.stat, pkgPath) } catch (e) { }

if (!pkgStat) {
	console.error('The file "package.json" does not exist in the current directory ("' + process.cwd() + '"); exiting.')
	return
}

let conf = _.extend({
	rsync: {
		destinations: [ ],
		exclude: [ ]
	}
}, require(pkgPath)).rsync

console.log(_.map(conf.destinations,
				(dest, i) => (i + 1) + ': ' + dest.name)
			.join('\n'))

let destIndex = parseInt(await ask('Which host do you want to deploy to?')) - 1
if (isNaN(destIndex) || destIndex < 0 || destIndex >= conf.destinations.length) {
	console.error('The given response is not a number or was not a valid option!')
	return
}

console.log(_.map([ 'Normal (--dry-run)', 'Normal', 'Delete (--delete --dry-run)', 'Delete (--delete)' ], (p, i) => (i + 1) + ': ' + p).join('\n'))
let type = parseInt(await ask('How would you like to deploy?'))
if (isNaN(type) || type < 1 || type > 4) {
	console.error('The given response was not a valid option!')
	return
}

let cmd = [ 'rsync', '-av' ]
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

cmd.push(_.map(conf.exclude, e => '--exclude "' + e.replace('"', '\\"') + '"'))
cmd.push([ './' ])
cmd.push(conf.destinations[destIndex].destination)

cmd = _.flatten(cmd)

console.log('Command: ' + cmd.join(' '))
let confirm = await ask('Do you want to execute the above command? [Y/n]:')
if (confirm != 'Y') {
	console.log('Aborting')
	return
}

let [ stdout, stderr ] = await Q.nfcall(exec, cmd.join(' '), { cwd: process.cwd() })
if (stdout.length)
	console.log(stdout)
if (stderr.length)
	console.error(stderr)

} catch (e) {
	console.error(e)
}

})()
