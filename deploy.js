#!/usr/bin/env node
'use strict'

const childProcess = require('child_process')
const co = require('co')
const deploy = require('./lib')
const fs = require('mz/fs')
const inquirer = require('inquirer')
const path = require('path')
const rsync = require('rsyncwrapper')
const yargs = require('yargs')

function exec(obj, verbose, runner) {
	runner = runner || childProcess.exec
	return new Promise((yes, no) => {
		runner(obj, (err, stdout, stderr, cmd) => {
			if (verbose && stdout)
				console.log(stdout)
			const ret = { stdout, stderr, cmd }
			return err ? no(Object.assign(err, ret)) : yes(ret)
		})
	})
}

const getCommand = co.wrap(function* (conf) {
	conf.noExec = true
	const cmd = (yield exec(conf, false, rsync)).cmd
	conf.noExec = false
	return cmd
})

co(function* () {
	const args = yargs.usage('$0 [options]')
		.options({
			'alias': { alias: 'a', type: 'string', desc: 'Use an aliased destination' },
			'src': { alias: 's', type: 'string', desc: 'Rsync source' },
			'dest': { alias: 't', type: 'string', desc: 'Rsync destination' },
			'confirm': { alias: 'f', type: 'boolean', desc: 'Prompt to run command', default: true },
			'prompt': { alias: 'p', type: 'boolean', desc: 'Prompt for argument sets', default: true },
			'delete': { alias: 'd', type: 'boolean', desc: 'Passed to rsync' },
			'dry-run': { alias: 'n', type: 'boolean', desc: 'Passed to rsync' },
		})
		.help().alias('help', 'h')
		.version('version', 'Print the `deploy` version', require('./package.json').version).alias('version', 'v')
		.argv

	const pkgPath = path.join(process.cwd(), 'package.json')
	yield fs.access(pkgPath, fs.R_OK)

	const pkg = JSON.parse(yield fs.readFile(pkgPath))

	if (typeof pkg.deploy === 'undefined')
		throw new Error('Missing deploy key in package.json')

	const parsed = yield deploy.parseConfig(args, pkg.deploy)
	const conf = parsed.config

	if (args.delete) conf.delete = args.delete
	if (args.dryRun) conf.dryRun = args.dryRun

	console.log('Command:', yield getCommand(conf))
	let run = true
	if (args.confirm) {
		const answer = yield inquirer.prompt([ {
			type: 'confirm',
			message: 'Do you want to execute the above command?',
			name: 'confirm',
			default: true,
		} ])
		run = answer.confirm
	}

	if (run) {
		for (const hook of parsed.preHooks) {
			console.log('Executing pre-hook:', hook)
			yield exec(hook, true)
		}

		console.log('Executing rsync')
		yield exec(conf, true, rsync)

		for (const hook of parsed.postHooks) {
			console.log('Executing post-hook:', hook)
			yield exec(hook, true)
		}
	} else {
		console.log('Aborting')
	}
}).catch((e) => {
	if (e.cmd) console.error('Error executing shell command', e.cmd)
	if (e.stderr) console.error(e.stderr)
	console.error(e.stack)
})
