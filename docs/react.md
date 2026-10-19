# React and Next.js

```tsx
"use client";
import { useRef } from "react";
import { TeleCall } from "@tele/call-ui/react";
import type { TeleCallElement } from "@tele/call-ui";

export function Room({ callId, isHost }: { callId: string; isHost: boolean }) {
  const ref = useRef<TeleCallElement | null>(null);
  return (
    <TeleCall
      ref={ref}
      style={{ height: "100dvh" }}
      lang="bn"
      layout="speaker"
      getJoin={() => fetch(`/api/calls/${callId}/join`, { method: "POST" }).then((r) => r.json())}
      loadChatHistory={(id) => fetch(`/api/calls/${id}/messages`).then((r) => r.json()).then((b) => b.messages)}
      setRecording={isHost ? (on) => fetch(`/api/calls/${callId}/recording/${on ? "start" : "stop"}`, { method: "POST" }) : undefined}
      onLeave={({ reason }) => location.assign(`/calls/${callId}?left=${reason}`)}
      onChat={(m) => !m.mine && bumpUnread()}
    />
  );
}
```

- The wrapper loads the element only in the browser, so server rendering and the Next.js App Router are safe. Mark the component `"use client"`.
- Props mirror the element: attributes (`features`, `lang`, `theme`, `layout`), properties (`getJoin`, `loadChatHistory`, `reportDiagnostic`, `setRecording`, `endForAll`, `strings`) and events as `onJoined`, `onLeave`, `onError`, `onParticipant`, `onChat`.
- `ref` gives you the element, so you can call `leave()`, `setMicrophone(on)` or `setCamera(on)`.
- `features` takes an array (`["lobby", "chat"]`) or the space-separated string.

## Reconnecting a page

Changing `getJoin` does not reconnect a live call. To join a different call, render a new `<TeleCall>` with a different `key`.
