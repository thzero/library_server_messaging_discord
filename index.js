import Service from '@thzero/library_server/service/index.js';

// Discord rejects a message whose content is longer than this.
const MAX_CONTENT = 2000;
const TIMEOUT_MS = 5000;

class MessagingService extends Service {
	async message(correlationId, message, webhook) {
		const url = webhook ?? this._config.get('messaging.discord.webhook', null);
		// Nothing configured is not a failure: an app can ship the wiring and leave the
		// webhook unset in environments that should stay quiet.
		if (String.isNullOrEmpty(url))
			return this._success(correlationId);

		try {
			// See: https://discord.com/developers/docs/resources/webhook#execute-webhook
			const response = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content: this._truncate(message) }),
				signal: AbortSignal.timeout(this._timeoutMs())
			});
			if (!response.ok)
				return this._error('MessagingService', 'message', `Webhook answered ${response.status}.`, null, null, null, correlationId);

			this._logger.debug('MessagingService', 'message', 'External message sent to Discord.', null, correlationId);

			return this._success(correlationId);
		}
		catch (err) {
			return this._error('MessagingService', 'message', null, err, null, null, correlationId);
		}
	}

	_timeoutMs() {
		return Number(this._config.get('messaging.discord.timeoutMs', TIMEOUT_MS));
	}

	_truncate(message) {
		const content = String(message ?? '');
		return content.length > MAX_CONTENT ? content.slice(0, MAX_CONTENT - 1) + '…' : content;
	}
}

export default MessagingService;
