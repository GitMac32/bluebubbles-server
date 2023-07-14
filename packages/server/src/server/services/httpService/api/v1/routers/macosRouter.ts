import { Next } from "koa";
import { RouterContext } from "koa-router";
import { MacOsInterface } from "@server/api/v1/interfaces/macosInterface";
import { Success } from "../responses/success";
import { ServerError } from "../responses/errors";
import { Server } from "@server";

export class MacOsRouter {
    static async lock(ctx: RouterContext, _: Next) {
        try {
            await MacOsInterface.lock();
            return new Success(ctx, { message: "Successfully executed lock command!" }).send();
        } catch (ex: any) {
            throw new ServerError({ message: "Failed to execute AppleScript!", error: ex?.message ?? ex.toString() });
        }
    }

    static async restartMessagesApp(ctx: RouterContext, _: Next) {
        try {
            const usePrivateApi = Server().repo.getConfig("enable_private_api") as boolean;
            const useDylib = Server().repo.getConfig("private_api_mode") as string === 'process-dylib';

            // If we're using the private api and process-injected dylib,
            // we need to restart the "managed" Messages process
            if (usePrivateApi && useDylib && Server().privateApiHelper.dylibProcess) {
                // Killing the dylib process will cause it to auto-restart.
                await Server().privateApiHelper.dylibProcess.kill(9);
            } else {
                await MacOsInterface.restartMessagesApp();
            }

            return new Success(ctx, { message: "Successfully restart the Messages App!" }).send();
        } catch (ex: any) {
            throw new ServerError({ message: "Failed to restart Messages App!", error: ex?.message ?? ex.toString() });
        }
    }
}
