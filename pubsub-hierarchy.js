/**
 * @module pubsub-hierarchy
 *
 * publish / subscribe event model with hierarchical topic categories.
 */

/*global define:false,module:false */

(function(context) {

    'use strict'; // TODO performance check

    var SEPARATOR = '.',


    // TODO: provide Contexts as views into event categories

    _listeners = {},

    _tree = {},


    getTreeBranches = function(topic) { // trunk.branch.leaf
        var branches = _tree[topic];

        if (branches === undefined) { // lazy cache / init

            var lastIdx = topic.lastIndexOf(SEPARATOR);

            if (lastIdx === -1) {
                branches = false; // leaf

            } else {
                var category = topic.substring(0, lastIdx), // trunk.branch
                suffix = topic.substring(lastIdx + 1), // leaf

                // trunk.leaf
                nextIndex = category.lastIndexOf(SEPARATOR),
                nextCategoryForSuffix = (nextIndex === -1) ? suffix : category.substring(0, nextIndex + 1) + suffix;

                branches = [ category, nextCategoryForSuffix ];
            }

            _tree[topic] = branches;
        }

        return branches;
    },

    publishRoot = function(topic, args) {
        var branches = getTreeBranches(topic),

        returns = fire(topic, args);

        if (returns !== false && branches) {

            returns = fireRightBranch(topic, args, branches); // fire all right hand branches

            if (returns !== false) {

                returns = publishRoot(branches[0], args); // fire category
            }
        }

        return returns;
    },

    fireRightBranch = function(topic, args, branches) {
        branches = branches || getTreeBranches(topic);

        var right = branches && branches[1],
        returns;

        if (right) {
            returns = fire(right, args);

            if (returns !== false) {
                returns = fireRightBranch(right, args);
            }
        }
        return returns;
    },


    /**
     * Fire topic
     * @param {String} topic
     * @returns {Boolean} true when a listener fired, false to stop propagation.
     */
    fire = function(topic, args) {
        var returns,
        topicListeners = _listeners[topic];

        if (topicListeners instanceof Array) {

            for (var i = 0, listener; returns !== false && (listener = topicListeners[i]); i++) {

                // TODO: should try / catch around event?
                returns = fireListener(listener, args);
            }

        } else {
            returns = fireListener(topicListeners, args);
        }

        return returns;
    },


    /**
     * Fire listener
     * @param {Function} listener
     * @returns result from listener call - false to stop propagation, true otherwise.
     */
    fireListener = function(listener, args) {
        var context = EventProvider; // or provider context / DOM Event where applicable?

        if (listener) {
            if (typeof(listener) !== 'function' && listener.context) {
                context = listener.context;
                listener = listener.listener;
            }

            return listener.apply(context, args) !== false;
        }
    },



    /**
     * @exports pubsub-hierarchy
     */
    EventProvider = {

        /**
         * Publishes all listeners to an event by using a topic key.
         *
         * Topics can be hierarchical by specifying categories using a "." (dot) separator to
         * the topic name, eg: "category.topic". When published, listeners subscribed to the full topic,
         * the topic on its own and category on its own will be fired.
         *
         * Multiple hierarchies with as many sub-categories as you like are also supported. The more sub-categories,
         * the more specific your event will be - listeners are fired from most specific to least.
         *
         * Finally, an "all" event will trigger when any event is published.
         *
         * For an example, the published topic: "category.subcategory.topic" will fire listeners in this order:
         * 1. category.subcategory.topic
         * 2. category.topic
         * 3. topic
         * 4. category.subcategory
         * 5. subcategory
         * 6. category
         * 7. all
         *
         *
         * @param {String} topic Name of event topic to publish.
         * @param {...} all extra arguments will be passed to any subscribed listeners.
         * @return true if an event listener was fired.
         */
        publish: function(topic) { // args[1..n] become event params

            var returns, args = Array.prototype.slice.call(arguments);

            if (arguments.length > 1) {
                args.push(args.shift());
            }

            // TODO: normalise 'all' so that it's either on its own, or not present

            returns = publishRoot(topic, args);

            return fire('all', args) || returns;
        },




        /**
         * Subscribe to event topics with a listener callback function.
         *
         * Topics can be hierarchical, specifying categories using a "." (dot) separator. See {@link #publish}
         * for details about how hierarchical listeners are published.
         *
         * The "all" topic can also be subscribed to, to listen to every single event published.
         *
         * @example
         * subscribe('singleEvent');
         * subscribe('category.event'); // hierarchical event
         * subscribe('all'); // subscribes to every event fired
         *
         * @param {String} topic Name of event topic to listen to for published events.
         * @param {Function} listener Callback receiver for when the event topic will publish.
         * @param {Object} context Object context used as "this" accessor when listener is fired.
         */
        subscribe: function(/* String */ topic, /* Function */ listener, /* Object */ context) {

            if (typeof(topic) == 'string' && typeof(listener) == 'function') {

                var topicListeners = _listeners[topic];

                if (context !== undefined) {
                    listener = { 'listener': listener, 'context': context };
                }


                if (topicListeners === undefined) {
                    _listeners[topic] = listener;

                } else if (topicListeners instanceof Array) {
                    topicListeners.push(listener);

                } else {
                    _listeners[topic] = [ topicListeners, listener ];
                }

                return true;
            }

        },



        subscribeOnce: function(/* string */ topic, /* function */ listener, /* object */ context) {
            throw 'not yet implemented'; // needs unsubscribe first
        },


        unsubscribe: function(/* string */ topic, /* function|string */ listener) { // TODO: listener or listenerID
            if (topic == 'all') {
                _listeners = {};
                _tree = {};

            } else {
                throw 'not yet implemented';
            }
        },


        bind: function(/* string */ topic, /* Array | DOMElement */ elems) {
            throw 'not yet implemented';
        }

    };


    if(typeof define === 'function' && define.amd) {
        define(function() {
            return EventProvider;
        });
    } else if (typeof module === 'object' && module.exports) {
        module.exports = EventProvider;

    } else {
        context.EventProvider = EventProvider;
    }


})(this);
