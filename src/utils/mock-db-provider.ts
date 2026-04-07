import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

/**
 * Mock Query for chained Mongoose operations
 */
class MockQuery<T> {
    private model: MockModel<T>;
    private query: any;
    private sortOptions: any = null;
    private limitCount: number | null = null;
    private skipCount: number = 0;
    private type: 'find' | 'findOne';

    constructor(model: MockModel<T>, query: any = {}, type: 'find' | 'findOne' = 'find') {
        this.model = model;
        this.query = query;
        this.type = type;
    }

    sort(options: any) {
        this.sortOptions = options;
        return this;
    }

    limit(count: number) {
        this.limitCount = count;
        return this;
    }

    skip(count: number) {
        this.skipCount = count;
        return this;
    }

    select(fields: string) {
        // Select is a no-op in mock mode
        return this;
    }

    populate(path: string, select?: string) {
        // Populate is a no-op in mock mode
        return this;
    }

    lean() {
        // Lean is a no-op in mock mode
        return this;
    }

    async exec(): Promise<any> {
        if (this.type === 'findOne') {
            return this.model._executeFindOne(this.query);
        }
        return this.model._executeFind(this.query, this.sortOptions, this.limitCount, this.skipCount);
    }

    // Allow await query directly
    then(resolve: any, reject?: any) {
        return this.exec().then(resolve, reject);
    }
}

/**
 * Pure JS Mock Mongoose Provider
 */
export class MockModel<T = any> {
    private data: Map<string, T> = new Map();
    private name: string;
    private emitter = new EventEmitter();

    constructor(name: string) {
        this.name = name;
    }

    find(query: any = {}) {
        return new MockQuery<T>(this, query, 'find');
    }

    findOne(query: any) {
        return new MockQuery<T>(this, query, 'findOne');
    }

    async create(doc: any) {
        const id = doc._id || uuidv4();
        const newDoc = {
            ...doc,
            _id: id,
            id: id,
            save: async () => {
                this.data.set(id, newDoc as any);
                this.emitter.emit('change', { operationType: 'insert', fullDocument: newDoc });
                return newDoc;
            },
            toJSON: function () { return this; }
        };
        this.data.set(id, newDoc as any);
        this.emitter.emit('change', { operationType: 'insert', fullDocument: newDoc });
        return newDoc;
    }

    async findByIdAndUpdate(id: string, update: any) {
        const existing = this.data.get(id);
        if (!existing) return null;
        const updated = { ...existing, ...update };
        this.data.set(id, updated);
        this.emitter.emit('change', { operationType: 'update', documentKey: { _id: id }, updateDescription: { updatedFields: update } });
        return updated;
    }

    async countDocuments(query: any = {}) {
        const results = await this.find(query).exec();
        return results.length;
    }

    async distinct(field: string, query: any = {}) {
        const results = await this.find(query).exec();
        const values = new Set(results.map((r: any) => r[field]));
        return Array.from(values);
    }

    aggregate(pipeline: any[]) {
        return {
            exec: async () => []
        };
    }

    watch(pipeline: any[] = [], options: any = {}) {
        return this.emitter;
    }

    // Internal executors
    async _executeFindOne(query: any): Promise<T | null> {
        const results = Array.from(this.data.values());
        return results.find((r: any) => {
            for (let key in query) {
                if (query[key] && typeof query[key] === 'object' && query[key].$in) {
                    if (!query[key].$in.includes(r[key])) return false;
                    continue;
                }
                if (r[key] !== query[key]) return false;
            }
            return true;
        }) || null;
    }

    async _executeFind(query: any, sort: any, limit: number | null, skip: number): Promise<T[]> {
        let results = Array.from(this.data.values());

        if (Object.keys(query).length > 0) {
            results = results.filter((r: any) => {
                for (let key in query) {
                    const val = query[key];
                    if (val && typeof val === 'object') {
                        if (val.$in && !val.$in.includes(r[key])) return false;
                        if (val.$lte && r[key] > val.$lte) return false;
                        if (val.$gte && r[key] < val.$gte) return false;
                        continue;
                    }
                    if (r[key] !== val) return false;
                }
                return true;
            });
        }

        if (sort) {
            const field = Object.keys(sort)[0];
            const dir = sort[field];
            results.sort((a: any, b: any) => {
                if (a[field] < b[field]) return -1 * dir;
                if (a[field] > b[field]) return 1 * dir;
                return 0;
            });
        }

        if (skip) results = results.slice(skip);
        if (limit !== null) results = results.slice(0, limit);

        return results;
    }

    // Compatibility shims
    set(key: string, val: any) { return this; }
    index(obj: any) { return this; }
    select(fields: string) { return this; }
}

export const mockDb = {
    models: new Map<string, MockModel>(),
    getModel<T>(name: string): MockModel<T> {
        if (!this.models.has(name)) {
            this.models.set(name, new MockModel(name));
        }
        return this.models.get(name) as any;
    }
};
