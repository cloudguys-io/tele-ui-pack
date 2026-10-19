// Thin React wrapper around <tele-call>. Properties are assigned on every render; events become callbacks.
// The element module is loaded in the browser only, so server rendering (Next.js) never evaluates Lit or
// LiveKit. Properties set before the element upgrades are kept by Lit and applied on upgrade.
import { createElement, forwardRef, useEffect, useImperativeHandle, useRef, type CSSProperties } from "react";
import type { TeleCallElement } from "./element.ts";
import type { ReportDiagnostic } from "./diagnostics.ts";
import type { Strings } from "./i18n.ts";
import type { Feature, HistoryMessage, JoinResponse, Layout, TeleEvents, Theme } from "./types.ts";

let loading: Promise<unknown> | null = null;
const load = () => (loading ??= import("./element.ts").then((m) => m.defineTeleCall()));

export type TeleCallProps = {
  getJoin: () => Promise<JoinResponse>;
  reportDiagnostic?: ReportDiagnostic;
  loadChatHistory?: (callId: string) => Promise<HistoryMessage[]>;
  setRecording?: (on: boolean) => Promise<unknown>;
  endForAll?: () => Promise<unknown>;
  strings?: Partial<Strings>;
  features?: Feature[] | string;
  lang?: string;
  theme?: Theme;
  layout?: Layout;
  className?: string;
  style?: CSSProperties;
  onJoined?: (d: TeleEvents["tele-joined"]) => void;
  onLeave?: (d: TeleEvents["tele-leave"]) => void;
  onError?: (d: TeleEvents["tele-error"]) => void;
  onParticipant?: (d: TeleEvents["tele-participant"]) => void;
  onChat?: (d: TeleEvents["tele-chat"]) => void;
};

const EVENTS = {
  "tele-joined": "onJoined", "tele-leave": "onLeave", "tele-error": "onError",
  "tele-participant": "onParticipant", "tele-chat": "onChat",
} as const;

export const TeleCall = forwardRef<TeleCallElement | null, TeleCallProps>(function TeleCall(props, forwarded) {
  const ref = useRef<TeleCallElement>(null);
  const latest = useRef(props);
  latest.current = props;
  useImperativeHandle(forwarded, () => ref.current!, []);

  // Assign before the element's next update so a no-lobby element sees getJoin straight away.
  const el = ref.current;
  if (el) assign(el, props);

  useEffect(() => {
    void load();
    const node = ref.current!;
    assign(node, latest.current);
    const off = Object.entries(EVENTS).map(([type, key]) => {
      const fn = (e: Event) => (latest.current[key] as ((d: unknown) => void) | undefined)?.((e as CustomEvent).detail);
      node.addEventListener(type, fn);
      return () => node.removeEventListener(type, fn);
    });
    return () => off.forEach((f) => f());
  }, []);

  const features = Array.isArray(props.features) ? props.features.join(" ") : props.features;
  return createElement("tele-call", {
    ref, class: props.className, style: props.style,
    ...(features != null ? { features } : {}),
    lang: props.lang ?? "en", theme: props.theme ?? "auto", layout: props.layout ?? "grid",
    suppressHydrationWarning: true,
  });
});

function assign(el: TeleCallElement, p: TeleCallProps) {
  el.getJoin = p.getJoin;
  el.reportDiagnostic = p.reportDiagnostic;
  el.loadChatHistory = p.loadChatHistory;
  el.setRecording = p.setRecording;
  el.endForAll = p.endForAll;
  el.strings = p.strings;
}

export type { TeleCallElement };
