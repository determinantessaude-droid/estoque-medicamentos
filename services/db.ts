import { Medication } from '../types';

const DB_NAME = 'MedicationDB';
const DB_VERSION = 1;
const STORE_NAME = 'medications';
const KEY = 'inventory';

let dbPromise: Promise<IDBDatabase> | null = null;

const getDb = (): Promise<IDBDatabase> => {
    if (dbPromise) {
        return dbPromise;
    }
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('IndexedDB error:', request.error);
            reject('Error opening IndexedDB.');
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
    return dbPromise;
};

export const saveMedicationsToDB = async (medications: Medication[]): Promise<void> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(medications, KEY);

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = () => {
            console.error('Error saving medications to DB:', request.error);
            reject('Failed to save medications.');
        };
    });
};

export const getMedicationsFromDB = async (): Promise<Medication[]> => {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(KEY);

        request.onsuccess = () => {
            // If request.result is undefined (no data), return an empty array.
            resolve(request.result || []);
        };

        request.onerror = () => {
            console.error('Error getting medications from DB:', request.error);
            reject('Failed to retrieve medications.');
        };
    });
};
