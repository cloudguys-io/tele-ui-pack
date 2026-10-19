# Browser support

The element targets current versions of these browsers:

| Browser | Notes |
|---|---|
| Chrome, Edge (desktop and Android) | Calls, chat and screen share |
| Firefox | Calls, chat and screen share |
| Safari 16.4 and later (macOS) | Calls, chat and screen share |
| Safari on iPhone and iPad | Calls and chat. iOS browsers cannot share the screen: the button shows "Couldn't share your screen.", so leave `screenshare` out of `features` on phones if you prefer |

!!! note "Test status"
    Automated tests cover the call logic, and joins have been checked in Chromium on desktop. Check Firefox, Safari and iPhone with your own app before you rely on them.

## iPhone

- **Keep the lobby on.** iOS Safari only asks for camera and microphone reliably after a tap, and the lobby's **Join call** button is that tap. The lobby asks for both at once.
- **Links opened inside other apps** (mail, chat apps) often open an in-app browser without camera access. When the browser offers no camera or microphone at all, the lobby says so and suggests opening the link in Safari or Chrome; the person can still join to listen and chat.
- **Sound**: if the browser blocks audio until the page is tapped, the element shows a button to turn call audio on.

## Restrictive networks

The join response carries `ice_servers` with relay (TURN) servers, which the element passes to the media connection. Calls work behind most corporate firewalls without extra setup.
