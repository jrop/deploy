var exec = require('child_process').exec
var path = require('path')
var Q = require('q')

module.exports = {
	//
	// Copy a file to the remote host, and make sure the parent directory exists
	//
	scp: function (f, host) {
		var destDir = /* host.user + '@' + host.host + ':' + */ path.join(host.dir, path.dirname(f))
		var dest = path.join(destDir, path.basename(f))

		var dirCmd = 'ssh ' + host.user + '@' + host.host + ' mkdir -p "' + destDir + '"'
		var scpCmd = 'scp ' + f + ' ' + host.user + '@' + host.host + ':' + dest
		var cmd = dirCmd + ' && ' + scpCmd
		return this.shell(cmd)
		.then(function() {
			console.log('Copied ' + f)
		})
	},

	//
	// promise-run shell command
	//
	shell: function (cmd) {
		return Q.nfcall(exec.bind(exec), cmd)
		.spread(function(stdout, stderr) {
			return stdout
		})
		.catch(function (e) {
			return null
		})
	}
}
