/*!
 * pubsub-categories
 * https://github.com/jamespamplin/pubsub-categories
 *
 * Copyright (c) 2013 James Pamplin
 * @license MIT
 */

/**
 * publish / subscribe event model with hierarchical topic categories.
 * @module pubsub-categories
 */

/*global define:false,module:false */

(function(global) {

    'use strict';

    /**
     * Create a new Private context for PubSub events.
     * @constructor
     * @exports pubsub-categories
     */
    var PubSub = function(SEPARATOR) {
        SEPARATOR = SEPARATOR || '.';

        var _listeners = {},


        /**
         * Fire topic
         * @param {String} topic
         * @returns {Boolean} true when a listener fired, false to stop propagation.
         */
        fire = function(topic, message, originalTopic, context) {
            var topicListeners = _listeners[topic], i, listener;

            if (topicListeners && topicListeners[0]) {

                for (i = 0; (listener = topicListeners[i]); i++) {
                    fireListener(listener, message, originalTopic, context);
                }

            } else if (topicListeners) {
                fireListener(topicListeners, message, originalTopic, context);
            }
        },


        /**
         * Fire listener
         * @param {Function} listener
         */
        fireListener = function(listener, message, topic, context) {
            context = context || undefined;

            if (typeof(listener) !== 'function' && listener.context) {
                context = listener.context;
                listener = listener.listener;
            }

            listener.call(context, message, topic);
        },



        /**
         * Internal - publishes categories associated to a topic.
         * Recursively reduces categories on a topic and fires in order.
         *
         * @param  {Array} parents          Reduced parent categories for a topic.
         * @param  {Array} topic            Core topic to publish.
         * @param  {Array} base             Base topic and categories appended to each publish.
         * @param  {Object} message         Object message to send to listening receiver callbacks.
         * @param  {String} originalTopic   The original topic string published.
         * @param  {Object} context         this context for callback receivers.
         */
        publishCategories = function(parents, topic, base, message, originalTopic, context) {
            fire(topic.concat(base).join(SEPARATOR), message, originalTopic, context);


            if (topic[1]) { // categories
                var first = topic.shift();

                if (parents && parents[0]) {
                    publishCategories(undefined, parents.slice(0), topic.concat(base), message, originalTopic, context);
                } else {
                    parents = [];
                }

                parents.push(first);

                publishCategories(parents, topic, base, message, originalTopic, context);

            } else if (parents && parents[0]) {
                publishCategories(undefined, parents, base, message, originalTopic, context);
            }

        },



        /**
         * Creates a new PubSub context bound to a category and optionally an object.
         */
        PubSubContext = function(category, objectContext, idKey) {

            var self = this,

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
             * Multiple hierarchies with as many sub-categories as you like are also supported. More specific categories
             * are fired before least specific.
             *
             * Categories are also published with the same message as the original published topic, allowing
             * listener callbacks on a category which publish when any topic is published with that category.
             *
             * Finally, an "all" event will trigger when any event is published.
             *
             * For an example, the published topic: "category.subcategory.topic" will fire listeners in this order:
             *
             * 1. category.subcategory.topic
             * 2. subcategory.topic
             * 3. category.topic
             * 4. topic
             * 5. category.subcategory
             * 6. subcategory
             * 7. category
             * 8. all
             *
             *
             * @param {String} topic     Name of event topic to publish.
             * @param {Object} message   Object to be sent to any subscribed listeners callbacks.
             */
            this.publish = function(topic, message) {

                topic = getFullCategoryTopicName.call(this, topic);

                publishCategories(undefined, topic.split(SEPARATOR), [], message, topic, this);

                if (topic != 'all') {
                    fire('all', message, topic, this);
                }
            };




            /**
             * Subscribe to event topics with a listener callback function.
             *
             * Topics can be hierarchical, specifying categories using a "." (dot) separator. See {@link module:pubsub-categories#publish}
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

                } else {
                    throw new SyntaxError('Incorrect syntax for subscribe()');
                }

            };



            /**
             * Subscribes a listener to a topic just once. When the topic is fired,
             * the listener is removed so that it will no longer receive published messages
             * for that topic.
             *
             * @param  {String}   topic     Name of topic to listen to.
             * @param  {Function} listener  Callback which will receive a published message on topic.
             * @param  {Object=}  context   Object context used as "this" when listener is fired.
             */
            this.subscribeOnce = function(topic, listener, context) {
                var listenerWrapper = function() {
                    self.unsubscribe(topic, listenerWrapper);
                    listener.apply(this, arguments);
                };
                listenerWrapper._ps_orig = listener;

                self.subscribe(topic, listenerWrapper, context);
            };


            /**
             * Stops a listener from receiving published messages on a topic.
             *
             * @param  {String}   topic     Name of topic to unsubscribe from. Can be "all"
             *                              to remove all subscribers from all topics.
             * @param  {Function} listener  The callback listener to unsubscribe.
             * @return {boolean}            true when one or many subscribers were removed.
             *                              false if none were found.
             */
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
