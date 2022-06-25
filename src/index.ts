import Action from "./actions.js";
import { Scheduler } from "./schedule.js";

async function main() {
	const scheduler = new Scheduler();
	// i didn't want to make scheduler static, so this is the way
	Action.configure({scheduler: scheduler});
	console.log(`Brawlhalla is ${await scheduler.isStreaming()? '': 'not'} streaming.`);
	scheduler.startLoop();
}

main();
