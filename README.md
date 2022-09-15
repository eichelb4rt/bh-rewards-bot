# bh-rewards-bot

farms twitch rewards from brawlhalla dev streams

## Usage

To start the bot, just install all the dependencies (`npm i`) and run `bash start.sh`. This starts a screen session called `bh_rewards`.

## Configuration

`config.json`:

```text
{
    "os": "linux/windows",
    "mode": "farm/harvest/register/login",
    "debug": true/false,
    "headless": true/false,
    "once": true/false
}
```

headless: if the browser is headless. (default: true)
once: if the bots should only start once. (default: false)

---

`.env`:

```text
CLIENT_ID=<your client id>
CLIENT_SECRET=<your client secret>
```

This is your Twitch API key that is used to read Brawlhalla's schedule.

---

`users.json`:

```json
[
    {
        "name": "account1",
        "password": "password1",
        "registered": true,
        "blocked": false
    },
    {
        "name": "account2",
        "password": "password2",
        "registered": true,
        "blocked": false
    },
    {
        "name": "account3",
        "password": "password3",
        "registered": true,
        "blocked": false
    }
]
```

registered: if the account is registered yet / has granted permissions to the extensions yet. (default: true)
blocked: if the account is blocked by Brawlhalla and therefore cannot farm rewards. (default: false)

An account won't be used if it's either not registered or blocked.
