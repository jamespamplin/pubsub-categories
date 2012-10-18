/**
 * @module pubsub-hierarchy
 *
 * publish / subcribe event model with hierarchy
 */

/*global define:false */

(function(context) {

    'use strict'; // TODO performance check

    var SEPARATOR = '.';



    // TODO: provide Contexts as views into event categories

    var _listeners = {};

    var Provider = function(category, parent) {
        _listeners = {}; // todo remove
    };





    // one.two.three.four
    // one.two.four
    // one.four
    // four
    // one.two.three
    // one.three
    // three
    // one.two
    // two
    // one
    // all





    var tree = {},


    getTreeBranches = function(topic) { // trunk.branch.leaf
        var branches = tree[topic];

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

            tree[topic] = branches;
        }

        return branches;
    },

    publishRoot = function(topic, args) {
        var branches = getTreeBranches(topic);

        // fire(topic, args);
        if (branches) {

            // fire(x => x[1])
            fireBranch(topic, function(x) { return x[1]; }, args);


            // (function(rightBranch) {
            //     fire(branches[1], args);

            //     getTreeBranches(rightBranch)[1];
            // })(branches[1]);
            // publishRoot(branches[0], args);
            publishRoot(branches[0], args);
            // fire(branches[1], args);
        } else {
            fire(topic, args);
        }
    },

    // fire(x => x[1])
    // fireBranches(x => x[0])
    fireBranch = function(topic, filter, args) {
        var x = getTreeBranches(topic),
        y = x && filter(x),

        r = fire(topic, args);

        if (y) {
            fireBranch(y, filter, args);
        }
        return r;
    },

    fire = function(topic, args) {
        // var returns = false;
console.log('firing topic: ', topic);
        var topicListeners = _listeners[topic];

        if (topicListeners instanceof Array) {
            var listeners = _listeners[topic], i, listener;

            for (i = 0; (listener = listeners[i]); i++) {
                // context = listener.context || this;
                // listener = listener.callback || listener;

                // TODO: try / catch around event?
                fireListener(listener, args);
                // if (listener.apply(context, args) === false) { // Stops event propagation
                    // return true;
                // }
                // returns = true;
            }

        } else {
            fireListener(topicListeners, args);
        }
        // return returns;
    },

    fireListener = function(listener, args) {
        var context = Provider; // or provider context

        if (listener) {
            if (typeof(listener) !== 'function' && listener.context) {
                context = listener.context;
                listener = listener.listener;
            }

            return listener.apply(context, args);
        }
    };

    Provider.prototype = {

        _tree: tree,
        _listeners: _listeners,

        /**
         * Publishes an event by key, or composite events in an array with given parameters
         *
         * @return true if an event listener was fired.
         */
        publish: function(topic) { // args[1..n] become event params

            var args = Array.prototype.slice.call(arguments);
            args.shift();
            args.push(topic);


            // TODO: normalise 'all' so that it's either on its own, or not present
            // TODO: push topic to end of arguments

            publishRoot(topic, args);

            fire('all', args);
console.log(tree);
        },





/*publishHierarchy = function(suffix, category, args, topic) {
                // suffix = topic.substring(lastIdx + 1);

                // topic = topic || category + SEPARATOR + suffix;
                fire(category + SEPARATOR + suffix);

                var nextIndex = category.lastIndexOf(SEPARATOR);

                if (nextIndex === -1) {
                    fire(suffix, args);
                } else {
                    publishHierarchy(suffix, category.substring(0, nextIndex));
                }
                publishWithArgs(category);

            },

            publishTopic = function(topic) {
                lastIdx = topic.lastIndexOf(SEPARATOR);

                if (lastIdx !== -1) {

                    var category = topic.substring(0, lastIdx),
                    // subCategory =
                    suffix = topic.substring(lastIdx + 1);


                    publishHierarchy(suffix, category, args, topic);

                } else {
                    fire(topic);
                }
            }*/




        subscribe: function(/* string */ topic, /* function */ listener, /* object */ context) {

            if (typeof(topic) == 'string' && typeof(listener) == 'function') {

                if (context !== undefined) {
                    listener = { 'listener': listener, 'context': context };
                }

                var topicListeners = _listeners[topic];

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

        subscribeOnce: function() {
            throw 'not yet implemented'; // needs unsubscribe first
        },


        unsubscribe: function() {
            throw 'not yet implemented';
        },



        bind: function(/* Array | DOMElement */ elems, /*string */ topic) {

        }



    };


    if(typeof define === 'function' && define.amd) {
        define(function() {
            return Provider;
        });
    }
    else {
        context.Provider = Provider;
    }


})(this);
