export class PageryError extends Error {
	public resolution?: string;
	constructor(message: string, resolution?: string) {
		super(message);
		this.name = 'PageryError';
		this.resolution = resolution;
	}
}
