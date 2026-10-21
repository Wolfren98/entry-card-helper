# Entry Card Helper 1.2.2

Chrome extension source. This folder is the latest package (`manifest.json` version `1.2.2`).

The site in the repository root is separate. Do not treat `worker.js` as the extension.

## Next task

Add opt-in autofill. Default off.

- The user must turn it on before any passport, ticket, or hotel detail is saved.
- Save only in `chrome.storage.local`. Do not upload those details.
- Fill empty fields on the official site. Do not press submit.
- Start with Thailand TDAC. The other official forms differ, so do not guess their fields.

## Run

Load this `extension` folder in Chrome at `chrome://extensions` with Developer mode, then Load unpacked.
