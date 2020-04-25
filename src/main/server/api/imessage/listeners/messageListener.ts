import { DatabaseRepository } from "@server/api/imessage";
import { Message } from "@server/api/imessage/entity/Message";
import { ChangeListener } from "./changeListener";

export class MessageListener extends ChangeListener {
    repo: DatabaseRepository;

    frequencyMs: number;

    constructor(
        repo: DatabaseRepository,
        pollFrequency: number
    ) {
        super(pollFrequency);

        this.repo = repo;
        this.frequencyMs = pollFrequency;
    }

    async getEntries(): Promise<number> {
        const entries = await this.repo.getMessages(
            null,
            0,
            1000,
            this.lastCheck
        );
        // Emit the new message
        entries.forEach((entry: any) => {
            // Skip over any that we've finished
            if (this.emittedItems.includes(entry.ROWID)) return;

            // Add to cache
            this.emittedItems.push(entry.ROWID);

            // Send the built message object
            super.emit("new-entry", this.transformEntry(entry));
        });

        return entries.length;
    }

    // eslint-disable-next-line class-methods-use-this
    transformEntry(entry: Message) {
        return entry;
    }
}
