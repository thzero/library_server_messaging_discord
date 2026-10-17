import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import '@thzero/library_common/utility/string.js';
import MessagingService from '../index.js';

const inject = (target, name, value) => {
	Object.defineProperty(target, name, { value, writable: true, configurable: true });
	return target;
};

const newLogger = () => {
	const entries = { debug: [], error: [], exception: [] };
	return {
		entries,
		info() {}, info2() {}, warn() {}, warn2() {}, fatal() {}, trace() {},
		debug(clazz, method, message, data, correlationId) { entries.debug.push({ clazz, method, message, correlationId }); },
		error(clazz, method, message, data, correlationId) { entries.error.push({ clazz, method, message, correlationId }); },
		exception(clazz, method, err, correlationId) { entries.exception.push({ clazz, method, err, correlationId }); }
	};
};

// Answers like node-config through ConfigService: the default for a missing key.
const newConfig = (values) => ({ get: (key, defaultValue) => (key in values ? values[key] : defaultValue) });

const fetchOriginal = globalThis.fetch;

let service;
let logger;
let posted;
let answer;

beforeEach(() => {
	service = new MessagingService();
	logger = newLogger();
	posted = [];
	answer = async () => ({ ok: true, status: 204 });
	inject(service, '_logger', logger);
	inject(service, '_config', newConfig({ 'messaging.discord.webhook': 'https://discord.test/hook' }));
	globalThis.fetch = async (url, options) => {
		posted.push({ url, options, body: JSON.parse(options.body) });
		return answer();
	};
});

afterEach(() => {
	globalThis.fetch = fetchOriginal;
});

describe('message', () => {
	it('posts the text to the configured webhook', async () => {
		const response = await service.message('cid', 'hello');
		assert.equal(service._hasSucceeded(response), true);
		assert.equal(posted.length, 1);
		assert.equal(posted[0].url, 'https://discord.test/hook');
		assert.equal(posted[0].options.method, 'POST');
		assert.deepEqual(posted[0].body, { content: 'hello' });
	});

	it('posts to the webhook it is handed instead of the configured one', async () => {
		await service.message('cid', 'hello', 'https://discord.test/other');
		assert.equal(posted[0].url, 'https://discord.test/other');
	});

	// Regression: node-config throws on a missing key, so reading the webhook without a
	// default turned "not configured" into an exception in every caller.
	it('does nothing, successfully, when no webhook is configured', async () => {
		inject(service, '_config', newConfig({}));
		const response = await service.message('cid', 'hello');
		assert.equal(service._hasSucceeded(response), true);
		assert.equal(posted.length, 0);
	});

	it('cuts the content to what Discord accepts', async () => {
		await service.message('cid', 'x'.repeat(5000));
		assert.equal(posted[0].body.content.length, 2000);
	});

	it('returns a failed response when Discord refuses', async () => {
		answer = async () => ({ ok: false, status: 429 });
		const response = await service.message('cid-123', 'hello');
		assert.equal(service._hasFailed(response), true);
		assert.equal(response.correlationId, 'cid-123');
		assert.ok(logger.entries.error.some(entry => entry.message.includes('429')));
	});

	it('fails rather than throws when the request does', async () => {
		answer = async () => { throw new Error('discord is down'); };
		const response = await service.message('cid-123', 'hello');
		assert.equal(service._hasFailed(response), true);
		assert.equal(response.correlationId, 'cid-123');
		assert.equal(logger.entries.exception.length, 1);
		assert.equal(logger.entries.exception[0].correlationId, 'cid-123');
		assert.equal(logger.entries.exception[0].method, 'message');
	});
});
