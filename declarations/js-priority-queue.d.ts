// This file was copied from https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/js-priority-queue/js-priority-queue.d.ts
// with minor changes to make it work without modules

// Type definitions for js-priority-queue
// Project: https://github.com/adamhooper/js-priority-queue
// Definitions by: York Yao <https://github.com/plantain-00/>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/* =================== USAGE ===================
    import * as PriorityQueue from "js-priority-queue";
    var queue = new PriorityQueue<number>({ comparator: (a, b) => b - a });
    queue.queue(5);
 =============================================== */

// declare module "js-priority-queue" {
    declare class AbstractPriorityQueue<T> {
        /**
         * Returns the number of elements in the queue
         */
        public length: number;
        /**
         * Creates a priority queue
         */
        constructor(options?: PriorityQueue.PriorityQueueOptions<T>);
        /**
         * Inserts a new value in the queue
         */
        public queue(value: T): void;
        /**
         * Returns the smallest item in the queue and leaves the queue unchanged
         */
        public peek(): T;
        /**
         * Returns the smallest item in the queue and removes it from the queue
         */
        public dequeue(): T;
        /**
         * Removes all values from the queue
         */
        public clear(): void;
    }
    declare namespace PriorityQueue {
        type PriorityQueueOptions<T> = {
            /**
             * This is the argument we would pass to Array.prototype.sort
             */
            comparator?: (a: T, b: T) => number;
            /**
             * You can also pass initial values, in any order.
             * With lots of values, it's faster to load them all at once than one at a time.
             */
            initialValues?: T[];
            /**
             * According to JsPerf, the fastest strategy for most cases is BinaryHeapStrategy.
             * Only use ArrayStrategy only if you're queuing items in a very particular order.
             * Don't use BHeapStrategy, except as a lesson in how sometimes miracles in one programming language aren't great in other languages.
             */
            strategy?: typeof AbstractPriorityQueue;
        }
        class ArrayStrategy<T> extends AbstractPriorityQueue<T>{ }
        class BinaryHeapStrategy<T> extends AbstractPriorityQueue<T>{ }
        class BHeapStrategy<T> extends AbstractPriorityQueue<T>{ }

    }
    declare class PriorityQueue<T> extends AbstractPriorityQueue<T> { }
//     export = PriorityQueue;
// }