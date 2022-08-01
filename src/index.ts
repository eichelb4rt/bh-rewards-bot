import Action from "./actions.js";
import Config from "./config.js";
import { Scheduler } from "./schedule.js";

async function main() {
	// i didn't want to make scheduler static, so this is the way
	const scheduler = new Scheduler();
	console.log(`Brawlhalla is ${await scheduler.isStreaming()? '': 'not'} streaming.`);
	Action.configure({scheduler: scheduler});
	if (Config.once) {
		await Action.autoExecute();
	} else {
		scheduler.startLoop();
	}
}

main();
