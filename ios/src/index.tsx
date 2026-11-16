import { findByProps, findByStoreName } from "@vendetta/metro";
import { ReactNative } from "@vendetta/metro/common";
import { showToast } from "@vendetta/ui/toasts";

import Settings from "./Settings";
import { pluginStorage } from "./state";

const INTERVAL_MS = 61_000;
const CHANNEL_ID = /^\\d{17,20}$/;

let timer: ReturnType<typeof setInterval> | undefined;
let appStateSubscription: { remove: () => void } | undefined;
let appActive = true;
let nextDue = 0;
let sending = false;

function getCurrentChannelId(): string | undefined {
    try {
        return findByStoreName("SelectedChannelStore")?.getChannelId?.();
    } catch {
        return undefined;
    }
}

function getDraft(channelId: string): string {
    try {
        const store = findByStoreName("DraftStore") ?? findByProps("getDraft");
        const draft = store?.getDraft?.(channelId, 0);
        return typeof draft === "string" ? draft : "";
    } catch {
        return "";
    }
}

function stopTimer() {
    if (timer) clearInterval(timer);
    timer = undefined;
    if (appStateSubscription) appStateSubscription.remove();
    appStateSubscription = undefined;
}

async function tick() {
    if (!pluginStorage.enabled || !appActive || sending) return;

    const channelId = String(pluginStorage.channelId ?? "");
    if (!CHANNEL_ID.test(channelId) || getCurrentChannelId() !== channelId) return;

    const now = Date.now();
    if (!nextDue) {
        nextDue = now + INTERVAL_MS;
        return;
    }
    if (now < nextDue) return;

    // Never catch up after a delayed/suspended timer.
    const lateBy = now - nextDue;
    nextDue = now + INTERVAL_MS;
    if (lateBy > 2_000) return;

    const content = getDraft(channelId);
    if (!content.replace(/[\\u200b\\ufeff]/g, "").trim()) return;

    const actions = findByProps("sendMessage", "editMessage");
    if (typeof actions?.sendMessage !== "function") {
        showToast("DraftTimer: Discord send API unavailable");
        pluginStorage.enabled = false;
        return;
    }

    sending = true;
    try {
        await actions.sendMessage(
            channelId,
            {
                content,
                tts: false,
                invalidEmojis: [],
                validNonShortcutEmojis: [],
            },
            undefined,
            {},
        );

        // Confirm the draft was consumed before allowing another automatic send.
        setTimeout(() => {
            const remaining = getDraft(channelId);
            if (remaining === content) {
                pluginStorage.enabled = false;
                showToast("DraftTimer stopped: send wasn't confirmed.");
            }
            sending = false;
        }, 1_500);
    } catch (error) {
        pluginStorage.enabled = false;
        sending = false;
        showToast("DraftTimer stopped: message couldn't be sent.");
        console.error("[DraftTimer]", error);
    }
}

export default {
    onLoad() {
        appActive = ReactNative.AppState?.currentState === "active";
        nextDue = 0;
        timer = setInterval(() => { void tick(); }, 500);

        appStateSubscription = ReactNative.AppState?.addEventListener("change", (state: string) => {
            appActive = state === "active";
            // Returning from background starts a fresh 61-second interval.
            nextDue = appActive ? Date.now() + INTERVAL_MS : 0;
        });

        if (pluginStorage.enabled) {
            showToast("DraftTimer loaded. Automatic sending is enabled.");
        }
    },
    onUnload() {
        stopTimer();
        sending = false;
        nextDue = 0;
    },
    settings: Settings,
};
