# Languages and labels

Every visible label comes from a dictionary. Two ship with the package:

| `lang` | Language |
|---|---|
| `en` | English (default) |
| `bn` | Bangla |

A region tag uses its language: `bn-BD` uses `bn`. An unknown language falls back to English.

```html
<tele-call lang="bn"></tele-call>
```

## Override labels

Set `strings` to replace any label, on top of the chosen language:

```js
call.strings = { exit: "Back to the dashboard", chatEmpty: "Say hello. Messages stay with the call." };
```

Some labels have placeholders in braces, for example `inCall` is `"{count} in call"` and `switchFailed` is `"Couldn't switch the {device}."`. Keep the placeholders in your text.

## Keys

The full list is the `Strings` type exported by the package. The ones people change most:

| Key | English |
|---|---|
| `readyToJoin` | Ready to join? |
| `joinCall` | Join call |
| `leave` | Leave |
| `exit` | Close |
| `chat` | Chat |
| `chatEmpty` | Messages are saved with the call. |
| `recording` | This call is being recorded |
| `tooEarly` | This call isn't open yet. |
| `joinFailed` | Couldn't join the call. |
| `endedRoomDeleted` | The call has ended. |

## Another language

Pass a full dictionary through `strings` (every key of `Strings`) and set `lang` to anything. To ship it for everyone, add it to `src/i18n.ts` and send a pull request.
