const fsAsync = require('fs').promises;
const zlib = require('zlib');

const { resolve } = require('path');
const { promisify } = require('util');

const unzip = promisify(zlib.unzip);
const deflate = promisify(zlib.deflate);

class DBMS {
    /**
     * Create a new JSON database or initialize an exisiting database based on the log.
     *
     * @example
     * const DBMS = require('DBMS');
     */
    constructor() {
        this.db = {};
        this.basePath = './bin'
        this.logPath = `${this.basePath}/dbLog.json`;
        this.snapshotPath = `${this.basePath}/snapshots`;
    }

    async init() {
        try {
            console.log('Attempt to create default folders');
            await fsAsync.mkdir(resolve(process.cwd(), this.basePath));
        } catch (error) {
            console.log(`Folder ${this.basePath} already exist`);
        }
//
        try {
            await fsAsync.mkdir(resolve(process.cwd(), this.snapshotPath));
        } catch (error) {
            console.log(`Folder ${this.snapshotPath} already exist`);
        }

        try {
            const log = await fsAsync.readFile(resolve(process.cwd(), this.logPath));
            const parsed = JSON.parse(log.toString());

            // Restore DB
            for (const { type, key, value } of parsed) {
                switch (type) {
                    case 'set': await this.set({key, value}); break;
                    case 'delete': await this.delete({key}); break;
                    case 'clear': await this.clear(); break;
                }
            }
        } catch (error) {
            if (error.code.toUpperCase() === "ENOENT") console.log('The DB does not require recovery');
            else console.log(error);
        }


        // setup snapshotting
        setInterval(async () => {
            const timestamp = ~~(Date.now() / 1000);

            try {
                const encode = await deflate(JSON.stringify(this.db));
                await fsAsync.writeFile(`${resolve(process.cwd(), this.snapshotPath)}/RDB-${timestamp}`, `${encode}`);
            } catch (error) {
                console.error(`Snapshot "RDB-${timestamp}" was failed!`)
            }
        }, (process.env.SNAPSHOT_INTERVAL_MINUTES * 60000));
    }

    async log(type, key, value = undefined) {
        let log;
        let operation = [{ type, key, value }];
        try {
            log = await fsAsync.readFile(resolve(process.cwd(), this.logPath));

            const parsed = JSON.parse(log.toString());
            await fsAsync.writeFile(resolve(process.cwd(), this.logPath), JSON.stringify(parsed.concat(operation)));
        } catch (error) {
            console.error(error);
            console.log('Attempt to create log file');
            await fsAsync.writeFile(resolve(process.cwd(), this.logPath), JSON.stringify(operation));
        }
    }

    /**
     * Adds an element to a database with the specified value. If element exists, element value is updated.
     *
     * @param {string} key Key of the element to be set.
     * @param {*} value Value of the element to be set.
     * @returns {string} Operation result.
     * @example
     * DBMS.set({key: "foo", value: "bar"});
     * DBMS.set({key: "hi", value: 3});
     */
    async set({key, value}) {
        if (typeof key !== 'string' || key === '') {
            return 'Invalid key/value for element';
        }

        this.db[key] = value;

        try {
            await this.log('set', key, value);
            return {[key]: this.db[key]};
        } catch (err) {
            console.error(err);
            return 'Error on setting key';
        }
    }

    /**
     * Delete an element from the database based on its key.
     *
     * @param {string} key The key of the element to be deleted.
     * @returns {Boolean} Operation result.
     * @example
     * DBMS.delete({key: "foo"});
     */
    async delete({key}) {
        if (typeof key !== 'string' || key === '') {
            return 'Invalid key of element';
        }

        if (this.db.hasOwnProperty(key)) {
            try {
                delete this.db[key];
                await this.log('delete', key);
                return `Key ${key} successfully deleted`;
            } catch (err) {
                console.error(err);
                return 'Error on deleting key';
            }
        } else {
            return 'Key not found';
        }
    }

    /**
     *
     * Gets the value of an element based on it's key.
     *
     * @param {string} key The key of the element to be fetched.
     * @returns {*} Returns value, if element exists, else returns error message.
     * @example
     * DBMS.get({key: "foo"} // returns "bar";
     */
    async get({key}) {
        if (typeof key !== 'string' || key === '') {
            return 'Invalid key of element';
        }

        if (this.db[key]) return this.db[key]
        else return 'Key not found';
    }

    /**
     *
     * Clear the whole JSON database.
     *
     * @returns {Boolean}
     * @example
     * database.clear();
     *
     */
    async clear() {
        try {
            this.db = {};
            await this.log('clear');
            return 'All keys successfully deleted';
        } catch (err) {
            console.error(err);
            return 'Error on cleaning DB';
        }
    }
}

module.exports = new DBMS();
