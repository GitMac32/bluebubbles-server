import { FileSystem } from "@server/fileSystem";
import { ActionHandler } from "@server/helpers/actions";
import { Server } from "@server/index";
import { MessageInterface } from "../http/api/v1/interfaces/messageInterface";

export type QueueItem = {
    type: string;
    data: any;
};

export class QueueService {
    items: QueueItem[] = [];

    isProcessing = false;

    async add(item: QueueItem) {
        if (this.isProcessing) {
            // If we are already processing, add item to the queue
            Server().log("QueueService is already working. Adding item to queue.", "debug");
            this.items.push(item);
        } else {
            // If we aren't processing, process the next item
            // This doesn't need to be awaited on
            this.process(item);
        }
    }

    private async process(item: QueueItem): Promise<void> {
        // Tell everyone we are currently processing
        this.isProcessing = true;
        Server().log(`Processing next item in the queue; Item type: ${item.type}`);

        // Handle the event
        try {
            Server().log(`Handling queue item, '${item.type}'`);
            switch (item.type) {
                case "open-chat":
                    await ActionHandler.openChat(item.data);
                    break;
                case "send-attachment":
                    // Send the attachment first
                    await MessageInterface.sendAttachmentSync(
                        item.data.chatGuid,
                        item.data.attachmentPath,
                        item.data.attachmentName,
                        item.data.attachmentGuid
                    );

                    // Then send the message (if required)
                    if (item.data.message && item.data.message.length > 0) {
                        await MessageInterface.sendMessageSync(
                            item.data.chatGuid,
                            item.data.message,
                            "apple-script",
                            null,
                            null,
                            null,
                            item.data.tempGuid
                        );
                    }

                    // After 30 minutes, delete the attachment chunks
                    setTimeout(() => {
                        FileSystem.deleteChunks(item.data.attachmentGuid);
                    }, 1000 * 60 * 30);
                    break;
                default:
                    Server().log(`Unhandled queue item type: ${item.type}`, "warn");
            }
        } catch (ex: any) {
            Server().log(`Failed to process queued item; Item type: ${item.type}`, "error");
            Server().log(ex.message);
        }

        // Check and see if there are any other items to process
        if (this.items.length > 0) {
            const nextItem: QueueItem = this.items.shift();
            await this.process(nextItem);
        } else {
            // If there are no other items to process, tell everyone
            // that we are finished processing
            this.isProcessing = false;
        }
    }
}
