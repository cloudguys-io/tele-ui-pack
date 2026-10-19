// Every user-visible label. Placeholders look like {name}. No em or en dashes in any language.
const en = {
  readyToJoin: "Ready to join?",
  joinCall: "Join call",
  joining: "Joining the call...",
  micOn: "Mic on",
  micOff: "Mic off",
  cameraOn: "Camera on",
  cameraOff: "Camera off",
  cameraIsOff: "Camera is off",
  noMediaSupport: "This browser can't use your camera or microphone. If you opened the link inside another app, open it in Safari or Chrome instead. You can still join to listen and chat.",
  deviceProblem: "Couldn't access your {devices}. Allow access in your browser and iPhone Settings for this site, close other apps using the microphone, then tap Try again. You can still join without it.",
  deviceMicrophone: "microphone ({error})",
  deviceCamera: "camera ({error})",
  and: " and ",
  tryAgain: "Try again",
  rejoin: "Rejoin",
  exit: "Close",
  limitedDevices: "Joined with limited devices. Use the arrows beside the buttons to pick inputs.",
  micUnavailableJoined: "Microphone unavailable. You joined muted.",
  cameraUnavailableJoined: "Camera unavailable. You joined without video.",
  micUnavailable: "Microphone unavailable.",
  cameraUnavailable: "Camera unavailable.",
  screenShareFailed: "Couldn't share your screen.",
  reconnecting: "Reconnecting...",
  inCall: "{count} in call",
  recording: "This call is being recorded",
  enableAudio: "Click to turn on call audio",
  audioBlocked: "Audio playback is still blocked. Check this browser's sound permissions and try again.",
  mute: "Mute",
  unmute: "Unmute",
  cameraTurnOff: "Turn camera off",
  cameraTurnOn: "Turn camera on",
  micSettings: "Microphone and speaker settings",
  cameraSettings: "Camera settings",
  shareScreen: "Share screen",
  stopSharing: "Stop sharing",
  chat: "Chat",
  leave: "Leave",
  record: "Record",
  stopRecording: "Stop recording",
  endForAll: "End for all",
  confirmEndForAll: "End the call for everyone?",
  you: "You",
  youSuffix: " (you)",
  screenSuffix: ", screen",
  mutedSuffix: " · muted",
  chatEmpty: "Messages are saved with the call.",
  message: "Message",
  send: "Send",
  microphone: "Microphone",
  speaker: "Speaker",
  camera: "Camera",
  switchFailed: "Couldn't switch the {device}.",
  endedRoomDeleted: "The call has ended.",
  endedDuplicate: "You joined this call from another window, so this one was disconnected.",
  endedRemoved: "You were removed from the call.",
  endedJoinFailure: "Couldn't connect to the call.",
  endedDisconnected: "You were disconnected.",
  endedLeft: "You left the call.",
  tooEarly: "This call isn't open yet.",
  joinFailed: "Couldn't join the call.",
};

export type Strings = typeof en;
export type StringKey = keyof Strings;

