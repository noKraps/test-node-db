require('dotenv').config();
const AMQP = require('./lib/AMQP');
const DBMS = require('./lib/DBMS');
const RMQ = new AMQP({
    queue: process.env.RMQ_INCOME_QUEUE_NAME,
    income_exchanges: {
        'node-db.income': {
            options: { durable: true },
            events: ['set', 'get', 'delete', 'clear']
        }
    },
    outcome_exchanges: {
        'node-db.outcome': {
            options: { durable: true },
            events: ['response']
        }
    }
});

(async () => {
    try {
        await DBMS.init();
        await RMQ.init();
    } catch (error) {
        console.error(error);
        return process.exit(1);
    }
})();
