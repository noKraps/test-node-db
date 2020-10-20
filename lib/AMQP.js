const amqp = require('amqplib');
const DBMS = require('./DBMS');

const CONN_URL = `amqp://${process.env.RMQ_USERNAME}:
                         ${process.env.RMQ_PASSWORD}@
                         ${process.env.RMQ_HOST}:
                         ${process.env.RMQ_PORT}`.replace(/\n|\s/gm, '');

class AMQP {
	constructor({ queue = '', income_exchanges = {}, outcome_exchanges = {} }) {
		this.income_exchanges = income_exchanges;
		this.outcome_exchanges = outcome_exchanges;
		this.queue = queue;

		process.on('exit', () => {
			this.channel ? this.channel.close() : null;
			console.log(`Closing rabbitmq channel`);
		});
	}

	async init() {
		if (!this.income_exchanges) {
			throw 'You didn\'t specify income exchanges';
		}

		let interval = 1000;
		while (!this.conn) {
			try {
				this.conn = await amqp.connect(CONN_URL);
			} catch (e) {
				console.error("Problem connecting to RMQ\n", e.message);
				await new Promise(done => setTimeout(() => done(), interval));
				interval = interval >= 60000 ? 60000 : interval * 2;
			}
		}

		this.channel = await this.conn.createChannel();
		await this.channel.assertQueue(this.queue, { exclusive: false, durable: true });

		for (const [exchange, {options, events}] of Object.entries(this.income_exchanges)) {
			this.channel.assertExchange(exchange, 'direct', options);
			events.forEach(event => this.channel.bindQueue(this.queue.queue, exchange, event));
		}

		this.channel.consume(
			this.queue,
			async msg => {
				try {
					const response = await this._switcher(msg);
					await this.produce({ response });
				} catch (error) {
					console.error(error);
					this.channel.nack(msg);
				}

				return await this.channel.ack(msg);
			},
			{ ack: true, prefetchCount: 1 }
		);

		this.conn.on('error', () => {
			console.error('Lost connection to RMQ.  Reconnecting...');
			this.conn = null;
			return setTimeout(this.init.bind(this), 1000);
		});
	}

	async _switcher(event) {
		let result;
		let encoded;
		const key = event.fields.routingKey;

		try {
			encoded = JSON.parse(event.content.toString());
		} catch (error) {
			return { response: 'Message format is not valid' }
		}

		switch (key) {
			case 'set':
				result = DBMS.set.bind(DBMS);
				break;
			case 'get':
				result = DBMS.get.bind(DBMS);
				break;
			case 'delete':
				result = DBMS.delete.bind(DBMS);
				break;
			case 'clear':
				result = DBMS.clear.bind(DBMS);
				break;
			case 'response':
				result = () => {
					console.log(JSON.stringify(encoded, null, 4));
				};
				break;

			default:
				result = () => {
					console.log(`Event ${key} handler is not specified`);
				};
				break;
		}

		return await result(encoded);
	}

	async assertConnection() {
		if(!this.conn || !this.channel) {
			await this.init();
		}
	}

	async produce(data, event = 'response') {
		if (!this.outcome_exchanges) {
			console.log('You didn\'t specify outcome exchanges');
			return false;
		}

		await this.assertConnection();
		for (const [exchange, { options }] of Object.entries(this.outcome_exchanges)) {
			const encodedString = JSON.stringify(data);
			this.channel.assertExchange(exchange, 'direct', options);
			this.channel.publish(exchange, event, Buffer.from(encodedString));
		}
	}
}

module.exports = AMQP;
