# Screenshots

Ten PNGs — five screens × light and dark — generated from
`docs/mockups/screens.html`, which styles a static mockup with the app's real
design tokens (`packages/ui/styles/tokens.css`). Change a token and the shots
follow on the next run.

They are mockups, not captures of a running build: no keys, no real provider
traffic, and the sample Slack, Jira and email text is invented.

## Regenerate

```sh
node docs/mockups/shoot.mjs
```

Needs Chromium from the repo's Playwright install (`pnpm exec playwright install chromium`
if it has not been fetched yet). Output is 2× device scale.

| File                       | Screen                                                  |
| -------------------------- | ------------------------------------------------------- |
| `popup-palette-*.png`      | Global-hotkey popup over Slack, command list open       |
| `popup-result-*.png`       | Streamed answer for a Jira comment, with the action bar |
| `settings-general-*.png`   | Settings shell and the General page                     |
| `settings-history-*.png`   | Local history with retention controls                   |
| `settings-providers-*.png` | Provider cards: keys, endpoints, health                 |

## README / Product Hunt markdown

```md
![Popup over Slack](docs/screenshots/popup-palette-light.png)
![Answer streaming back](docs/screenshots/popup-result-dark.png)
![Providers](docs/screenshots/settings-providers-light.png)
![History](docs/screenshots/settings-history-dark.png)
```

Product Hunt wants 1270×760 or wider; every shot here is at least 1000 px wide
before the 2× scale, so upload as-is.
