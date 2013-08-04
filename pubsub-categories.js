/*!
 * pubsub-categories
 * https://github.com/jamespamplin/pubsub-categories
 *
 * Copyright (c) 2013 James Pamplin
 * @license MIT
 */

/**
 * @module pubsub-categories
 *
 * publish / subscribe event model with hierarchical topic categories.
 */

/*global define:false,module:false */

(function(global) {

    'use strict';

    var PubSub = function(SEPARATOR) {
        SEPARATOR = SEPARATOR || '.';

        var _listeners = {},


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


        publishParents = function(parents, topic, base, message, fullTopicString, context) {
            fire(topic.concat(base).join(SEPARATOR), message, context);


            if (topic[1]) {
                var first = topic.shift();
                if (parents[0]) {
                    publishParents([], parents.slice(0), topic.concat(base), message, context);
                }
                parents.push(first);

                publishParents(parents, topic, base, message, fullTopicString, context);

            } else if (parents[0]) {
                publishParents([], parents, base, message, fullTopicString, context);
            }

        },


        publishCategories = function(parents, topic, message, fullTopicString, context) {
            fire(topic.join(SEPARATOR), message, context);


            if (topic[1]) { // categories
                var first = topic.shift();


                if (parents[0]) {
                    publishParents([], parents.slice(0), topic, message, fullTopicString, context);
                }

                parents.push(first);

                publishCategories(parents, topic, message, fullTopicString, context);

            } else if (parents[0]) {
                publishCategories([], parents, message, fullTopicString, context);
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

                var args = Array.prototype.slice.call(arguments);

                topic = getFullCategoryTopicName.call(this, topic);

                args.shift();
                args.push(topic);


                publishCategories([], topic.split(SEPARATOR), args, topic, this);

                if (topic != 'all') {
                    fire('all', args, this);
                }
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
             * subscribe('singleEvent', function() {});
             * subscribe('category.event', function() {}); // hierarchical event
             * subscribe('all', function() {}); // subscribes to every event fired
             *
             * subscribe({
             *     'listener1': function() {},
             *     'listener2': function() {}
             * });
             *
             * @param {string|object} topic Name of event topic to listen to for published events.
             * @param {Function} listener Callback receiver for when the event topic will publish.
             * @param {Object} context Object context used as "this" accessor when listener is fired.
             */
            this.subscribe = function(topic, listener, context) {
                var topicType = typeof(topic);

                if (topicType == 'string' && typeof(listener) == 'function') {

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

                } else if (topicType == 'object') {
                    var t, out = true;
                    for (t in topic) {
                        out = out && self.subscribe(t, topic[t]);
                    }

                    return out;
                }

            };



            this.subscribeOnce = function(/* string */ topic, /* function */ listener, /* object */ context) {
                var listenerWrapper = function() {
                    self.unsubscribe(topic, listenerWrapper);
                    listener.apply(this, arguments);
                };
                listenerWrapper._ps_orig = listener;

                return self.subscribe(topic, listenerWrapper, context);
            };


            this.unsubscribe = function(/* string */ topic, /* function */ listener) {
                topic = getFullCategoryTopicName.call(this, topic);

                if (topic == 'all') {
                    _listeners = {};
                    return true;

                } else {
                    var listeners = _listeners[topic], i, n,

                    matchesListener = function(l) {
                        return l === listener || l._ps_orig === listener;
                    };

                    if (listeners) {
                        if (listeners instanceof Array) {
                            n = listeners.length;
                            for (i = 0; i < n; i++) {
                                if (matchesListener(listeners[i])) {
                                    listeners.splice(i, 1);
                                    return true;
                                }
                            }

                        } else if (matchesListener(listeners)) {
                            _listeners[topic] = undefined;
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

                    if (objectContext.prototype) { copyFunctions(ctx, objectContext.prototype); }
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
