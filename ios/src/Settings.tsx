import { findByStoreName } from "@vendetta/metro";
import { useProxy } from "@vendetta/storage";
import { Forms } from "@vendetta/ui/components";

import { pluginStorage } from "./state";

const { FormInput, FormSection, FormSwitchRow, FormRow, FormText } = Forms;

export default function Settings() {
    useProxy(pluginStorage);

    const selected = findByStoreName("SelectedChannelStore");
    const currentChannelId = selected?.getChannelId?.() ?? "";

    return (
        <FormSection title="DraftTimer iOS" titleStyleType="no_border">
            <FormSwitchRow
                label="Enable automatic sending"
                subLabel="Sends the current non-empty draft every 61 seconds."
                value={!!pluginStorage.enabled}
                onValueChange={(value: boolean) => { pluginStorage.enabled = value; }}
            />
            <FormRow label="Use currently open channel" onPress={() => {
                if (currentChannelId) pluginStorage.channelId = currentChannelId;
            }} />
            <FormText>{currentChannelId ? `Current channel: ${currentChannelId}` : "Open a Discord channel first."}</FormText>
            <FormText>Allowed channel ID</FormText>
            <FormInput
                title=""
                value={pluginStorage.channelId ?? ""}
                onChange={(value: string) => { pluginStorage.channelId = value.replace(/\\D/g, "").slice(0, 20); }}
                style={{ marginTop: -20, marginHorizontal: 12 }}
            />
            <FormText>Only sends while Discord is open and this exact channel is selected. If iOS backgrounds Discord, missed sends are skipped.</FormText>
        </FormSection>
    );
}
