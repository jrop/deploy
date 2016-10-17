#!/usr/bin/env node
'use strict'

require('colors')
const childProcess = require('child_process')
const co = require('co')
const deploy = require('./lib')
const fs = require('mz/fs')
const inquirer = require('inquirer')
const path = require('path')
const rsync = require('rsyncwrapper')
const shellQuote = require('shell-quote')
const yargs = require('yargs')

function exec(command) {
	return new Promise((yes, no) => {
		const [ cmd, ...args ] = shellQuote.parse(command, process.env)
		const proc = childProcess.spawn(cmd, args, {
			env: process.env,
			stdio: 'inherit',
		})
		proc.on('error', e => no(e))
		proc.on('exit', (code, signal) =>
			(typeof code == 'number' && code == 0 ?
				yes() :
				no(new Error(`"${command}" exited with code: ${code || signal}`))))
	})
}

const getRsyncCommand = co.wrap(function* (conf) {
	conf.noExec = true
	const [ ,, cmd ] = (yield done => rsync(conf, done))
	conf.noExec = false
	return cmd
})

co(function * main() {
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

	// set environment variables
	for (const envName in parsed.env) {
		process.env[envName] = parsed.env[envName]
	}

	const rsyncCommand = yield getRsyncCommand(conf)
	console.log('Command:', rsyncCommand)
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
			console.log()
			console.log('> Executing pre-hook:'.yellow, hook)
			console.log()
			yield exec(hook, true)
		}

		console.log()
		console.log('> Executing rsync:'.yellow, rsyncCommand)
		console.log()
		yield exec(rsyncCommand)

		for (const hook of parsed.postHooks) {
			console.log()
			console.log('> Executing post-hook:'.yellow, hook)
			console.log()
			yield exec(hook, true)
		}
	} else {
		process.exitCode = 1
		console.log('Aborting')
	}
}).catch((e) => {
	process.exitCode = 1
	if (e.cmd) console.error('Error executing shell command'.red, e.cmd)
	if (e.stderr) console.error(e.stderr.red)
	console.error(e && typeof e.stack == 'string' ? e.stack.red : e)
})
