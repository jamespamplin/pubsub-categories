/**
 * @module pubsub-categories
 *
 * publish / subscribe event model with hierarchical topic categories.
 */

/*global define:false,module:false */

(function(global) {

    'use strict'; // TODO performance check

    var PubSub = function(SEPARATOR) {
        SEPARATOR = SEPARATOR || '.';

        var _listeners = {},

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

        publishRoot = function(topic, args, context) {
            var branches = getTreeBranches(topic),

            returns = fire(topic, args, context);

            if (returns !== false && branches) {

                returns = fireRightBranch(topic, args, branches, context); // fire all right hand branches

                if (returns !== false) {

                    returns = publishRoot(branches[0], args, context); // fire category
                }
            }

            return returns;
        },

        fireRightBranch = function(topic, args, branches, context) {
            branches = branches || getTreeBranches(topic);

            var right = branches && branches[1],
            returns;

            if (right) {
                returns = fire(right, args, context);

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
        fire = function(topic, args, context) {
            var returns,
            topicListeners = _listeners[topic];

            if (topicListeners instanceof Array) {

                for (var i = 0, listener; returns !== false && (listener = topicListeners[i]); i++) {

                    // TODO: should try / catch around event?
                    returns = fireListener(listener, args, context);
                }

            } else {
                returns = fireListener(topicListeners, args, context);
            }

            return returns;
        },


        /**
         * Fire listener
         * @param {Function} listener
         * @returns result from listener call - false to stop propagation, true otherwise.
         */
        fireListener = function(listener, args, context) {
            context = context || undefined;

            if (listener) {
                if (typeof(listener) !== 'function' && listener.context) {
                    context = listener.context;
                    listener = listener.listener;
                }

                return listener.apply(context, args) !== false;
            }
        },






        PubSubContext = function(category, objectContext, idKey) {

            var self = this,

            getCategoryPrefix = function() {
                var id = objectContext && this && !this.prototype && this[idKey] || '';
                return category && category + (id && SEPARATOR + id || '') + SEPARATOR || '';
            },

            getFullCategoryTopicName = function(topic) {
                if (category) {
                    var id = objectContext && this && !this.prototype && this[idKey] || '';

                    topic = (topic == 'all') ? '' : topic;

                    return category + (id ? SEPARATOR + id : '') + (topic ? SEPARATOR + topic : '');
                }

                return topic;
            };

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
            this.publish = function(topic) { // args[1..n] become event params

                var returns, args = Array.prototype.slice.call(arguments);

                topic = getFullCategoryTopicName.call(this, topic);

                args.shift();
                args.push(topic);

                returns = publishRoot(topic, args, this);

                return topic != 'all' && fire('all', args, this) || returns;
            };




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
            this.subscribe = function(/* String */ topic, /* Function */ listener, /* Object */ context) {

                if (typeof(topic) == 'string' && typeof(listener) == 'function') {

                    topic = getFullCategoryTopicName.call(this, topic);

                    // context = context || this || objectContext || self;

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

            };



            this.subscribeOnce = function(/* string */ topic, /* function */ listener, /* object */ context) {
                var listenerWrapper = function() {
                    self.unsubscribe(topic, listenerWrapper);
                    listener.apply(this, arguments);
                };

                return self.subscribe(topic, listenerWrapper, context);
            };


            this.unsubscribe = function(/* string */ topic, /* function */ listener) {
                topic = getFullCategoryTopicName.call(this, topic);

                if (topic == 'all') {
                    _listeners = {};
                    _tree = {};
                    return true;

                } else {
                    var listeners = _listeners[topic], i, n;
                    if (listeners) {
                        if (listeners instanceof Array) {
                            n = listeners.length;
                            for (i = 0; i < n; i++) {
                                if (listeners[i] === listener) {
                                    listeners.splice(i, 1);
                                    return true;
                                }
                            }

                        } else if (listeners === listener) {
                            listeners = undefined;
                            return true;
                        }
                    }

                    return false;
                }
            };

        };

        PubSubContext.call(this);


        /**
         * Creates a Category PubSub context.
         *
         * All topics published from a context will be prefixed with the category.
         *
         * Contexts can be attached to objects, allowing publish and subscribe methods to
         * be accessed directly on the object.
         *
         * Object instances via new will also inherit publish and subscribe via its prototype.
         * The "id" property of the instance will be appended to the category name when events
         * are published on the instance.
         *
         * @param  {string} category      The name of the category to prepend to each topic published / subscribed.
         * @param  {function|object} objectContext The object or function contructor to append context.
         * @param  {string|false} namespace Inject context into object under a namespace, instead of directly.
         * @param  {string} idKey         The property key to use for instance id's, defaults to "id".
         * @return {object}               Context created with access to publish / subscribe methods.
         */
        this.context = function(category, objectContext, namespace, idKey) {
            var ctx = new PubSubContext(category, objectContext, idKey || 'id');

            if (objectContext) {
                if (namespace) {
                    objectContext[namespace] = ctx;
                    if (objectContext.prototype) { objectContext.prototype[namespace] = ctx; }

                } else {
                    copyFunctions(ctx, objectContext);

                    objectContext.prototype && copyFunctions(ctx, objectContext.prototype);
                }
            }

            return ctx;
        };

    },

    copyFunctions = function(source, target) {
        for (var method in source) {
            if (typeof(source[method]) == 'function') {
                target[method] = source[method];
            }
        }
    },

    GlobalContext = new PubSub();

    copyFunctions(GlobalContext, PubSub);


    if(typeof define === 'function' && define.amd) {
        define(function() {
            return PubSub;
        });
    } else if (typeof module === 'object' && module.exports) {
        module.exports = PubSub;

    } else {
        global.PubSub = PubSub;
    }


})(this);
