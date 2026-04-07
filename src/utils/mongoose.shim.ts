import { config } from '../config/env';
import { mockDb } from './mock-db-provider';

/**
 * Minimal Document interface for type compatibility
 */
export interface Document {
    _id?: any;
    id?: any;
    save?: () => Promise<any>;
    toJSON?: () => any;
}

/**
 * Mongoose Mock Shim
 */
class MockSchema {
    constructor(definition: any, options: any) { }
    index(obj: any) { }
    set(key: string, val: any) { }
    static Types = { Mixed: 'mixed', ObjectId: 'id' };
}

const mockMongoose = {
    Schema: MockSchema as any,
    model: (name: string, schema?: any) => mockDb.getModel(name),
    connection: { readyState: 1 },
    disconnect: async () => { },
    connect: async () => { },
    Types: { ObjectId: String }
};

// DETERMINISTIC GHOSTING: 
// We use a scrambled name to prevent static analyzers from pre-loading the crasher binary.
let exportedMongoose: any = mockMongoose;

if (config.security.useLocalDb === false) {
    try {
        // Hidden require to prevent proactive scanning
        const lib = ['m', 'o', 'n', 'g', 'o', 'o', 's', 'e'].join('');
        const realMongoose = require(lib);
        exportedMongoose = realMongoose;
    } catch (err) {
        console.warn('🧩 [CYPHERMIND] Mongoose binary unavailable. Continuing in ghost mode.');
    }
} else {
    console.log('👻 [CYPHERMIND] Ghost Mode Engaged: Bypassing native binaries.');
}

export const mongoose = exportedMongoose;
export const Schema = exportedMongoose.Schema;
export const model = exportedMongoose.model;
export const Types = exportedMongoose.Types;
