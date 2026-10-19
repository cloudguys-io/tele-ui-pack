import { defineTeleCall } from "./element.ts";

defineTeleCall();

export { TeleCallElement, defineTeleCall } from "./element.ts";
export { CallSession, endReasonOf } from "./session.ts";
export { reduce, initialState, type Phase, type State, type Action } from "./state.ts";
export { DICTIONARIES, dictionary, type Strings, type StringKey } from "./i18n.ts";
export { captureDiagnostics, type ReportDiagnostic } from "./diagnostics.ts";
export * from "./types.ts";
