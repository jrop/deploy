#!/usr/bin/env node
'use strict'

const co = require('co')
const fs = require('mz/fs')
const inquirer = require('inquirer')
const path = require('path')
const rsyncwrapper = require('rsyncwrapper')
const yargs = require('yargs')

function rsync(opts) {
	return new Promise((yes, no) => {
		rsyncwrapper(opts, (err, stdout, stderr, cmd) => {
			const ret = { stdout, stderr, cmd }
			return err ? no(Object.assign(err, ret)) : yes(ret)
		})
	})
}

const interactive = co.wrap(function* (conf) {
	let destIndex = 0
	if (conf.destinations.length > 1) {
		const answers = yield inquirer.prompt([ {
			name: 'destIndex',
			type: 'list',
			message: 'Which host do you want to deploy to?',
			choices: conf.destinations.map((dest, index) => ({ name: dest.name, value: index })),
		} ])
		destIndex = answers.destIndex
	}

	const typeArgs = yield inquirer.prompt([ {
		type: 'list',
		name: 'type',
		message: 'How would you like to deploy?',
		choices: [
			{ name: 'Normal (--dry-run)', value: { dryRun: true } },
			{ name: 'Normal', value: [] },
			{ name: 'Delete (--delete --dry-run)', value: { delete: true, dryRun: true } },
			{ name: 'Delete (--delete)', value: { delete: true } } ],
	} ])

	return {
		destIndex,
		delete: typeArgs.type.delete || false,
		dryRun: typeArgs.type.dryRun || false,
	}
})

//
// MAIN
//
co(function* () {
	const args = yargs.usage('$0 [options]')
		.options({
			'alias': { alias: 'a', type: 'string', desc: 'Use an aliased destination' },
			'delete': { alias: 'd', type: 'boolean', default: false },
			'no-confirm': { alias: 'f', type: 'boolean', default: false },
			'dry-run': { alias: 'n', type: 'boolean', default: false },
		})
		.help().alias('help', 'h')
		.version('version', 'Print the `deploy` version', require('./package.json').version).alias('version', 'v')
		.argv

	const pkgPath = path.join(process.cwd(), 'package.json')
	yield fs.access(pkgPath, fs.R_OK)

	let conf = JSON.parse(yield fs.readFile(pkgPath)).rsync
	conf = Object.assign({
		destinations: [],
		args: [],
		src: './',
	}, conf)

	if (conf.destinations.length === 0)
		throw new Error('No destinations declared in package.json (rsync.destinations)')

	const setup = args.alias ? {
		destIndex: conf.destinations.findIndex(d => d.alias == args.alias),
		delete: args.delete,
		dryRun: args.dryRun,
	} : yield interactive(conf)

	conf.delete = setup.delete || false
	conf.dryRun = setup.dryRun || false

	if (setup.destIndex === -1)
		throw new Error(`No destination found. Available aliases: ${conf.destinations.map(d => d.alias)}`)
	conf.dest = conf.destinations[setup.destIndex].dest
	delete conf.destinations

	conf.noExec = true
	const cmd = (yield rsync(conf)).cmd
	conf.noExec = false

	console.log('Command:', cmd)
	if (!args.noConfirm) {
		const answer = yield inquirer.prompt([ {
			type: 'confirm',
			message: 'Do you want to execute the above command?',
			name: 'confirm',
			default: true,
		} ])
		if (answer.confirm === false)
			throw new Error('Aborting')
	}

	const obj = yield rsync(conf)
	if (obj.stdout) console.log(obj.stdout)
	if (obj.stderr) console.error(obj.stderr)
}).catch((e) => {
	if (e.cmd) console.error('Error executing shell command', e.cmd)
	if (e.stdout) console.log(e.stdout)
	if (e.stderr) console.error(e.stderr)
	console.error(e.stack)
})
