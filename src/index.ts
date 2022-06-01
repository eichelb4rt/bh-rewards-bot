import Action from "./actions.js";
import Config from "./config.js";
import { isStreaming, Scheduler } from "./schedule.js";

const scheduler = new Scheduler();
async function main() {
	console.log(`Brawlhalla is ${await scheduler.isStreaming()? '': 'not'} streaming.`);
	scheduler.startLoop();
}

main();
