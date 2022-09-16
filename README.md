# bh-rewards-bot

farms twitch rewards from brawlhalla dev streams

## Installation

install chrome

```text
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
```

install dependencies for puppeteer

```text
sudo apt-get install libnss3 libxss1 libasound2 libatk-bridge2.0-0 libgtk-3-0 libgbm-dev
```

install node modules

```text
npm i
```

### Screen Problems?

If you're having problems with screen, like `Cannot make directory '/run/screen: Permission denied'`, then run this:

```text
sudo /etc/init.d/screen-cleanup start
```

## Usage

Run `bash start.sh`. This starts a screen session called `bh_rewards`. If you don't want a screen session, just run `npm run start`.

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
