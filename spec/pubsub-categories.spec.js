/*global jasmine,describe,expect,beforeEach,it,runs,waitsFor */

var specs = function(PubSub) {

    'use strict';

    var createTestListener = function(topic, testRunner, expectedProperties) {

        if (isNaN(testRunner.totalFireCount)) { testRunner.totalFireCount = 0; }

        var listener = function() {
            testRunner.totalFireCount++;

            listener.fireCount++;
            listener.order = testRunner.totalFireCount;

            listener.args = arguments;
            listener.params = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
            listener.context = this;
            listener.topic = arguments[arguments.length - 1];

            if (expectedProperties) {
                for (var prop in expectedProperties) { // need toEqual / toBe?
                    expect(listener[prop]).toEqual(expectedProperties[prop], 'Unexpected "' + prop + '" for fired listener on topic "' + topic + '"');
                }
            }
        };

        listener.fireCount = 0;

        return listener;
    };


    // published stub listeners - appends to array on each publish
    var publishedListeners = [],

    // new stub listeners
    stubListener = function(topic) {
        var spy = jasmine.createSpy(topic);

        spy.andCallFake(function() {
            publishedListeners.push(spy);
            console.log('stubListener published for topic: ' + topic);
        });

        return spy;
    };


    beforeEach(function() {
        PubSub.unsubscribe('all'); // reset global event provider

        publishedListeners = [];
    });

    describe('global context', function() {

        var publish = PubSub.publish, // easy access aliases for Global context pub/sub
        subscribe = PubSub.subscribe;


        it('can unsubscribe all listeners', function() { // tested first as used for test cleanup

            var listener = stubListener();

            subscribe('testUnsubscribeAll', listener);

            PubSub.unsubscribe('all');

            publish('testUnsubscribeAll');

            expect(listener).not.toHaveBeenCalled();

        });





        describe('publish single events', function() {

            it('can publish an event', function() {

                var eventName = 'testEvent',
                fired = false,
                returned = -1; // set to something unexpected

                subscribe(eventName, function() {
                    fired = true;
                });

                returned = publish(eventName);

                expect(returned).toBe(true, 'unexpected return type');
                expect(fired).toBe(true, 'Event listener never fired');

            });

            it('can publish an event (new thread)', function() {

                var eventName = 'testEvent',
                fired = false,
                returned = -1; // set to something unexpected

                subscribe(eventName, function() {
                    fired = true;
                });

                runs(function() {
                    returned = publish(eventName);
                });

                waitsFor(function() {
                    return fired;
                }, 'Event listener never fired', 1000);

                runs(function() {
                    expect(returned).toBe(true, 'unexpected return type');
                    expect(fired).toBe(true, 'Event listener never fired');
                });
            });


            it('can publish an event with listener object context', function() {

                var eventName = 'testEvent';

                subscribe(eventName, function() {
                    this.eventFired = true;
                }, this);

                runs(function() {
                    this.returns = publish(eventName);
                });

                waitsFor(function() {
                    return this.eventFired;
                }, 'Event listener never fired', 1000);

                runs(function() {
                    expect(this.returns).toBe(true, 'unexpected return type');
                });
            });


            it('can publish with no subscribers', function() {

                var eventName = 'root.testEvent',

                returns = publish(eventName);

                expect(returns).toBe(undefined);

            });

            it('can publish an event with multiple subscribers', function() {
                var topic = 'testEvent',
                value = 1;

                subscribe(topic, function() { value += 2; });
                subscribe(topic, function() { value += 3; });
                subscribe(topic, function() { value = value / 2; });

                publish(topic);

                expect(value).toBe(3);

                publish(topic);

                expect(value).toBe(4);
            });

            it('can publish an event with multiple parameters', function() {
                var topic = 'testMultiParam',
                value = 1,

                param1, param2, param3, paramLength;

                subscribe(topic, function(x, y, z) {
                    param1 = x;
                    param2 = y;
                    param3 = z;
                    paramLength = arguments.length;

                    value += x / y;
                });

                publish(topic, 4, 2);

                expect(param1).toBe(4);
                expect(param2).toBe(2);
                expect(param3).toBe(topic);
                expect(paramLength).toBe(3);
                expect(value).toBe(3);

            });

            it('can stop event propagation', function() {
                var topic = 'testStopPropagation',
                value = 1;

                subscribe(topic, function() { value += 2; return -1; }); // shouldn't stop as not === false
                subscribe(topic, function() { value += 3; return false; }); // expect stop
                subscribe(topic, function() { value /= 2; });

                publish(topic);

                expect(value).toBe(6);

                publish(topic);

                expect(value).toBe(11);
            });



        });

        it('can subscribe to map of listeners', function() {
            var listeners = {
                'listener1': createTestListener('listener1', this),
                'listener2': createTestListener('listener2', this)
            };

            subscribe(listeners);

            publish('listener1');

            expect(listeners.listener1.fireCount).toBe(1);
            expect(listeners.listener2.fireCount).toBe(0);

            publish('listener2');

            expect(listeners.listener1.fireCount).toBe(1);
            expect(listeners.listener2.fireCount).toBe(1);
        });

        describe('unsubscribe', function() {
            it('can unsubscribe from a topic', function() {
                var topic = 'testTopic',

                listener1 = createTestListener(topic, this),
                listener2 = createTestListener(topic, this);

                PubSub.subscribe(topic, listener1);
                PubSub.subscribe(topic, listener2);

                PubSub.publish(topic);

                expect(listener1.fireCount).toBe(1);
                expect(listener2.fireCount).toBe(1);

                expect(this.totalFireCount).toBe(2);

                PubSub.unsubscribe(topic, listener1);

                PubSub.publish(topic);

                expect(listener1.fireCount).toBe(1);
                expect(listener2.fireCount).toBe(2);

                expect(this.totalFireCount).toBe(3);

            });


            it('can subscribe once to an event', function() {
                var topic = 'testTopic',

                listener1 = createTestListener(topic, this),
                listener2 = createTestListener(topic, this);

                PubSub.subscribe(topic, listener1);
                PubSub.subscribeOnce(topic, listener2);

                PubSub.publish(topic);

                expect(listener1.fireCount).toBe(1);
                expect(listener2.fireCount).toBe(1);

                expect(this.totalFireCount).toBe(2);

                PubSub.publish(topic);

                expect(listener1.fireCount).toBe(2);
                expect(listener2.fireCount).toBe(1);

                expect(this.totalFireCount).toBe(3);
            });
        });



        describe('publish hierarchical categories', function() {


            var testOrderedCategories = function(topicToPublish, orderedTopics) {

                var topics = {},

                i, topic;

                for (i = 0; (topic = orderedTopics[i]); i++) {
                    topics[topic] = stubListener(topic);
                }

                subscribe(topics);

                publish(topicToPublish);


                for (i = 0; (topic = orderedTopics[i]); i++) {
                    expect(topics[topic]).toHaveBeenCalledWith(topicToPublish);
                    expect(topics[topic]).toBe(publishedListeners[i], 'incorrect fire order on topic: ' + topic);
                    expect(topics[topic].calls.length).toBe(1, 'incorrect fire count for listener on topic: ' + topic);
                }

                expect(publishedListeners.length).toBe(orderedTopics.length, 'incorrect total fire count');
            };



            it('can publish 1 category levels', function() {

                var orderedTopics = [
                    'root.testEvent',
                    'testEvent',
                    'root',
                    'all'
                ];

                testOrderedCategories('root.testEvent', orderedTopics);

            });

            it('can publish 2 category levels', function() {


                var orderedTopics = [
                    'trunk.branch.leaf',
                    'branch.leaf', /* new */
                    'trunk.leaf',
                    'leaf',

                    'trunk.branch',
                    'branch',
                    'trunk',
                    'all'
                ];

                testOrderedCategories('trunk.branch.leaf', orderedTopics);

            });


            it('can publish 3 category levels', function() {
                // right, left, end
                var orderedTopics = [ // to listen for in expected order
                    'one.two.three.four', // 2, 1, 34
                        'two.three.four', /* new */
                        'one.three.four',
                            'three.four', /* new */


                    'one.two.four', // (124) 2,1,4
                        'two.four', /* new */
                        'one.four',
                            'four',

                    'one.two.three', // (123) 2,1,3
                        'two.three',
                        'one.three',
                            'three',

                        'one.two', // (12) 2, 1, all
                            'two',
                            'one',
                    'all'
                ];

                testOrderedCategories('one.two.three.four', orderedTopics);

            });

            it('can publish 4 category levels', function() {

                var orderedTopics = [

                    'one.two.three.four.five', // 2,1, 345 - 3, 4, 5
                        'two.three.four.five',
                        'one.three.four.five',
                        'three.four.five',

                            'one.two.four.five', // (1245) 2, 1, 45
                                'two.four.five',
                                'one.four.five',
                                'four.five',


                            'one.two.three.five', // (1235) 2, 1, 35
                                'two.three.five', /* new */
                                'one.three.five',
                                'three.five', /* new */


                                'one.two.five', // ((125)) 2,1,5
                                    'two.five', /* new */
                                    'one.five',
                                    'five',



                        'one.two.three.four', // ((1234)) 2, 1, 34
                            'two.three.four', /* new */
                            'one.three.four',
                                'three.four', /* new */


                            'one.two.four', // (124) 2,1,4
                                'two.four', /* new */
                                'one.four',
                                    'four',

                            'one.two.three', // ((123)) 2,1,3
                                'two.three',
                                'one.three',
                                    'three',

                                'one.two', // ((12)) 2, 1, all
                                    'two',
                                    'one',


                        'all'

                ];

                testOrderedCategories('one.two.three.four', orderedTopics);

            });

            it('can stop propagation when in hierarchy', function() {
                var totalFireCount = 0,
                topic = 'one.two.three.four',
                value = 1,

                listeners = { // to listen for in expected order
                    'one.two.three.four': function() { value += 2; },
                    'four': function() { value += 3; },
                    'one.two.three': function() { value += 4; return false; }, // should stop here
                    'one': function() { value += 5; }
                };


                for(var key in listeners) {
                    var listener = listeners[key];
                    subscribe(key, listener);
                }


                runs(function() {
                    publish(topic);
                });

                runs(function() {
                    expect(value).toBe(10);
                });
            });

        });

    });

    describe('category contexts', function() {

        it('can publish a context event', function() {
            var category = 'testCategory',
            context = PubSub.context(category);
            var topic = 'testTopic',
            categoryDotTopic = category + '.' + topic;


            context.subscribe(topic, createTestListener(topic, this, { topic: categoryDotTopic }));
            PubSub.subscribe(topic, createTestListener(topic, this, { topic: categoryDotTopic }));
            PubSub.subscribe(category, createTestListener(topic, this, { topic: categoryDotTopic }));
            PubSub.subscribe('all', createTestListener(topic, this, { topic: categoryDotTopic }));

            context.publish(topic);

            expect(this.totalFireCount).toBe(4);
        });



    });

    describe('object contexts', function() {

        it('can attach pubsub methods to object constructor', function() {
            var category = 'MyObject',
            topic = 'testTopic',
            categoryDotTopic = category + '.' + topic,


            MyObject = function() {}; // constructor
            MyObject.prototype.testFn = function() {};

            var ctx = PubSub.context(category, MyObject);

            expect(typeof(MyObject.publish)).toBe('function');
            expect(typeof(MyObject.subscribe)).toBe('function');

            MyObject.subscribe(topic, createTestListener(topic, this, { topic: categoryDotTopic }));
            PubSub.subscribe(topic, createTestListener(topic, this, { topic: categoryDotTopic }));
            PubSub.subscribe(category, createTestListener(topic, this, { topic: categoryDotTopic }));
            PubSub.subscribe('all', createTestListener(topic, this, { topic: categoryDotTopic }));

            MyObject.publish(topic);


            expect(this.totalFireCount).toBe(4, 'Unexpected fire count');
        });

        it('can attach pubsub methods to object instances with "id"s', function() {
            var category = 'MyInstanceObjectTests',
            topic = 'testTopic',
            categoryDotTopic = category + '.' + topic,

            instanceId = 'testID',
            categoryDotInstanceDotTopic = category + '.' + instanceId + '.' + topic,

            // Class def
            MyObject = function(id) { this.id = id; this.testInst = 'test'; }; // constructor
            MyObject.prototype.testFn = function() {};

            // Create Context
            var ctx = PubSub.context(category, MyObject),

            instance1 = new MyObject(instanceId);

            expect(typeof(instance1.publish)).toBe('function');
            expect(typeof(instance1.subscribe)).toBe('function');

            instance1.subscribe(topic, createTestListener(topic, this, { topic: categoryDotInstanceDotTopic }));
            MyObject.subscribe(topic,  createTestListener(topic, this, { topic: categoryDotInstanceDotTopic }));
            PubSub.subscribe(topic,    createTestListener(topic, this, { topic: categoryDotInstanceDotTopic }));
            PubSub.subscribe(category, createTestListener(topic, this, { topic: categoryDotInstanceDotTopic }));
            PubSub.subscribe(categoryDotTopic, createTestListener(topic, this, { topic: categoryDotInstanceDotTopic }));
            PubSub.subscribe(categoryDotInstanceDotTopic, createTestListener(topic, this, { topic: categoryDotInstanceDotTopic }));
            PubSub.subscribe('all', createTestListener(topic, this, { topic: categoryDotInstanceDotTopic }));

            instance1.publish(topic);

            expect(this.totalFireCount).toBe(7, 'Unexpected fire count');
        });

        it('can attach pubsub methods to object instances without "id"s', function() {
            var category = 'MyInstanceObjectTests',
            topic = 'testTopic',
            categoryDotTopic = category + '.' + topic,

            // Class def
            MyObject = function() { this.testInst = 'test'; }; // constructor
            MyObject.prototype.testFn = function() {};

            // Create Context
            var ctx = PubSub.context(category, MyObject),

            myInstance = new MyObject();

            myInstance.subscribe(topic, function(topicName) {
                // topicInInstanceFired = true;
                expect(topicName).toBe(categoryDotTopic);
            });

            MyObject.subscribe(topic,          createTestListener(topic, this, { order: 1, topic: categoryDotTopic }));
            PubSub.subscribe(topic,            createTestListener(topic, this, { order: 3, topic: categoryDotTopic }));
            PubSub.subscribe(category,         createTestListener(category, this, { order: 4, topic: categoryDotTopic }));
            PubSub.subscribe('all',            createTestListener('all', this, { order: 5, topic: categoryDotTopic }));

            PubSub.subscribe(categoryDotTopic, createTestListener(topic, this, { order: 2, topic: categoryDotTopic }));

            myInstance.publish(topic);

            expect(this.totalFireCount).toBe(5, 'Unexpected fire count');
        });

        it('can use instance as "this" in subscribers', function() {
            // Class def
            var MyObject = function(id) { this.id = id; },

            myInstance = new MyObject('thisInstance'),

            ctx = PubSub.context('testCategory', MyObject),

            topic = 'testTopic',
            topicFired = false;

            myInstance.subscribe(topic, function() {
                expect(this).toBe(myInstance, '"this" was not instance');
                topicFired = true;
            });

            myInstance.publish(topic);

            expect(topicFired).toBe(true, 'topic did not publish');
        });

        it('can attach event namespace to objects', function() {
            var MyObject = function(id) { this.id = id; },

            namespace = 'events',

            ctx = PubSub.context('testCategory', MyObject, namespace),

            myInstance = new MyObject('tester');

            expect(typeof(MyObject[namespace])).toBe('object');
            expect(typeof(myInstance[namespace])).toBe('object');
            expect(typeof(MyObject[namespace].publish)).toBe('function');
            expect(typeof(MyObject[namespace].subscribe)).toBe('function');
            expect(typeof(myInstance[namespace].publish)).toBe('function');
            expect(typeof(myInstance[namespace].subscribe)).toBe('function');

            expect(MyObject.publish).toBe(undefined);
            expect(MyObject.subscribe).toBe(undefined);
            expect(myInstance.publish).toBe(undefined);
            expect(myInstance.subscribe).toBe(undefined);

            // note: "this" in listener will no longer be instance, bug?
        });


        it('can listen to "all" events within a category context', function() {
            var category = 'MyObject',
            topic = 'testTopic',
            categoryDotTopic = category + '.' + topic,

            listener1 = createTestListener(topic, this, { topic: categoryDotTopic }),
            listener2 = createTestListener(topic, this, { topic: categoryDotTopic }),

            ctx = PubSub.context(category);

            ctx.subscribe(topic, listener1);
            ctx.subscribe('all', listener2);

            ctx.publish(topic);

            expect(listener1.fireCount).toBe(1);
            expect(listener2.fireCount).toBe(1);

            expect(this.totalFireCount).toBe(2, 'Unexpected fire count');
        });
    });

    describe('private contexts', function() {
        it('can create a private context', function() {
            expect(typeof(PubSub)).toBe('function');

            var privateContext = new PubSub();

            expect(typeof(privateContext.publish)).toBe('function');
            expect(typeof(privateContext.subscribe)).toBe('function');
        });

        it('can not fire global events', function() {
            var privateContext = new PubSub(),

            topic = 'testPrivateTopic',

            topicFired = false;

            privateContext.subscribe(topic, function() { topicFired = true; });

            PubSub.subscribe(topic, function() { throw 'Global topic fired unexpectedly'; });

            privateContext.publish(topic);

            expect(topicFired).toBe(true, 'topic did not fire in private context');

        });

        it('can not respond to global events', function() {
            var privateContext = new PubSub(),

            topic = 'testGlobalTopic',

            topicFired = false;

            privateContext.subscribe(topic, function() { throw 'Private topic fired unexpectedly'; });

            PubSub.subscribe(topic, function() { topicFired = true; });

            PubSub.publish(topic);

            expect(topicFired).toBe(true, 'topic did not fire in global context');
        });

        it('can change category separator', function() {
            var eventContext = new PubSub('|');

            var topic = 'testTopic',
            category = 'testCategory',

            categoryFired = false;

            eventContext.subscribe(category, function() { categoryFired = true; });

            eventContext.publish(category + '.' + topic);

            expect(categoryFired).toBe(false);

            eventContext.publish(category + '|' + topic);

            expect(categoryFired).toBe(true);
        });
    });

},


runTests = function(PubSub) {
    describe('pubsub-categories', function() {
        specs(PubSub);
    });
},


require, define;


// RequireJS spec wrapper
if (require && define && define.amd) {
    require(['../pubsub-categories'], runTests);

} else if (require) { // node.js
    var PubSub = require('../pubsub-categories');

    runTests(PubSub);

} else if (this && this.PubSub) { // global
    runTests(this.PubSub);

}
