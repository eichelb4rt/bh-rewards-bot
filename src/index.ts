import Action from "./actions.js";
import Config from "./config.js";
import { isStreaming, Scheduler } from "./schedule.js";

async function main() {
	console.log(`Brawlhalla is ${await isStreaming("brawlhalla")? '': 'not'} streaming.`);
	const scheduler = new Scheduler();
	console.log(await scheduler.getEvents());
	// console.log(await scheduler.timeUntilNextStream());
	await Action.autoExecute(Config.mode);
}

main();
