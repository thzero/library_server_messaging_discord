![GitHub package.json version](https://img.shields.io/github/package-json/v/thzero/library_server_messaging_discord)
![David](https://img.shields.io/david/thzero/library_server_messaging_discord)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# library_server_messaging_discord

Posts messages to a Discord channel from [@thzero/library_server](https://github.com/thzero/library_server), through a channel webhook.

Intended for operational notices: a job failed, a connection dropped, a threshold was crossed. It is not a chat integration and does not receive anything from Discord. The Slack counterpart is [library_server_messaging_slack](https://github.com/thzero/library_server_messaging_slack).

## Requirements

### NodeJs

[NodeJs](https://nodejs.org) version 22+

### Discord

A webhook on the channel you want to post to:

* In the channel's settings, open **Integrations**, then **Webhooks**
* Create a webhook and copy its URL (`https://discord.com/api/webhooks/<id>/<token>`)

Anyone holding the URL can post to the channel, so treat it as a secret.

### Installation

[![NPM](https://nodei.co/npm/@thzero/library_server_messaging_discord.png?compact=true)](https://npmjs.org/package/@thzero/library_server_messaging_discord)

```
npm install @thzero/library_server_messaging_discord
```

#### Peer dependencies

* `@thzero/library_common`
* `@thzero/library_common_service`
* `@thzero/library_server`

## What it provides

`index.js`: default export `MessagingService`, extending `Service`.

| Method | Purpose |
|---|---|
| `message(correlationId, message, webhook)` | Posts `message` to `webhook`, or to `messaging.discord.webhook` when `webhook` is not given. Content longer than Discord's 2000 character limit is cut to fit. Returns a success response, or an error response carrying the correlationId when Discord refuses it or does not answer in time. |

`message` never throws. A Discord outage produces a failed, logged response rather than taking down the caller.

With no webhook configured it posts nothing and returns success, so an app can keep the wiring in place and leave the webhook unset where it should stay quiet.

## Configuration

```json
{
    "app": {
        "messaging": {
            "discord": {
                "webhook": "https://discord.com/api/webhooks/<id>/<token>",
                "timeoutMs": 5000
            }
        }
    }
}
```

| Key | Default | |
|---|---|---|
| `messaging.discord.webhook` | none | Where messages go. Unset means nothing is posted. |
| `messaging.discord.timeoutMs` | `5000` | How long to wait for Discord before giving up. |

Keep the webhook out of source control: supply it from an environment variable through `config/custom-environment-variables.json`, the same way the database connection is handled.

## Wiring it up

Register it with the injector from `_initServices` in your `BootMain` derived class, or from a boot plugin's `_initServices`, then resolve it where you need it:

```js
const serviceMessaging = injector.getService(AppConstants.InjectorKeys.SERVICE_MESSAGING_DISCORD);
await serviceMessaging.message(correlationId, `Deploy ${version} completed.`);
```

To post to more than one channel, pass that channel's webhook as the third argument.

## Development

```
npm run lint       # eslint .
npm run lint:fix   # eslint . --fix
npm test           # node --test "test/*.test.js"
```
