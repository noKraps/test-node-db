require('dotenv').config();
const AMQP = require('./lib/AMQP');
const RMQ = new AMQP({
    queue: process.env.RMQ_OUTCOME_QUEUE_NAME,
    income_exchanges: {
        'node-db.outcome': {
            options: { durable: true },
            events: ['response']
        }
    }
});

(async () => {
    try {
        await RMQ.init();
    } catch (error) {
        console.error(error);
        return process.exit(1);
    }
})();
