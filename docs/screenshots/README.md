# Screenshots

Twenty PNGs — ten screens × light and dark — generated from
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

| File                       | Screen                                                      |
| -------------------------- | ----------------------------------------------------------- |
| `popup-palette-*.png`      | Popup over Slack: context chip, action cards, command list  |
| `popup-result-*.png`       | Streamed answer for a Jira comment, with the action bar     |
| `popup-vscode-*.png`       | Popup over VS Code on a stack trace, Explain leading        |
| `popup-jira-*.png`         | Popup over a Jira ticket, Jira Comment leading              |
| `context-chip-*.png`       | The context engine on GitHub, cropped to the chip and cards |
| `settings-general-*.png`   | Settings shell and the General page                         |
| `settings-history-*.png`   | Local history with retention controls                       |
| `settings-providers-*.png` | Provider cards: keys, endpoints, health                     |
| `settings-prompts-*.png`   | Prompt library, grouped by workflow, with shortcuts         |
| `settings-shortcuts-*.png` | Global accelerators, per-template shortcuts, popup keys     |

## README / Product Hunt markdown

```md
![Popup over Slack](docs/screenshots/popup-palette-light.png)
![Explaining a stack trace in VS Code](docs/screenshots/popup-vscode-dark.png)
![Answer streaming back](docs/screenshots/popup-result-dark.png)
![The context engine on GitHub](docs/screenshots/context-chip-light.png)
![Prompt library](docs/screenshots/settings-prompts-light.png)
![Providers](docs/screenshots/settings-providers-light.png)
```

Product Hunt wants 1270×760 or wider; every shot here is at least 1000 px wide
before the 2× scale, so upload as-is.
