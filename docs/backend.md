# Your backend

The element needs one thing from your backend: an endpoint that returns the Tele join response for the signed-in person. Your backend already has what it needs:

1. Your own session tells you who the person is.
2. You sign a short-lived Tele **user token** for them with your API secret.
3. You call `POST /v1/invites/{code}/join` (or `POST /v1/calls/{id}/join`) with that token and return the response body unchanged.

!!! warning "Keep the secret on the server"
    Never send the API secret or a service token to the browser. The user token only lives on your server for this request.

=== "Node"

    ```ts
    import { TeleSigner } from "@tele/node";

    const signer = new TeleSigner({ apiKey: process.env.TELE_API_KEY!, apiSecret: process.env.TELE_API_SECRET! });

    export async function POST(req: Request) {
      const user = await requireSession(req); // your auth
      const code = new URL(req.url).searchParams.get("code")!;
      const token = signer.userToken({ id: user.id, name: user.name, team: user.team }, 300);

      const res = await fetch(`${process.env.TELE_API_URL}/v1/invites/${encodeURIComponent(code)}/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "X-Client-Platform": "web" },
      });
      return new Response(res.body, { status: res.status, headers: { "Content-Type": "application/json" } });
    }
    ```

=== "Go"

    ```go
    func join(w http.ResponseWriter, r *http.Request) {
        user := requireSession(r) // your auth
        tok, _ := signer.UserToken(teletoken.User{ID: user.ID, Name: user.Name, Team: user.Team}, 5*time.Minute)

        req, _ := http.NewRequestWithContext(r.Context(), http.MethodPost,
            teleURL+"/v1/invites/"+url.PathEscape(r.URL.Query().Get("code"))+"/join", nil)
        req.Header.Set("Authorization", "Bearer "+tok)
        req.Header.Set("X-Client-Platform", "web")
        res, err := http.DefaultClient.Do(req)
        if err != nil {
            http.Error(w, "tele unavailable", http.StatusBadGateway)
            return
        }
        defer res.Body.Close()
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(res.StatusCode)
        io.Copy(w, res.Body)
    }
    ```

=== "Python"

    ```python
    @app.post("/api/tele/join")
    async def join(code: str, user=Depends(current_user)):
        token = tele_user_token(user.id, user.name, user.team, ttl=300)  # HS256 JWT, see the Tele guide
        r = await http.post(f"{TELE_API_URL}/v1/invites/{code}/join",
                            headers={"Authorization": f"Bearer {token}", "X-Client-Platform": "web"})
        return JSONResponse(r.json(), status_code=r.status_code)
    ```

## Errors

Return Tele's error body as is (`{"error": {"code": "...", "message": "..."}}`) and make `getJoin()` reject with the inner object:

```js
call.getJoin = () =>
  fetch(url, { method: "POST" }).then((r) => (r.ok ? r.json() : r.json().then((b) => Promise.reject(b.error))));
```

The element then shows a matching message. For example `too_early` becomes "This call isn't open yet." Every rejection also fires `tele-error` with `{ code, message }`.

## Optional endpoints

| Element property | Your endpoint calls | See |
|---|---|---|
| `loadChatHistory(callId)` | `GET /v1/calls/{id}/messages` | [Reference](reference.md#properties) |
| `reportDiagnostic(kind, body)` | `POST /v1/calls/{id}/diagnostics` | [Diagnostics](diagnostics.md) |
| `setRecording(on)` | `POST /v1/calls/{id}/recording/start` or `/stop` | [Host controls](host-controls.md) |
| `endForAll()` | `POST /v1/calls/{id}/end` | [Host controls](host-controls.md) |
