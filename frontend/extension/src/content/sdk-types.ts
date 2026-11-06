// InboxSDK view types, derived from the public API so we don't import internal paths.
import type { InboxSDK } from "@inboxsdk/core";

type FirstArg<F> = F extends (arg: infer A) => unknown ? A : never;

export type { InboxSDK };
export type ComposeView = FirstArg<FirstArg<InboxSDK["Compose"]["registerComposeViewHandler"]>>;
export type MessageView = FirstArg<FirstArg<InboxSDK["Conversations"]["registerMessageViewHandler"]>>;
export type ThreadRowView = FirstArg<FirstArg<InboxSDK["Lists"]["registerThreadRowViewHandler"]>>;