const bn: Strings = {
  readyToJoin: "যোগ দিতে প্রস্তুত?",
  joinCall: "কলে যোগ দিন",
  joining: "কলে যোগ দেওয়া হচ্ছে...",
  micOn: "মাইক চালু",
  micOff: "মাইক বন্ধ",
  cameraOn: "ক্যামেরা চালু",
  cameraOff: "ক্যামেরা বন্ধ",
  cameraIsOff: "ক্যামেরা বন্ধ আছে",
  noMediaSupport: "এই ব্রাউজার আপনার ক্যামেরা বা মাইক্রোফোন ব্যবহার করতে পারছে না। অন্য কোনো অ্যাপের ভেতরে লিংকটি খুলে থাকলে Safari বা Chrome এ খুলুন। তবুও আপনি যোগ দিয়ে শুনতে ও চ্যাট করতে পারবেন।",
  deviceProblem: "আপনার {devices} ব্যবহার করা যায়নি। ব্রাউজার ও iPhone এর Settings এ এই সাইটকে অনুমতি দিন, মাইক্রোফোন ব্যবহার করছে এমন অন্য অ্যাপ বন্ধ করুন, তারপর আবার চেষ্টা করুন চাপুন। এটি ছাড়াও আপনি যোগ দিতে পারবেন।",
  deviceMicrophone: "মাইক্রোফোন ({error})",
  deviceCamera: "ক্যামেরা ({error})",
  and: " ও ",
  tryAgain: "আবার চেষ্টা করুন",
  rejoin: "আবার যোগ দিন",
  exit: "বন্ধ করুন",
  limitedDevices: "সীমিত ডিভাইস নিয়ে যোগ দিয়েছেন। ইনপুট বাছতে বোতামের পাশের তীর ব্যবহার করুন।",
  micUnavailableJoined: "মাইক্রোফোন পাওয়া যাচ্ছে না। আপনি মিউট অবস্থায় যোগ দিয়েছেন।",
  cameraUnavailableJoined: "ক্যামেরা পাওয়া যাচ্ছে না। আপনি ভিডিও ছাড়া যোগ দিয়েছেন।",
  micUnavailable: "মাইক্রোফোন পাওয়া যাচ্ছে না।",
  cameraUnavailable: "ক্যামেরা পাওয়া যাচ্ছে না।",
  screenShareFailed: "স্ক্রিন শেয়ার করা যায়নি।",
  reconnecting: "আবার সংযোগ করা হচ্ছে...",
  inCall: "কলে {count} জন",
  recording: "এই কলটি রেকর্ড করা হচ্ছে",
  enableAudio: "কলের শব্দ চালু করতে ক্লিক করুন",
  audioBlocked: "শব্দ এখনো বন্ধ আছে। এই ব্রাউজারের সাউন্ড অনুমতি দেখে আবার চেষ্টা করুন।",
  mute: "মিউট",
  unmute: "আনমিউট",
  cameraTurnOff: "ক্যামেরা বন্ধ করুন",
  cameraTurnOn: "ক্যামেরা চালু করুন",
  micSettings: "মাইক্রোফোন ও স্পিকার সেটিংস",
  cameraSettings: "ক্যামেরা সেটিংস",
  shareScreen: "স্ক্রিন শেয়ার",
  stopSharing: "শেয়ার বন্ধ করুন",
  chat: "চ্যাট",
  leave: "বের হন",
  record: "রেকর্ড",
  stopRecording: "রেকর্ড বন্ধ করুন",
  endForAll: "সবার জন্য শেষ করুন",
  confirmEndForAll: "সবার জন্য কলটি শেষ করবেন?",
  you: "আপনি",
  youSuffix: " (আপনি)",
  screenSuffix: ", স্ক্রিন",
  mutedSuffix: " · মিউট",
  chatEmpty: "বার্তাগুলো কলের সাথে সংরক্ষিত থাকে।",
  message: "বার্তা",
  send: "পাঠান",
  microphone: "মাইক্রোফোন",
  speaker: "স্পিকার",
  camera: "ক্যামেরা",
  switchFailed: "{device} বদলানো যায়নি।",
  endedRoomDeleted: "কলটি শেষ হয়েছে।",
  endedDuplicate: "আপনি অন্য একটি উইন্ডো থেকে এই কলে যোগ দিয়েছেন, তাই এটির সংযোগ বিচ্ছিন্ন হয়েছে।",
  endedRemoved: "আপনাকে কল থেকে সরিয়ে দেওয়া হয়েছে।",
  endedJoinFailure: "কলে সংযোগ করা যায়নি।",
  endedDisconnected: "আপনার সংযোগ বিচ্ছিন্ন হয়েছে।",
  endedLeft: "আপনি কল থেকে বের হয়েছেন।",
  tooEarly: "এই কলটি এখনো খোলেনি।",
  joinFailed: "কলে যোগ দেওয়া যায়নি।",
};

export const DICTIONARIES: Record<string, Strings> = { en, bn };

// Picks a dictionary for a BCP 47 tag ("bn-BD" uses "bn"), then applies any per-key overrides.
export function dictionary(lang: string | null | undefined, overrides?: Partial<Strings>): Strings {
  const base = (lang && (DICTIONARIES[lang] ?? DICTIONARIES[lang.split("-")[0].toLowerCase()])) || en;
  return overrides ? { ...base, ...overrides } : base;
}

export function format(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

// Text that is either a dictionary key (re-rendered when lang changes) or raw text from the server.
export type Text = { key: StringKey; vars?: Record<string, string | number> } | { raw: string };

export function render(s: Strings, text: Text | null | undefined): string {
  if (!text) return "";
  return "raw" in text ? text.raw : format(s[text.key], text.vars);
}
