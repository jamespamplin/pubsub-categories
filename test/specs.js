/*global describe */

describe('pubsub-hierarchy tests', function() {

    var PubSub = window.PubSub, // Local closure capture, incase of name change
    EventProvider = PubSub,

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

            it('can subscribe once to an event', function() {
                // TODO 'not yet implemented';
            });

        });

        describe('unsubscribe', function() {
            // TODO 'not yet implemented'
        });



        describe('publish hierarchical events in global context', function() {

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

            topicInCategoryFired = false,
            categoryFired = false,
            topicFired = false,
            allFired = false;

            context.subscribe(topic, function() { topicInCategoryFired = true; });
            PubSub.subscribe(topic, function() { topicFired = true; });
            PubSub.subscribe(category, function() { categoryFired = true; });
            PubSub.subscribe('all', function() { allFired = true; });

            context.publish(topic);

            expect(topicInCategoryFired).toBe(true, 'topicInCategoryFired incorrect');
            expect(topicFired).toBe(true, 'topicFired incorrect');
            expect(categoryFired).toBe(true, 'categoryFired incorrect');
            expect(allFired).toBe(true, 'allFired incorrect');
        });

        xit('can subscribe to all event in context');

    });

    describe('object contexts', function() {

        it('can attach pubsub methods to object constructor', function() {
            var category = 'MyObject',
            topic = 'testTopic',

            topicInContextFired = false,
            categoryFired = false,
            topicFired = false,
            allFired = false;

            MyObject = function() {}; // constructor
            MyObject.prototype.testFn = function() {};

            var ctx = PubSub.context(category, MyObject);

            expect(typeof(MyObject.publish)).toBe('function');
            expect(typeof(MyObject.subscribe)).toBe('function');

            MyObject.subscribe(topic, function() { topicInContextFired = true; });
            PubSub.subscribe(topic, function() { topicFired = true; });
            PubSub.subscribe(category, function() { categoryFired = true; });
            PubSub.subscribe('all', function() { allFired = true; });

            MyObject.publish(topic);

            expect(topicInContextFired).toBe(true, 'topicInContextFired incorrect');
            expect(topicFired).toBe(true, 'topicFired incorrect');
            expect(categoryFired).toBe(true, 'categoryFired incorrect');
            expect(allFired).toBe(true, 'allFired incorrect');
        });

        it('can attach pubsub methods to object instances with "id"s', function() {
            var category = 'MyInstanceObjectTests',
            topic = 'testTopic',
            categoryDotTopic = category + '.' + topic,

            instanceId = 'testID',
            categoryDotInstanceDotTopic = category + '.' + instanceId + '.' + topic,

            topicInInstanceFired = false,
            topicInContextFired = false,
            categoryFired = false,
            topicFired = false,
            categoryDotTopicFired = false,
            categoryDotInstanceDotTopicFired = false,
            allFired = false,

            // Class def
            MyObject = function(id) { this.id = id; this.testInst = 'test'; }; // constructor
            MyObject.prototype.testFn = function() {};

            // Create Context
            var ctx = PubSub.context(category, MyObject);

            var instance1 = new MyObject(instanceId);

            expect(typeof(instance1.publish)).toBe('function');
            expect(typeof(instance1.subscribe)).toBe('function');

            instance1.subscribe(topic, function() { topicInInstanceFired = true; });
            MyObject.subscribe(topic, function() { topicInContextFired = true; });
            PubSub.subscribe(topic, function() { topicFired = true; });
            PubSub.subscribe(category, function() { categoryFired = true; });
            PubSub.subscribe(categoryDotTopic, function() { categoryDotTopicFired = true; });
            PubSub.subscribe(categoryDotInstanceDotTopic, function() { categoryDotInstanceDotTopicFired = true; });
            PubSub.subscribe('all', function() { allFired = true; });

            instance1.publish(topic);

            expect(topicInInstanceFired).toBe(true, 'topicInInstanceFired incorrect');
            expect(topicInContextFired).toBe(true, 'topicInContextFired incorrect');
            expect(topicFired).toBe(true, 'topicFired incorrect');
            expect(categoryFired).toBe(true, 'categoryFired incorrect');
            expect(categoryDotTopicFired).toBe(true, 'categoryDotTopicFired incorrect');
            expect(categoryDotInstanceDotTopicFired).toBe(true, 'categoryDotInstanceDotTopicFired incorrect');
            expect(allFired).toBe(true, 'allFired incorrect');
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

        xit('can attach event namespace to objects');
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
