import { writable } from 'svelte/store';

export const fps = writable(0);
export const store = new Map();