// CLI colours
export const CLI_COLOURS = {
	green: '\x1b[32m',
	turquoise: '\x1b[36m',
	blue: '\x1b[34m',
	grey: '\x1b[90m',
	yellow: '\x1b[33m',
	red: '\x1b[31m',
	RESET: '\x1b[0m',
};

export default class Log {
	private prefix: string;
	private enabled: boolean = true;

	constructor(prefix: string) {
		this.prefix = prefix;
	}

	// deno-lint-ignore no-explicit-any
	private log(func: (...data: any[]) => void, message: string) {
		if (!this.enabled) return;
		func(`${CLI_COLOURS.grey}${this.prefix}${CLI_COLOURS.RESET} ${message}${CLI_COLOURS.RESET}`);
	}

	setEnabled(enabled: boolean) {
		this.enabled = enabled;
	}

	debug(message: string) {
		this.log(console.log, `${CLI_COLOURS.grey}${message}`);
	}

	info(message: string) {
		this.log(console.info, `${CLI_COLOURS.blue}${message}`);
	}

	success(message: string) {
		this.log(console.info, `${CLI_COLOURS.green}${message}`);
	}

	error(message: string) {
		this.log(console.error, `${CLI_COLOURS.red}${message}`);
	}

	warn(message: string) {
		this.log(console.warn, `${CLI_COLOURS.yellow}${message}`);
	}
}
