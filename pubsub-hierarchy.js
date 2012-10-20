/**
 * @module pubsub-hierarchy
 *
 * publish / subcribe event model with hierarchial topic categories.
 */

/*global define:false */

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
        returns;

        if (branches) {

            // fire(x => x[1])
            returns = fireBranch(topic, function(x) { return x[1]; }, args);

            returns = returns !== false && publishRoot(branches[0], args);
        } else {
            returns = fire(topic, args);
        }

        return returns;
    },

    // fire(x => x[1])
    fireBranch = function(topic, /* function */ filter, args) {
        var x = getTreeBranches(topic),
        y = x && filter(x),

        r = fire(topic, args);

        if (r !== false && y) {
            r = fireBranch(y, filter, args);
        }
        return r;
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
         * Topics can be hierarchial, specifying categories using a "." (dot) separator. In this case,
         * the topic will be fired for all parent categories specified, then finally firing the topic on its own.
         *
         * Multiple hierarchies are also supported. - TODO Document -
         *
         * @param {String} topic Name of event topic to publish.
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
         * Subcribe to event topics with a listener callback function.
         *
         * Topics can be hierarchial, specifying categories using a "." (dot) separator. See {@link #publish}
         * for details about how hierarchial listeners are published.
         *
         * The "all" topic can also be subscribed to, to listen to every single event published.
         *
         * @example
         * subscribe('singleEvent');
         * subscribe('category.event'); // hierarchial event
         * subscribe('all'); // subscribes to every event fired
         *
         * @param {String} topic Name of event topic to listen to for published events.
         * @param {Function} listener Callback receiver for when the event topic will publish.
         * @param {Object} context Object context used as "this" accessor when listener is fired.
         */
        subscribe: function(/* string */ topic, /* function */ listener, /* object */ context) {

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

            return false;
        },

        subscribeOnce: function(/* string */ topic, /* function */ listener, /* object */ context) {
            throw 'not yet implemented'; // needs unsubscribe first
        },


        unsubscribe: function(/* string */ topic, /* function */ listener) { // TODO: listener or listenerID
            throw 'not yet implemented';
        },


        /**
         * Remove all listeners associated with a topic.
         * @param {String[all]} topic Specific topic to remove listeners. Can be "all" (default).
         */
        removeAll: function(/* string */ topic) {
            if (!topic || topic == 'all') {
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
    }
    else {
        context.EventProvider = EventProvider;
    }


})(this);
