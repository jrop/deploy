var Q = require('q')

module.exports = {
	ask: function(q) {
		var d = Q.defer()

		var rl = require('readline').createInterface({
			input: process.stdin,
			output: process.stdout
		})
		rl.question(q, function(ans) {
			d.resolve(ans)
			rl.close()
		})

		return d.promise
	},

	confirm: function(q) {
		return this.ask(q)
		.then(function (resp) {
			if (resp == 'Y')
				return true
			else
				throw new Error('Operation aborted.')
		})
	}
}
