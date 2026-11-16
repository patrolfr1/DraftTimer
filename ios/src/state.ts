import { storage } from "@vendetta/plugin";

export const pluginStorage = storage as {
    enabled?: boolean;
    channelId?: string;
};

pluginStorage.enabled ??= false;
pluginStorage.channelId ??= "";
