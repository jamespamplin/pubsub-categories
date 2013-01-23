/*global describe */

var global = this;

describe('pubsub-categories tests', function() {

    var PubSub = global && global.PubSub || require('../pubsub-categories'),
    EventProvider = PubSub,


    createTestListener = function(topic, testRunner, expectedProperties) {

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
    },


    TestListener = function(testRunner, order) {
        this.fireCount = 0;
        this.testRunner = testRunner;
        this.expectedOrder = order;
    };

    TestListener.prototype.fire = function(params, eventName) {
        this.fireCount++;
        this.testRunner.totalFireCount++;
        this.order = this.testRunner.totalFireCount;

        this.lastArgs = arguments;
        this.lastEvent = eventName;
        this.lastParams = params;
    };

    beforeEach(function() {
        EventProvider.unsubscribe('all'); // reset global event provider
    });

    describe('global context', function() {

        var publish = EventProvider.publish, // easy access aliases for Global pub/sub
        subscribe = EventProvider.subscribe;


        it('can unsubscribe all listeners', function() { // tested first as used for test cleanup
            var fired = false;

            subscribe('testUnsubscribeAll', function() {
                fired = true;
            });

            EventProvider.unsubscribe('all');

            publish('testUnsubscribeAll');

            expect(fired).toBe(false);
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



        describe('publish hierarchical categories in global context', function() {

            it('can publish events in hierarchy: 1 category level', function() {

                this.totalFireCount = 0;

                listeners = {
                    'root.testEvent':   new TestListener(this, 1),
                    'testEvent':        new TestListener(this, 2),
                    'root':             new TestListener(this, 3),
                    'all':              new TestListener(this, 4)
                };

                for(var key in listeners) {
                    var listener = listeners[key];
                    subscribe(key, listener.fire, listener);
                }

                param = 'testParam1';
                eventName = 'root.testEvent';

                runs(function() {
                    publish(eventName, param);
                });

                runs(function() {
                    for(var key in listeners) {
                        var listener = listeners[key];

                        expect(listener.fireCount).toNotEqual(0, 'fire count error - listener "' + key + '" never fired');
                        expect(listener.fireCount).toEqual(1, 'unexpected fire count for listener "' + key + '"');
                        expect(listener.order).toEqual(listener.expectedOrder, 'incorrect order for listener "' + key + '"');
                        expect(listener.lastEvent).toEqual(eventName, 'incorrect published topic for listener "' + key + '"');
                        expect(listener.lastParams).toEqual(param, 'incorrect event arguments for listener "' + key + '"');
                    }

                    expect(this.totalFireCount).toEqual(4, 'unexpected total fire count');
                });
            });

            it('can publish events in hierarchy: 2 category levels', function() {

                this.totalFireCount = 0;

                listeners = {
                    'trunk.branch.leaf':         new TestListener(this, 1),
                    'trunk.leaf':                new TestListener(this, 2),
                    'leaf':                      new TestListener(this, 3),
                    'trunk.branch':              new TestListener(this, 4),
                    'branch':                    new TestListener(this, 5),
                    'trunk':                     new TestListener(this, 6),
                    'all':                       new TestListener(this, 7)
                };

                for(var key in listeners) {
                    var listener = listeners[key];
                    subscribe(key, listener.fire, listener);
                }

                params = ['testParam1'];
                eventName = 'trunk.branch.leaf';

                runs(function() {
                    publish(eventName, 'testParam1');
                });

                runs(function() {
                    for(var key in listeners) {
                        var listener = listeners[key];

                        expect(listener.fireCount).toNotEqual(0, 'fire count error - listener "' + key + '" never fired');
                        expect(listener.fireCount).toEqual(1, 'unexpected fire count for listener "' + key + '"');
                        expect(listener.order).toEqual(listener.expectedOrder, 'incorrect order for listener "' + key + '"');
                        expect(listener.lastEvent).toEqual(eventName, 'incorrect published topic for listener "' + key + '"');
                        expect(listener.lastParams).toEqual(params[0], 'incorrect event arguments for listener "' + key + '"');
                    }

                    expect(this.totalFireCount).toEqual(7, 'unexpected total fire count');
                });
            });


            it('can publish events in hierarchy: 3 category levels', function() {

                this.totalFireCount = 0;

                var orderedListenerTopics = [ // to listen for in expected order
                    'one.two.three.four',
                    'one.two.four',
                    'one.four',
                    'four',
                    'one.two.three',
                    'one.three',
                    'three',
                    'one.two',
                    'two',
                    'one',
                    'all'
                ],

                listeners = {};

                for (var i = 0, listener, topic; (topic = orderedListenerTopics[i]); i++) {
                    listener = new TestListener(this, i + 1);
                    subscribe(topic, listener.fire, listener);
                    listeners[topic] = listener;
                }


                param = 'testParam1';
                eventName = 'one.two.three.four';

                runs(function() {
                    publish(eventName, param);
                });

                runs(function() {
                    for(var key in listeners) {
                        var listener = listeners[key];

                        expect(listener.fireCount).toNotEqual(0, 'fire count error - listener "' + key + '" never fired');
                        expect(listener.fireCount).toEqual(1, 'unexpected fire count for listener "' + key + '"');
                        expect(listener.order).toEqual(listener.expectedOrder, 'incorrect order for listener "' + key + '"');
                        expect(listener.lastEvent).toEqual(eventName, 'incorrect published topic for listener "' + key + '"');
                        expect(listener.lastParams).toEqual(param, 'incorrect event arguments for listener "' + key + '"');
                    }

                    expect(this.totalFireCount).toEqual(orderedListenerTopics.length, 'unexpected total fire count');

                });
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
            topic = 'testTopic',
            categoryDotTopic = category + '.' + topic;


            context.subscribe(topic, createTestListener(topic, this, { topic: categoryDotTopic }));
            PubSub.subscribe(topic, createTestListener(topic, this, { topic: categoryDotTopic }));
            PubSub.subscribe(category, createTestListener(topic, this, { topic: categoryDotTopic }));
            PubSub.subscribe('all', createTestListener(topic, this, { topic: categoryDotTopic }));

            context.publish(topic);

            expect(this.totalFireCount).toBe(4);
        });

        xit('can subscribe to all event in context');

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
                topicInInstanceFired = true;
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

            topic = 'testTopic',
            category = 'testCategory',

            categoryFired = false;

            eventContext.subscribe(category, function() { categoryFired = true; });

            eventContext.publish(category + '.' + topic);

            expect(categoryFired).toBe(false);

            eventContext.publish(category + '|' + topic);

            expect(categoryFired).toBe(true);
        });
    });

});
