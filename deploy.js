#!/usr/bin/env node

var discus = require('./lib/discus')
var fs = require('fs')
var Q = require('q')
var ssh = require('./lib/ssh')
var _ = require('underscore')

//
// BEGIN helper functions
//

//
// promise-glob
//
function glob(pattern) {
	var g = require('glob')
	return Q.nfcall(g.glob.bind(g.glob), pattern)
}
//
// END helper functions
//

//
// now for the work:
//
// ====================
// 1) read configuration
// 2) prompt for the host to copy to
// 3) glob the files
// 4) confirm all information
// 5) scp said files to selected host
// ====================
//

//
// 1) Read configuration
//
var CFG = JSON.parse(fs.readFileSync(process.cwd() + '/deploy-config.json'))

//
// 2) prompt for host to copy to
//
console.log('HOSTS:')
console.log(_.map(CFG.hosts, function(host, index) {
	return '\t' + (index + 1) + ':\t' + host.host
}).join('\r\n'))

var host = null
if (CFG.hosts.length > 1) {
	host = discus.ask('Which host do you want to deploy to? ')
} else if (CFG.hosts.length == 1) {
	host = Q.resolve(CFG.hosts[0])
} else {
	host = Q.reject(new Error('No hosts defined'))
}

host
.then(function (host) {
	host = CFG.hosts[parseInt(host) - 1]
	if (!host)
		throw new Error('Invalid host')
	return host
})
//
// Done prompting for and validating host
//

//
// test that password-less connections are supported to host...
//
.then(function(host) {
	return ssh.shell('ssh -oBatchMode=yes ' + host.user + '@' + host.host + ' echo "true"')
	.then(function(output) {
		if ((output || '').trim() != 'true') {
			throw new Error('You need to setup passwordless SSH with this host before attempting to deploy to it (http://www.linuxproblem.org/art_9.html).')
		} else {
			return host
		}
	})

	return host
})

//
// 3) glob files...
//
.then(function (host) {
	var fileTypes = _.map(CFG.fileTypes, function(ft) { return './**/*.' + ft })

	// return [ host, promise(files) ]
	return [
		host,
		Q.all(_.map(fileTypes, function(ft) {
			return glob(ft)
		}))
		.then(function(results) {
			results = _.filter(_.flatten(results), function(path) {
				return path.indexOf('./deploy/') == -1
			})
			return results
		})
	]
})

//
// 4) confirm all information
//
.spread(function (host, files) {
	console.log()
	console.log('Please review the following information:')
	console.log()
	console.log('  HOST: ' + host.host)
	console.log('  FILES TO COPY:')
	console.log(_.map(files, function(f) { return '    ' + f }).join('\n'))
	console.log()

	return Q.all([ host, files, discus.confirm('Are you sure you want to continue? [Y/n]: ') ])
})

//
// 5) scp files to host
//
.spread(function (host, files) {
	// map the files to shell commands
	var result = Q()
	_.map(files, function(f) {
		result = result.then(function() {
			return ssh.scp(f, host)
		})
	})
	return result
})

//
// All done!
//
.then(function() {
	console.log('Done.')
})
.catch(function (e) {
	console.log(e.message)
})
