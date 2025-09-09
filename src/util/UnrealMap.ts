import { Collection } from "@discordjs/collection";

/**
 * Map used in unreal.js
 * This map uses <object>.equals() for looking up entries
 * If the method doesn't exists, it falls back to: ===
 * This can be useful if the key is not a primitive
 * @extends {Collection}
 */
export class UnrealMap<K, V> extends Collection<K, V> {
    /**
     * Gets an entry
     * @param {any} key Key to lookup
     * @returns {V | undefined} Entry
     */
    get(key: K): V | undefined {
        if ((key as any).equals) {
            return super.find((v, k: any) => k.equals(key))
        } else {
            return super.get(key)
        }
    }

    /**
     * Deletes an entry
     * @param {any} key Key of the entry to delete
     * @returns {boolean} Whether the entry got deleted
     */
    delete(key: K): boolean {
        if ((key as any).equals) {
            const backup = this
            this.clear()
            backup
                .filter((v, k: any) => !k.equals(key))
                .forEach((v, k) => this.set(k, v))
            return this.size !== backup.size
        } else {
            return super.delete(key)
        }
    }

    /**
     * Maps values to a new map
     * @param {Function} fn Function to map values
     * @returns {UnrealMap} New map with mapped values
     */
    mapValues<T>(fn: (value: V, key: K, collection: this) => T): UnrealMap<K, T> {
        const result = new UnrealMap<K, T>();
        for (const [key, value] of this) {
            result.set(key, fn(value, key, this));
        }
        return result;
    }

    /**
     * Sets a key-value pair
     * @param {K} key Key to set
     * @param {V} value Value to set
     * @returns {this} This map for chaining
     */
    set(key: K, value: V): this {
        return super.set(key, value);
    }

    /**
     * Iterator for the map
     * @returns {IterableIterator} Iterator for entries
     */
    [Symbol.iterator](): IterableIterator<[K, V]> {
        return super[Symbol.iterator]();
    }
}
