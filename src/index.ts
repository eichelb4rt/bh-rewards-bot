import Action from "./actions.js";
import Config from "./config.js";

async function main() {
	await Action.autoExecute(Config.mode);
}

main();
