'use strict'

const bddStdin = require('bdd-stdin')
const expect = require('chai').expect
const parse = require('../lib').parseConfig

function rejectedConfig(promise, message) {
	return promise.then((conf) => {
		throw new Error(`Promise was unexpectedly fulfilled. Config: ${conf}`)
	}, (err) => expect(err.message).to.equal(message))
}

describe('deploy', () => {
	it('should error on an undefined config', () => {
		return rejectedConfig(parse({}, undefined), 'Must provide a configuration')
	})

	it('should error on an empty config', () => {
		return rejectedConfig(parse({}, {}), 'Must define a destination')
	})

	it('should error on a destination without a dest', () => {
		return rejectedConfig(parse({ alias: 'bad' }, {
			destinations: [ {
				alias: 'bad',
			} ],
		}), 'No destination found. Available aliases: bad')
	})

	it('should error on invalid alias', () => {
		return rejectedConfig(parse({ alias: 'invalid' }, {
			destinations: [ {
				alias: 'valid',
				dest: './dest',
			} ],
		}), 'No destination found. Available aliases: valid')
	})

	it('should allow a config with no destinations', () => {
		return parse({}, {
			dest: 'some-directory/',
			src: './test',
			args: [ '-r' ],
		}).then((conf) => {
			expect(conf).to.deep.equal({
				config: {
					args: [ '-r' ],
					dest: 'some-directory/',
					src: './test',
				},
				postHooks: [],
				preHooks: [],
			})
		})
	})

	it('should parse a normal config', () => {
		return parse({ alias: 'test' }, {
			destinations: [ {
				alias: 'test',
				args: [ '-a' ],
				dest: './temp',
				delete: true,
			} ],
		}).then((conf) => {
			expect(conf).to.deep.equal({
				config: {
					args: [ '-a' ],
					delete: true,
					dest: './temp',
					src: './',
				},
				postHooks: [],
				preHooks: [],
			})
		})
	})

	it('should replace generic config with destination-specific', () => {
		return parse({}, {
			destinations: {
				alias: 'spec',
				name: 'Specific',
				dest: '../backup',
				args: [ '-r', '--checksum' ],
			},
			args: '-a',
		}).then((conf) => {
			expect(conf).to.deep.equal({
				config: {
					args: [ '-r', '--checksum' ],
					dest: '../backup',
					src: './',
				},
				postHooks: [],
				preHooks: [],
			})
		})
	})

	it('should parse hooks from strings', () => {
		return parse({ alias: 'hooks' }, {
			destinations: {
				alias: 'hooks',
				dest: './nowhere',
				postHooks: "echo 'post'",
				preHooks: "echo 'pre'",
			},
			exclude: '.git*',
			postHooks: "echo 'last'",
			preHooks: "echo 'first'",
		}).then((conf) => {
			expect(conf).to.deep.equal({
				config: {
					args: [],
					dest: './nowhere',
					exclude: '.git*',
					src: './',
				},
				postHooks: [ "echo 'post'", "echo 'last'" ],
				preHooks: [ "echo 'first'", "echo 'pre'" ],
			})
		})
	})

	it('should parse hooks from arrays', () => {
		return parse({ alias: 'hooks' }, {
			destinations: {
				alias: 'hooks',
				dest: './somewhere',
				dryRun: true,
				postHooks: [ "echo 'post'" ],
				preHooks: [ "echo 'pre'" ],
			},
			postHooks: [ 'cat /tmp/post', "echo 'last'" ],
			preHooks: [ "echo 'first'", 'cat /tmp/pre' ],
		}).then((conf) => {
			expect(conf).to.deep.equal({
				config: {
					args: [],
					dest: './somewhere',
					dryRun: true,
					src: './',
				},
				postHooks: [ "echo 'post'", "cat /tmp/post", "echo 'last'" ],
				preHooks: [ "echo 'first'", "cat /tmp/pre", "echo 'pre'" ],
			})
		})
	})

	it('should prompt for a destination', () => {
		bddStdin(bddStdin.keys.down, '\n')
		return parse({}, {
			destinations: [ {
				alias: 'dest',
				name: 'First Destination',
			}, {
				alias: 'real',
				name: 'Real Destination',
				dest: './not-actually/a-real/path',
			} ],
		}).then((conf) => {
			expect(conf).to.deep.equal({
				config: {
					args: [],
					dest: './not-actually/a-real/path',
					src: './',
				},
				postHooks: [],
				preHooks: [],
			})
		})
	})

	it('should prompt for an argument set', () => {
		bddStdin(bddStdin.keys.down, bddStdin.keys.down, '\n')
		return parse({ prompt: true }, {
			dest: '/',
			src: './root',
		}).then((conf) => {
			expect(conf).to.deep.equal({
				config: {
					args: [],
					delete: true,
					dest: '/',
					dryRun: true,
					src: './root',
				},
				postHooks: [],
				preHooks: [],
			})
		})
	})
})
